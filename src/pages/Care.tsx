import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal, PageHead, Progress, useDocumentTitle, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { store, useCollection, useDoc } from '../lib/store';
import { fmtDate, fmtLong, naira, todayISO } from '../lib/format';
import type { Appointment } from '../types';

// ── Pledges ─────────────────────────────────────────────────
export function Pledges() {
  useDocumentTitle('My pledges');
  const { member } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { items } = useCollection('pledges', member ? { field: 'uid', op: '==', value: member.id } : null);
  const { items: projects } = useCollection('projects');
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState(`${new Date().getFullYear()}-12-31`);
  const list = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const active = projects.filter((p) => p.active);

  return (
    <div className="container page">
      <div className="row gap-12 wrap" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">My pledges</h1>
          <p className="page-sub">Promise a gift, pay at your own pace, and get gentle reminders.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> Make a pledge</button>
      </div>
      {list.length ? (
        <div className="card-grid">
          {list.map((p) => {
            const left = Math.max(0, p.amount - p.paid);
            const done = left === 0;
            const overdue = !done && p.dueDate < todayISO();
            return (
              <article key={p.id} className="card card-pad stack gap-12">
                <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 18 }}>{p.title}</h2>
                  {done ? <span className="pill on">Fulfilled</span> : overdue ? <span className="pill warn">Past due</span> : <span className="pill">Due {fmtDate(p.dueDate)}</span>}
                </div>
                <Progress value={(p.paid / p.amount) * 100} label={`${p.title} pledge progress`} />
                <div className="row gap-8 small" style={{ justifyContent: 'space-between' }}>
                  <span><b>{naira(p.paid)}</b> <span className="muted">paid of {naira(p.amount)}</span></span>
                  {!done && <span className="muted">{naira(left)} left</span>}
                </div>
                <div className="row gap-8 wrap">
                  {!done && <button className="btn btn-give btn-sm" onClick={() => navigate(`/give?pledge=${p.id}`)}>Pay towards it</button>}
                  {p.paid === 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={async () => { await store.remove('pledges', p.id); toast('Pledge cancelled'); }}>Cancel pledge</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">You haven’t made any pledges yet.</div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Make a pledge">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const amt = Number(amount.replace(/\D/g, ''));
            const proj = active.find((p) => p.id === projectId);
            const t = proj ? proj.title : title.trim();
            if (!member || !t || amt < 100 || !due) return toast('Choose what it’s for, an amount and a date.');
            await store.add('pledges', { uid: member.id, name: member.name, title: t, projectId: proj?.id, amount: amt, paid: 0, dueDate: due, createdAt: new Date().toISOString() });
            setOpen(false);
            setAmount('');
            setTitle('');
            toast('Pledge saved. We’ll remind you as the date gets close.');
          }}
        >
          <div className="field">
            <label htmlFor="pl-for">What is it for?</label>
            <select id="pl-for" className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Something else…</option>
              {active.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {!projectId && (
            <div className="field">
              <label htmlFor="pl-title">Describe it</label>
              <input id="pl-title" className="input" placeholder="e.g. Anniversary thanksgiving" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="pl-amt">Amount (₦)</label>
              <input id="pl-amt" className="input" inputMode="numeric" value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('en-NG') : ''} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pl-due">Pay by</label>
              <input id="pl-due" className="input" type="date" min={todayISO()} value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary">Save pledge</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Counselling ─────────────────────────────────────────────
const TOPICS = ['Spiritual growth', 'Marriage & family', 'Relationships', 'Career & finances', 'Grief & loss', 'Something else'];
const SLOTS = ['Morning (9am – 12pm)', 'Afternoon (12pm – 3pm)', 'Evening (3pm – 6pm)'];
const STATUS: Record<Appointment['status'], string> = { requested: 'Waiting for a pastor', confirmed: 'Confirmed', declined: 'Not available', done: 'Completed' };

export function Counselling() {
  useDocumentTitle('Counselling');
  const { member } = useAuth();
  const toast = useToast();
  const { items } = useCollection('appointments', member ? { field: 'uid', op: '==', value: member.id } : null);
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const [f, setF] = useState({ topic: TOPICS[0], mode: 'In person' as Appointment['mode'], date: tomorrow, slot: SLOTS[0], note: '', phone: member?.phone ?? '' });
  const [busy, setBusy] = useState(false);
  const list = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="container page">
      <PageHead title="Book counselling" sub="Talk with a pastor in confidence. Only the pastoral team sees your request." />
      <div className="two-col" style={{ alignItems: 'start' }}>
        <form
          className="card card-pad form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!member) return;
            if (f.phone.replace(/\D/g, '').length < 10) return toast('Enter a phone number the pastor can reach you on.');
            setBusy(true);
            await store.add('appointments', { uid: member.id, name: member.name, phone: f.phone.trim(), topic: f.topic, mode: f.mode, date: f.date, slot: f.slot, note: f.note.trim().slice(0, 1000), status: 'requested', createdAt: new Date().toISOString() });
            setBusy(false);
            setF({ ...f, note: '' });
            toast('Request sent. A pastor will confirm the time with you.');
          }}
        >
          <h2 style={{ fontSize: 18 }}>Request a session</h2>
          <div className="field">
            <label htmlFor="c-topic">What would you like to talk about?</label>
            <select id="c-topic" className="select" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="seg" role="radiogroup" aria-label="How to meet" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {(['In person', 'Phone call'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={f.mode === m} onClick={() => setF({ ...f, mode: m })}>{m}</button>
            ))}
          </div>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="c-date">Preferred day</label>
              <input id="c-date" className="input" type="date" min={tomorrow} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="c-slot">Time</label>
              <select id="c-slot" className="select" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>
                {SLOTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-phone">Phone number</label>
            <input id="c-phone" className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="c-note">Anything the pastor should know first? (optional)</label>
            <textarea id="c-note" className="textarea" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </form>

        <section className="section">
          <h2 style={{ fontSize: 19 }}>My appointments</h2>
          {list.length ? (
            list.map((a) => (
              <div key={a.id} className="card card-pad stack gap-8">
                <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                  <b>{a.topic}</b>
                  <span className={`pill ${a.status === 'confirmed' ? 'on' : a.status === 'declined' ? 'warn' : ''}`}>{STATUS[a.status]}</span>
                </div>
                <span className="small muted">{fmtLong(a.date)} · {a.slot} · {a.mode}</span>
                {a.reply && <p className="small" style={{ background: 'var(--soft)', padding: '10px 12px', borderRadius: 10 }}><b>Pastor:</b> {a.reply}</p>}
                {a.status === 'requested' && (
                  <div><button className="btn btn-ghost btn-sm" onClick={async () => { await store.remove('appointments', a.id); toast('Request cancelled'); }}>Cancel request</button></div>
                )}
              </div>
            ))
          ) : (
            <div className="empty">Your requests and the pastor’s replies will appear here.</div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── QR check-in ─────────────────────────────────────────────
export function Checkin() {
  const { code } = useParams();
  useDocumentTitle('Check in');
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  if (code) return <CheckinCode code={code.toUpperCase()} />;
  return (
    <div className="container page page-narrow">
      <PageHead title="Check in to service" sub="Let the church know you’re here today." />
      <div className="stack gap-24">
        <div className="soft card-pad stack gap-12 center">
          <div style={{ margin: '0 auto', color: 'var(--blue)' }}><Icon name="qr" size={56} /></div>
          <p><b>Scan the QR code</b> shown at church with your phone camera. It opens this page and checks you in.</p>
        </div>
        <form
          className="card card-pad form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim().length >= 4) navigate(`/checkin/${manual.trim().toUpperCase()}`);
          }}
        >
          <div className="field">
            <label htmlFor="ci-code">Or type the service code</label>
            <input id="ci-code" className="input" autoCapitalize="characters" maxLength={8} style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 20 }} value={manual} onChange={(e) => setManual(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={manual.trim().length < 4}>Check in</button>
        </form>
      </div>
    </div>
  );
}

function CheckinCode({ code }: { code: string }) {
  const { member } = useAuth();
  const { item: service, loading } = useDoc('services', code);
  const attId = member ? `${code}_${member.id}` : null;
  const { item: att, loading: attLoading } = useDoc('attendance', attId);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');

  useEffect(() => {
    if (!member || !service || !service.open || att || attLoading || state !== 'idle') return;
    setState('saving');
    store
      .add('attendance', { id: attId!, serviceId: code, uid: member.id, name: member.name, at: new Date().toISOString() })
      .then(() => setState('idle'))
      .catch(() => setState('error'));
  }, [member, service, att, attLoading, state, attId, code]);

  return (
    <div className="container page page-narrow">
      <PageHead title="Check in" back="/checkin" />
      {loading || (service?.open && !att && state !== 'error') ? (
        <div className="empty">Checking you in…</div>
      ) : !service ? (
        <div className="empty">We couldn’t find a service with the code <b>{code}</b>. Check the code and try again.</div>
      ) : att ? (
        <div className="card card-pad stack gap-12 center">
          <div className="success-ic"><Icon name="check" size={32} /></div>
          <h2 style={{ fontSize: 22 }}>You’re checked in</h2>
          <p className="muted">{service.title} · {fmtLong(service.date)}</p>
          <p>Welcome, {member?.name.split(' ')[0]}. God bless you as you worship today.</p>
          <div><Link to="/" className="btn btn-primary">Go home</Link></div>
        </div>
      ) : !service.open ? (
        <div className="empty">Check-in for {service.title} ({fmtDate(service.date)}) is closed.</div>
      ) : (
        <div className="empty">Something went wrong. <button className="linkish" onClick={() => setState('idle')}>Try again</button></div>
      )}
    </div>
  );
}
