// CRCC backend (Firebase Cloud Functions, Node 20).
//
// Payments
//   verifyPayment    POST {reference} from the app after Paystack checkout. Confirms with Paystack,
//                    then records the gift / pledge payment / bookshop order exactly once.
//   paystackWebhook  Paystack calls this for every successful charge (backup if the app was closed).
//   monthlyGiving    Daily: charges members who chose "give every month".
// Notifications
//   sendPush         Whenever a notification document is created, sends it to phones (FCM).
//   onNewSermon      New sermon → notification to everyone.
//   onLive           Livestream switched on → notification to everyone.
//   dailyDevotional  06:00 → today's devotional.
//   eventReminders   08:00 → events happening tomorrow.
//   birthdayWishes   07:00 → personal birthday / anniversary greeting.
//   pledgeReminders  Mondays 09:00 → pledges due within 14 days or overdue.
//
// Secret: firebase functions:secrets:set PAYSTACK_SECRET_KEY

const crypto = require('node:crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const PAYSTACK_SECRET = defineSecret('PAYSTACK_SECRET_KEY');
const TZ = 'Africa/Lagos';
const API = 'https://api.paystack.co';
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

// ── Helpers ─────────────────────────────────────────────────
const lagosDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); // YYYY-MM-DD
};
const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG');

async function paystack(path, secret, body) {
  const res = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) throw new Error(json.message || `Paystack error ${res.status}`);
  return json.data;
}

const meta = (tx) => {
  let m = tx.metadata || {};
  if (typeof m === 'string') {
    try {
      m = JSON.parse(m);
    } catch {
      m = {};
    }
  }
  return m;
};

/** Create a notification document (sendPush then delivers it). A fixed id prevents duplicates. */
async function notify(n, id) {
  const doc = { createdAt: new Date().toISOString(), auto: true, ...n };
  if (id) await db.collection('notifications').doc(id).set(doc, { merge: true });
  else await db.collection('notifications').add(doc);
}

// ── Payments ────────────────────────────────────────────────
const TYPES = ['Tithe', 'Offering', 'Thanksgiving', 'Seed', 'Project', 'Pledge'];

/** Records a successful Paystack transaction exactly once. */
async function recordTransaction(tx) {
  if (!tx || tx.status !== 'success') throw new Error('Payment was not successful.');
  if (tx.currency && tx.currency !== 'NGN') throw new Error('Unexpected currency.');
  const m = meta(tx);
  const amount = Math.round(tx.amount) / 100;
  const paidAt = new Date(tx.paid_at || tx.paidAt || Date.now()).toISOString();

  // Bookshop order
  if (m.kind === 'order' && m.order_id) {
    const ref = db.collection('orders').doc(String(m.order_id));
    const order = await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error('Order not found.');
      const o = snap.data();
      if (o.status !== 'pending') return { ...o, id: snap.id };
      if (amount + 0.01 < o.total) throw new Error('Amount paid is less than the order total.');
      const products = await Promise.all(o.items.map((i) => t.get(db.collection('products').doc(i.productId))));
      t.update(ref, { status: 'paid', reference: tx.reference, paidAt });
      products.forEach((p, i) => p.exists && t.update(p.ref, { stock: admin.firestore.FieldValue.increment(-o.items[i].qty) }));
      return { ...o, id: snap.id, status: 'paid' };
    });
    return { order };
  }

  // Gift (tithe, offering, project, pledge payment…)
  const ref = db.collection('gifts').doc(tx.reference);
  const type = TYPES.includes(m.gift_type) ? m.gift_type : 'Offering';
  const anonymous = m.anonymous === true || m.anonymous === 'true';
  const recurring = m.recurring === true || m.recurring === 'true';
  const gift = await db.runTransaction(async (t) => {
    const existing = await t.get(ref);
    if (existing.exists) return existing.data();
    const g = {
      id: tx.reference,
      uid: m.uid || null,
      reference: tx.reference,
      type,
      projectId: m.project_id || null,
      projectTitle: m.project_title || null,
      pledgeId: m.pledge_id || null,
      amount,
      name: anonymous ? '' : m.giver_name || [tx.customer?.first_name, tx.customer?.last_name].filter(Boolean).join(' '),
      email: tx.customer?.email || '',
      phone: m.phone || '',
      anonymous,
      recurring,
      status: 'success',
      channel: tx.channel || '',
      createdAt: paidAt,
      subscription: Boolean(m.subscription),
    };
    t.set(ref, g);
    if (g.projectId) t.set(db.collection('projects').doc(g.projectId), { raised: admin.firestore.FieldValue.increment(amount) }, { merge: true });
    if (g.pledgeId) t.set(db.collection('pledges').doc(g.pledgeId), { paid: admin.firestore.FieldValue.increment(amount) }, { merge: true });
    return g;
  });

  // First monthly gift by card: keep the reusable authorization to charge again next month.
  if (recurring && !m.subscription && tx.authorization?.reusable && tx.channel === 'card') {
    const id = crypto.createHash('sha1').update(`${gift.email}|${type}`).digest('hex');
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    await db.collection('subscriptions').doc(id).set(
      {
        uid: gift.uid,
        email: gift.email,
        name: gift.name,
        type,
        amount,
        authorizationCode: tx.authorization.authorization_code,
        cardLast4: tx.authorization.last4 || '',
        active: true,
        failures: 0,
        nextChargeAt: admin.firestore.Timestamp.fromDate(next),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  return { gift };
}

exports.verifyPayment = onRequest({ cors: true, secrets: [PAYSTACK_SECRET] }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const reference = String(req.body?.reference || '').trim();
  if (!/^[\w-]{6,100}$/.test(reference)) return res.status(400).json({ error: 'Invalid reference.' });
  try {
    const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`, PAYSTACK_SECRET.value());
    res.json(await recordTransaction(tx));
  } catch (e) {
    logger.warn('verifyPayment failed', reference, e.message);
    res.status(402).json({ error: e.message });
  }
});

exports.paystackWebhook = onRequest({ secrets: [PAYSTACK_SECRET] }, async (req, res) => {
  const signature = req.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET.value()).update(req.rawBody).digest('hex');
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('bad signature');
  }
  try {
    if (req.body?.event === 'charge.success') await recordTransaction(req.body.data);
  } catch (e) {
    logger.error('webhook record failed', e.message);
  }
  res.sendStatus(200);
});

exports.monthlyGiving = onSchedule({ schedule: 'every day 07:00', timeZone: TZ, secrets: [PAYSTACK_SECRET] }, async () => {
  const due = await db.collection('subscriptions').where('active', '==', true).where('nextChargeAt', '<=', admin.firestore.Timestamp.now()).limit(200).get();
  for (const doc of due.docs) {
    const s = doc.data();
    const reference = `CRCC-M-${doc.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase();
    try {
      const tx = await paystack('/transaction/charge_authorization', PAYSTACK_SECRET.value(), {
        authorization_code: s.authorizationCode,
        email: s.email,
        amount: Math.round(s.amount * 100),
        reference,
        metadata: { kind: 'gift', uid: s.uid || '', gift_type: s.type, recurring: true, subscription: true, giver_name: s.name || '' },
      });
      if (tx.status === 'success') await recordTransaction(tx);
      const next = s.nextChargeAt.toDate();
      next.setMonth(next.getMonth() + 1);
      await doc.ref.update({ nextChargeAt: admin.firestore.Timestamp.fromDate(next), failures: 0, lastChargedAt: admin.firestore.FieldValue.serverTimestamp() });
      if (s.uid) await notify({ title: 'Thank you for your monthly gift', body: `${naira(s.amount)} ${s.type.toLowerCase()} received. God bless you.`, link: '/profile', audience: `user:${s.uid}` });
    } catch (e) {
      const failures = (s.failures || 0) + 1;
      await doc.ref.update({ failures, lastError: e.message, active: failures < 3, nextChargeAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 864e5)) });
      logger.warn('monthly charge failed', doc.id, e.message);
    }
  }
});

// ── Push delivery ───────────────────────────────────────────
async function tokensFor(audience) {
  const col = db.collection('pushTokens');
  if (audience === 'all') return (await col.get()).docs.map((d) => d.id);
  if (audience.startsWith('user:')) return (await col.where('uid', '==', audience.slice(5)).get()).docs.map((d) => d.id);
  if (audience.startsWith('dept:')) {
    const members = await db.collection('members').where('departments', 'array-contains', audience.slice(5)).get();
    const uids = members.docs.map((d) => d.id);
    const out = [];
    for (let i = 0; i < uids.length; i += 30) {
      const snap = await col.where('uid', 'in', uids.slice(i, i + 30)).get();
      out.push(...snap.docs.map((d) => d.id));
    }
    return out;
  }
  return [];
}

exports.sendPush = onDocumentCreated('notifications/{id}', async (event) => {
  const n = event.data?.data();
  if (!n?.title) return;
  const tokens = await tokensFor(n.audience || 'all');
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title: n.title, body: n.body || '' },
      data: { id: event.params.id, link: n.link || '/' },
      webpush: { fcmOptions: { link: n.link || '/' } },
    });
    // Remove tokens for phones that uninstalled or turned notifications off.
    const dead = res.responses
      .map((r, j) => (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code || '') ? batch[j] : null))
      .filter(Boolean);
    await Promise.all(dead.map((t) => db.collection('pushTokens').doc(t).delete()));
  }
});

// ── Automatic notifications ─────────────────────────────────
exports.onNewSermon = onDocumentCreated('sermons/{id}', async (event) => {
  const s = event.data?.data();
  if (!s) return;
  await notify({ title: 'New sermon', body: `${s.title} · ${s.preacher}`, link: `/sermons/${event.params.id}`, audience: 'all' }, `sermon-${event.params.id}`);
});

exports.onLive = onDocumentUpdated('settings/main', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before?.isLive && after?.isLive) {
    await notify({ title: 'We’re live!', body: `${after.liveTitle || 'Service'} is streaming now. Tap to watch.`, link: '/live', audience: 'all' }, `live-${Date.now()}`);
  }
});

exports.dailyDevotional = onSchedule({ schedule: 'every day 06:00', timeZone: TZ }, async () => {
  const today = lagosDate();
  const snap = await db.collection('devotionals').where('date', '==', today).limit(1).get();
  if (snap.empty) return;
  const d = snap.docs[0].data();
  await notify({ title: `Today: ${d.title}`, body: `${d.scripture}. Start your day with God’s Word.`, link: '/devotional', audience: 'all' }, `devotional-${today}`);
});

exports.eventReminders = onSchedule({ schedule: 'every day 08:00', timeZone: TZ }, async () => {
  const tomorrow = lagosDate(1);
  const snap = await db.collection('events').where('date', '==', tomorrow).get();
  for (const doc of snap.docs) {
    const e = doc.data();
    await notify({ title: `Tomorrow: ${e.title}`, body: [e.time, e.venue].filter(Boolean).join(' · ') || 'See you there!', link: `/events/${doc.id}`, audience: 'all' }, `event-${doc.id}-${tomorrow}`);
  }
});

exports.birthdayWishes = onSchedule({ schedule: 'every day 07:00', timeZone: TZ }, async () => {
  const today = lagosDate();
  const mmdd = today.slice(5);
  const [bdays, annivs] = await Promise.all([
    db.collection('members').where('birthday', '==', mmdd).get(),
    db.collection('members').where('anniversary', '==', mmdd).get(),
  ]);
  for (const doc of bdays.docs)
    await notify({ title: `Happy birthday, ${doc.data().name.split(' ')[0]}!`, body: 'The CRCC family celebrates you today. God bless your new year.', audience: `user:${doc.id}` }, `bday-${doc.id}-${today}`);
  for (const doc of annivs.docs)
    await notify({ title: 'Happy wedding anniversary!', body: 'The CRCC family celebrates your marriage today. God bless your home.', audience: `user:${doc.id}` }, `anniv-${doc.id}-${today}`);
});

exports.pledgeReminders = onSchedule({ schedule: 'every monday 09:00', timeZone: TZ }, async () => {
  const soon = lagosDate(14);
  const snap = await db.collection('pledges').where('dueDate', '<=', soon).get();
  const today = lagosDate();
  for (const doc of snap.docs) {
    const p = doc.data();
    const left = p.amount - (p.paid || 0);
    if (left <= 0) continue;
    const overdue = p.dueDate < today;
    await notify(
      {
        title: overdue ? 'Pledge reminder' : 'Your pledge is due soon',
        body: `${naira(left)} left on “${p.title}”${overdue ? '' : `, due ${p.dueDate}`}. Tap to pay towards it.`,
        link: `/give?pledge=${doc.id}`,
        audience: `user:${p.uid}`,
      },
      `pledge-${doc.id}-${today}`,
    );
  }
});
