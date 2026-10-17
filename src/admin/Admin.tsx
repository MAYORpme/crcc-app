import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Icon } from '../components/Icon';
import { Modal, asset, useDocumentTitle, useToast } from '../components/ui';
import { isDemo, isPaystackConfigured } from '../config';
import { useAuth } from '../lib/auth';
import { AREA_ROLES, ROLES, can, roleLabel } from '../lib/roles';
import { adminStore, store, useCollection, useSettings } from '../lib/store';
import { fmtDate, fmtLong, naira, nairaShort, pctLabel, todayISO } from '../lib/format';
import { EditorModal, type Resource } from './Editor';
import { resources } from './resources';
import type { AppNotification, Appointment, Gift, GiftType, Order, Role, Settings } from '../types';

type Rec = Record<string, unknown> & { id?: string };

const csvDownload = (name: string, rows: (string | number)[][]) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = name;
  a.click();
};

/** Link to a page of the site that works for both clean and preview (hash) URLs. */
const appUrl = (path: string) =>
  import.meta.env.VITE_HASH_ROUTER === '1' ? `${location.href.split('#')[0]}#${path}` : `${location.origin}${path}`;

function Head({ title, children }: { title: string; children?: React.ReactNode }) {
  useDocumentTitle(`Admin · ${title}`);
  return (
    <div className="admin-head">
      <h1>{title}</h1>
      <div className="row gap-8 wrap">{children}</div>
    </div>
  );
}

function Guard({ area, children }: { area: string; children: React.ReactNode }) {
  const { role } = useAuth();
  if (!can(role, area)) return <div className="empty">Your admin role ({roleLabel(role)}) doesn’t include this section.</div>;
  return <>{children}</>;
}

// ── Generic content lists ───────────────────────────────────
function ResourcePage({ res }: { res: Resource }) {
  const { items } = useCollection(res.name);
  const [editing, setEditing] = useState<Rec | null | 'new'>(null);
  const [q, setQ] = useState('');
  const list = [...(items as unknown as Rec[])].sort(res.sort).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Head title={res.title}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> Add {res.single.toLowerCase()}
        </button>
      </Head>
      {items.length > 8 && (
        <label className="search" style={{ marginBottom: 12, background: '#fff' }}>
          <Icon name="search" size={18} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      )}
      <div className="admin-list">
        {list.length ? (
          list.map((r) => (
            <button key={r.id} className="admin-item" style={{ textAlign: 'left', width: '100%' }} onClick={() => setEditing(r)}>
              {res.image && (res.image(r) ? <img src={asset(res.image(r))} alt="" /> : <span style={{ width: 56, height: 44, borderRadius: 8, background: 'var(--tint)', flex: 'none' }} />)}
              <div className="grow">
                <div className="row-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.heading(r) || '(untitled)'}</div>
                <div className="row-meta">{res.meta(r)}</div>
              </div>
              {res.active && <span className={`pill ${res.active(r) ? 'on' : ''}`}>{res.active(r) ? 'Live' : 'Hidden'}</span>}
              <Icon name="edit" size={18} className="muted" />
            </button>
          ))
        ) : (
          <div className="empty">Nothing here yet.</div>
        )}
      </div>
      {editing && <EditorModal res={res} record={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ResourceRoute() {
  const { name } = useParams();
  const res = resources.find((r) => r.name === name);
  return res ? (
    <Guard area={res.area}>
      <ResourcePage key={res.name} res={res} />
    </Guard>
  ) : (
    <div className="empty">Unknown section.</div>
  );
}

// ── Dashboard ───────────────────────────────────────────────
const TYPES: GiftType[] = ['Tithe', 'Offering', 'Thanksgiving', 'Seed', 'Project', 'Pledge'];
const sum = (list: Gift[]) => list.reduce((n, g) => n + g.amount, 0);

function LiveControl() {
  const s = useSettings();
  const toast = useToast();
  const [url, setUrl] = useState(s.liveUrl);
  useEffect(() => setUrl(s.liveUrl), [s.liveUrl]);
  return (
    <section className="card card-pad stack gap-12">
      <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18 }}>Livestream</h2>
        <span className={`pill ${s.isLive ? 'on' : ''}`}>{s.isLive ? 'LIVE NOW' : 'Off air'}</span>
      </div>
      <div className="field">
        <label htmlFor="live-url">YouTube live link</label>
        <input id="live-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/live/…" />
      </div>
      <div className="row gap-8 wrap">
        <button
          className={`btn btn-sm ${s.isLive ? 'btn-danger' : 'btn-give'}`}
          onClick={async () => {
            await adminStore.set('settings', 'main', { isLive: !s.isLive, liveUrl: url }, s.isLive ? 'Ended livestream' : 'Started livestream');
            if (!s.isLive && isDemo)
              await store.add('notifications', { title: 'We’re live!', body: `${s.liveTitle} is streaming now. Tap to watch.`, link: '/live', audience: 'all', createdAt: new Date().toISOString(), auto: true });
            toast(s.isLive ? 'Livestream ended' : 'You’re live. Members have been notified.');
          }}
        >
          {s.isLive ? 'End livestream' : 'Go live now'}
        </button>
      </div>
    </section>
  );
}

function Dashboard() {
  const { role } = useAuth();
  const finance = can(role, 'giving');
  const pastoral = can(role, 'prayers');
  const { items: gifts } = useCollection('gifts', finance ? undefined : null);
  const { items: projects } = useCollection('projects');
  const { items: members } = useCollection('members', can(role, 'members') || pastoral ? undefined : null);
  const { items: firstTimers } = useCollection('firstTimers', pastoral ? undefined : null);
  const { items: prayers } = useCollection('prayers', pastoral ? undefined : null);
  const { items: testimonies } = useCollection('testimonies', pastoral ? undefined : null);
  const { items: appts } = useCollection('appointments', pastoral ? undefined : null);
  const { items: orders } = useCollection('orders', finance ? undefined : null);
  const { items: sermons } = useCollection('sermons');
  const { items: devs } = useCollection('devotionals');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 864e5).toISOString();
  const ok = gifts.filter((g) => g.status === 'success');
  const month = ok.filter((g) => g.createdAt >= monthStart);
  const byType = TYPES.map((t) => ({ t, v: sum(month.filter((g) => g.type === t)) })).filter((x) => x.v > 0 || x.t !== 'Pledge');
  const max = Math.max(1, ...byType.map((x) => x.v));
  const futureDevs = devs.filter((d) => d.date >= todayISO()).length;

  const todo: { to: string; label: string; n: number }[] = [
    { to: '/admin/testimonies', label: 'testimonies waiting for approval', n: testimonies.filter((t) => t.status === 'pending').length },
    { to: '/admin/appointments', label: 'counselling requests to answer', n: appts.filter((a) => a.status === 'requested').length },
    { to: '/admin/prayers', label: 'private prayer requests', n: prayers.filter((p) => p.visibility === 'pastors' && p.status === 'open').length },
    { to: '/admin/orders', label: 'bookshop orders to prepare', n: orders.filter((o) => o.status === 'paid').length },
  ].filter((x) => x.n > 0);

  return (
    <>
      <Head title="Dashboard">
        <span className="small muted">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </Head>
      {finance && !isPaystackConfigured && (
        <div className="demo-ribbon" style={{ borderRadius: 12, marginBottom: 16, textAlign: 'left', padding: '10px 14px' }}>
          Online payments are in practice mode until the church’s Paystack account is connected.
        </div>
      )}
      <div className="stack gap-24">
        <div className="stats">
          {finance && <div className="stat"><div className="small muted">Given this month</div><div className="v">{nairaShort(sum(month))}</div></div>}
          {finance && <div className="stat"><div className="small muted">Last 7 days</div><div className="v">{nairaShort(sum(ok.filter((g) => g.createdAt >= weekStart)))}</div></div>}
          {(pastoral || can(role, 'members')) && <div className="stat"><div className="small muted">Members</div><div className="v">{members.length}</div></div>}
          {pastoral && <div className="stat"><div className="small muted">First-timers this month</div><div className="v">{firstTimers.filter((f) => f.createdAt >= monthStart).length}</div></div>}
          {!finance && !pastoral && <div className="stat"><div className="small muted">Sermons</div><div className="v">{sermons.length}</div></div>}
          {!finance && !pastoral && <div className="stat"><div className="small muted">Devotionals scheduled</div><div className="v">{futureDevs}</div></div>}
        </div>

        {todo.length > 0 && (
          <section className="card card-pad stack gap-8">
            <h2 style={{ fontSize: 18 }}>Needs attention</h2>
            {todo.map((t) => (
              <Link key={t.to} to={t.to} className="media-row" style={{ padding: '8px 0' }}>
                <span className="badge-count static">{t.n}</span>
                <span className="grow">{t.label}</span>
                <Icon name="chevron" size={18} className="muted" />
              </Link>
            ))}
          </section>
        )}

        <div className="two-col" style={{ gap: 24 }}>
          {can(role, 'live') && <LiveControl />}
          {finance && (
            <section className="card card-pad stack gap-16">
              <h2 style={{ fontSize: 18 }}>This month by type</h2>
              <div className="bar-chart">
                {byType.map(({ t, v }) => (
                  <div key={t} className="bar-row">
                    <span>{t}</span>
                    <div className="bar-track"><span style={{ width: `${(v / max) * 100}%` }} /></div>
                    <span className="num">{naira(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {finance && (
            <section className="card card-pad stack gap-16">
              <h2 style={{ fontSize: 18 }}>Projects</h2>
              {projects.map((p) => (
                <div key={p.id} className="stack gap-8">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <b>{p.title}</b>
                    <span className="small muted">{pctLabel(p.raised, p.target)}</span>
                  </div>
                  <div className="bar-track"><span style={{ width: `${Math.min(100, (p.raised / p.target) * 100)}%` }} /></div>
                  <span className="tiny muted">{naira(p.raised)} of {naira(p.target)}</span>
                </div>
              ))}
            </section>
          )}
          {can(role, 'devotionals') && (
            <section className="card card-pad stack gap-8">
              <h2 style={{ fontSize: 18 }}>Content</h2>
              <p className="small">{futureDevs ? `${futureDevs} devotional${futureDevs === 1 ? '' : 's'} scheduled from today.` : <b style={{ color: 'var(--danger)' }}>No devotional scheduled for today or later.</b>}</p>
              <p className="small muted">{sermons.filter((s) => !s.audioUrl && !s.videoUrl).length} of {sermons.length} sermons still need a recording.</p>
              <div className="row gap-8 wrap">
                <Link to="/admin/c/devotionals" className="btn btn-ghost btn-sm">Devotionals</Link>
                <Link to="/admin/c/sermons" className="btn btn-ghost btn-sm">Sermons</Link>
              </div>
            </section>
          )}
        </div>

        {finance && (
          <section className="stack gap-12">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18 }}>Recent gifts</h2>
              <Link to="/admin/giving" className="small">See all</Link>
            </div>
            <GiftTable gifts={[...gifts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)} />
          </section>
        )}
      </div>
    </>
  );
}

// ── Giving & pledges ────────────────────────────────────────
function GiftTable({ gifts }: { gifts: Gift[] }) {
  if (!gifts.length) return <div className="empty">No gifts yet.</div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Date</th><th>Giver</th><th>Type</th><th className="num">Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {gifts.map((g) => (
            <tr key={g.reference}>
              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(g.createdAt)}</td>
              <td>{g.anonymous ? <i className="muted">Anonymous</i> : g.name || g.email}</td>
              <td>{g.projectTitle || g.type}{g.recurring ? ' · monthly' : ''}</td>
              <td className="num"><b>{naira(g.amount)}</b></td>
              <td><span className={`pill ${g.status === 'success' ? 'on' : ''}`}>{g.demo ? 'Practice' : g.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Giving() {
  const { items } = useCollection('gifts');
  const [type, setType] = useState<'All' | GiftType>('All');
  const [month, setMonth] = useState('');
  const list = [...items]
    .filter((g) => (type === 'All' || g.type === type) && (!month || g.createdAt.startsWith(month)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = sum(list.filter((g) => g.status === 'success'));
  const months = [...new Set(items.map((g) => g.createdAt.slice(0, 7)))].sort().reverse();
  return (
    <>
      <Head title="Giving">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() =>
            csvDownload(`crcc-giving-${month || 'all'}.csv`, [
              ['Date', 'Reference', 'Type', 'Project', 'Amount (NGN)', 'Name', 'Email', 'Phone', 'Monthly', 'Channel', 'Status'],
              ...list.map((g) => [new Date(g.createdAt).toLocaleString('en-GB'), g.reference, g.type, g.projectTitle ?? '', g.amount, g.anonymous ? 'Anonymous' : g.name ?? '', g.email, g.phone ?? '', g.recurring ? 'Yes' : 'No', g.channel ?? '', g.demo ? 'practice' : g.status]),
            ])
          }
        >
          <Icon name="download" size={16} /> Export to Excel (CSV)
        </button>
      </Head>
      <div className="stack gap-16">
        <div className="row gap-8 wrap">
          <div className="chips">
            {(['All', ...TYPES] as const).map((t) => (
              <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
          <select className="select" style={{ width: 'auto' }} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((m) => <option key={m} value={m}>{new Date(m + '-15').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>)}
          </select>
        </div>
        <p><b>{naira(total)}</b> <span className="muted">from {list.length} gifts</span></p>
        <GiftTable gifts={list} />
      </div>
    </>
  );
}

function PledgesAdmin() {
  const { items } = useCollection('pledges');
  const list = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const total = items.reduce((n, p) => n + p.amount, 0);
  const paid = items.reduce((n, p) => n + p.paid, 0);
  return (
    <>
      <Head title="Pledges">
        <button className="btn btn-ghost btn-sm" onClick={() => csvDownload('crcc-pledges.csv', [['Member', 'For', 'Pledged', 'Paid', 'Due'], ...list.map((p) => [p.name, p.title, p.amount, p.paid, p.dueDate])])}>
          <Icon name="download" size={16} /> Export
        </button>
      </Head>
      <div className="stats" style={{ marginBottom: 20 }}>
        <div className="stat"><div className="small muted">Pledged</div><div className="v">{nairaShort(total)}</div></div>
        <div className="stat"><div className="small muted">Paid so far</div><div className="v">{nairaShort(paid)}</div></div>
        <div className="stat"><div className="small muted">Outstanding</div><div className="v">{nairaShort(total - paid)}</div></div>
        <div className="stat"><div className="small muted">Pledges</div><div className="v">{items.length}</div></div>
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Member</th><th>For</th><th className="num">Pledged</th><th className="num">Paid</th><th>Due</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.title}</td>
                  <td className="num">{naira(p.amount)}</td>
                  <td className="num">{naira(p.paid)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {fmtDate(p.dueDate)} {p.paid >= p.amount ? <span className="pill on">Done</span> : p.dueDate < todayISO() ? <span className="pill warn">Past due</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Pledges members make will appear here.</div>
      )}
    </>
  );
}

const ORDER_STEPS: Order['status'][] = ['pending', 'paid', 'ready', 'collected', 'cancelled'];
function Orders() {
  const { items } = useCollection('orders');
  const toast = useToast();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const list = [...items].filter((o) => show === 'all' || o.status === 'paid' || o.status === 'ready').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <Head title="Bookshop orders" />
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className="chip" aria-pressed={show === 'open'} onClick={() => setShow('open')}>To prepare or collect</button>
        <button className="chip" aria-pressed={show === 'all'} onClick={() => setShow('all')}>All orders</button>
      </div>
      {list.length ? (
        <div className="admin-list">
          {list.map((o) => (
            <div key={o.id} className="admin-item" style={{ flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 220 }}>
                <div className="row-title">{o.id} · {o.name}{o.demo ? ' (practice)' : ''}</div>
                <div className="row-meta">{fmtDate(o.createdAt)} · {o.phone} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')} · <b>{naira(o.total)}</b></div>
              </div>
              <select
                className="select"
                style={{ width: 'auto' }}
                aria-label={`Status of ${o.id}`}
                value={o.status}
                onChange={async (e) => {
                  const status = e.target.value as Order['status'];
                  await adminStore.set('orders', o.id, { status }, `${o.id} → ${status}`);
                  if (status === 'ready')
                    await store.add('notifications', { title: 'Your order is ready', body: `Order ${o.id} is ready for pickup at the church office.`, link: '/shop?tab=orders', audience: `user:${o.uid}`, createdAt: new Date().toISOString(), auto: true });
                  toast('Order updated');
                }}
              >
                {ORDER_STEPS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No orders waiting.</div>
      )}
    </>
  );
}

// ── Pastoral ────────────────────────────────────────────────
function People() {
  const { items: ft } = useCollection('firstTimers');
  const { items: regs } = useCollection('registrations');
  return (
    <>
      <Head title="First-timers & registrations">
        <button className="btn btn-ghost btn-sm" onClick={() => csvDownload('crcc-first-timers.csv', [['Date', 'Name', 'Phone', 'Email', 'Area', 'Heard via'], ...ft.map((p) => [fmtDate(p.createdAt), p.name, p.phone, p.email ?? '', p.area ?? '', p.howHeard ?? ''])])}>
          <Icon name="download" size={16} /> Export first-timers
        </button>
      </Head>
      <div className="stack gap-32">
        <section className="stack gap-12">
          <h2 style={{ fontSize: 18 }}>First-timers ({ft.length})</h2>
          {ft.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Joined</th><th>Name</th><th>Phone</th><th>Area</th><th>Heard via</th></tr></thead>
                <tbody>
                  {[...ft].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</td>
                      <td>{p.name}</td>
                      <td><a href={`tel:${p.phone}`}>{p.phone}</a></td>
                      <td>{p.area}</td>
                      <td>{p.howHeard}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Members who tick “first time at CRCC” when signing up appear here for follow-up.</div>
          )}
        </section>
        <section className="stack gap-12">
          <h2 style={{ fontSize: 18 }}>Event registrations ({regs.length})</h2>
          {regs.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Event</th><th>Name</th><th>Phone</th><th className="num">People</th><th>Registered</th></tr></thead>
                <tbody>
                  {[...regs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => (
                    <tr key={r.id}>
                      <td>{r.eventTitle}</td>
                      <td>{r.name}</td>
                      <td><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                      <td className="num">{r.people}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Registrations for events appear here.</div>
          )}
        </section>
      </div>
    </>
  );
}

function PrayersAdmin() {
  const { items } = useCollection('prayers');
  const toast = useToast();
  const [show, setShow] = useState<'pastors' | 'public' | 'answered'>('pastors');
  const list = items
    .filter((p) => (show === 'answered' ? p.status === 'answered' : p.status === 'open' && p.visibility === show))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <Head title="Prayer requests" />
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className="chip" aria-pressed={show === 'pastors'} onClick={() => setShow('pastors')}>Private (pastors only)</button>
        <button className="chip" aria-pressed={show === 'public'} onClick={() => setShow('public')}>On the wall</button>
        <button className="chip" aria-pressed={show === 'answered'} onClick={() => setShow('answered')}>Answered</button>
      </div>
      {list.length ? (
        <div className="admin-list">
          {list.map((p) => (
            <div key={p.id} className="admin-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 240 }}>
                <div className="row-meta">{p.name}{p.anonymous ? ' (hidden from members)' : ''} · {fmtDate(p.createdAt)} · {p.prayedBy?.length ?? 0} prayed</div>
                <p style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{p.text}</p>
              </div>
              <div className="row gap-8">
                {p.status === 'open' && <button className="btn btn-ghost btn-sm" onClick={async () => { await adminStore.set('prayers', p.id, { status: 'answered' }, 'Marked prayer answered'); toast('Marked answered'); }}>Answered</button>}
                <button className="btn btn-danger btn-sm" onClick={async () => { await adminStore.remove('prayers', p.id, p.text.slice(0, 60)); toast('Removed'); }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Nothing here.</div>
      )}
    </>
  );
}

function TestimoniesAdmin() {
  const { items } = useCollection('testimonies');
  const toast = useToast();
  const [show, setShow] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const list = items.filter((t) => t.status === show).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const decide = async (id: string, uid: string, title: string, status: 'approved' | 'rejected') => {
    await adminStore.set('testimonies', id, { status }, `${status === 'approved' ? 'Approved' : 'Declined'}: ${title}`);
    if (status === 'approved')
      await store.add('notifications', { title: 'Your testimony is live', body: `“${title}” is now on the testimonies page. Thank you for sharing!`, link: '/testimonies', audience: `user:${uid}`, createdAt: new Date().toISOString(), auto: true });
    toast(status === 'approved' ? 'Approved and published' : 'Declined');
  };
  return (
    <>
      <Head title="Testimonies" />
      <div className="chips" style={{ marginBottom: 16 }}>
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} className="chip" aria-pressed={show === s} onClick={() => setShow(s)}>
            {s === 'pending' ? `Waiting (${items.filter((t) => t.status === 'pending').length})` : s === 'approved' ? 'Published' : 'Declined'}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="admin-list">
          {list.map((t) => (
            <div key={t.id} className="admin-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 240 }}>
                <div className="row-title">{t.title}</div>
                <div className="row-meta">{t.name} · {fmtDate(t.createdAt)}</div>
                <p style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{t.text}</p>
              </div>
              <div className="row gap-8">
                {t.status !== 'approved' && <button className="btn btn-primary btn-sm" onClick={() => decide(t.id, t.uid, t.title, 'approved')}>Publish</button>}
                {t.status !== 'rejected' && <button className="btn btn-ghost btn-sm" onClick={() => decide(t.id, t.uid, t.title, 'rejected')}>{t.status === 'approved' ? 'Unpublish' : 'Decline'}</button>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">Nothing here.</div>
      )}
    </>
  );
}

function AppointmentsAdmin() {
  const { items } = useCollection('appointments');
  const toast = useToast();
  const [open, setOpen] = useState<Appointment | null>(null);
  const [reply, setReply] = useState('');
  const [show, setShow] = useState<'requested' | 'confirmed' | 'past'>('requested');
  const list = items
    .filter((a) => (show === 'past' ? a.status === 'done' || a.status === 'declined' : a.status === show))
    .sort((a, b) => a.date.localeCompare(b.date));
  const respond = async (status: Appointment['status']) => {
    if (!open) return;
    await adminStore.set('appointments', open.id, { status, reply: reply.trim() }, `${open.name}: ${status}`);
    if (status !== 'done')
      await store.add('notifications', {
        title: status === 'confirmed' ? 'Counselling session confirmed' : 'About your counselling request',
        body: reply.trim() || (status === 'confirmed' ? `See you on ${fmtDate(open.date)} (${open.slot}).` : 'A pastor has replied to your request.'),
        link: '/counselling',
        audience: `user:${open.uid}`,
        createdAt: new Date().toISOString(),
        auto: true,
      });
    toast('Saved and the member has been notified');
    setOpen(null);
  };
  return (
    <>
      <Head title="Counselling" />
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className="chip" aria-pressed={show === 'requested'} onClick={() => setShow('requested')}>New requests</button>
        <button className="chip" aria-pressed={show === 'confirmed'} onClick={() => setShow('confirmed')}>Confirmed</button>
        <button className="chip" aria-pressed={show === 'past'} onClick={() => setShow('past')}>Past</button>
      </div>
      {list.length ? (
        <div className="admin-list">
          {list.map((a) => (
            <button key={a.id} className="admin-item" style={{ textAlign: 'left', width: '100%' }} onClick={() => { setOpen(a); setReply(a.reply ?? ''); }}>
              <div className="grow">
                <div className="row-title">{a.name} · {a.topic}</div>
                <div className="row-meta">{fmtLong(a.date)} · {a.slot} · {a.mode} · {a.phone}</div>
              </div>
              <Icon name="chevron" size={18} className="muted" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">Nothing here.</div>
      )}
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title="Counselling request">
        {open && (
          <div className="stack gap-12">
            <dl className="dl">
              <dt>Member</dt><dd>{open.name}</dd>
              <dt>Phone</dt><dd><a href={`tel:${open.phone}`}>{open.phone}</a></dd>
              <dt>Topic</dt><dd>{open.topic}</dd>
              <dt>When</dt><dd>{fmtLong(open.date)} · {open.slot}</dd>
              <dt>How</dt><dd>{open.mode}</dd>
            </dl>
            {open.note && <p style={{ background: 'var(--soft)', padding: 12, borderRadius: 10, whiteSpace: 'pre-line' }}>{open.note}</p>}
            <div className="field">
              <label htmlFor="ap-reply">Message to the member</label>
              <textarea id="ap-reply" className="textarea" placeholder="e.g. Confirmed for 10am at the church office." value={reply} onChange={(e) => setReply(e.target.value)} />
            </div>
            <div className="row gap-8 wrap">
              <button className="btn btn-primary btn-sm" onClick={() => respond('confirmed')}>Confirm</button>
              <button className="btn btn-ghost btn-sm" onClick={() => respond('declined')}>Can’t make it</button>
              <button className="btn btn-ghost btn-sm" onClick={() => respond('done')}>Mark completed</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => codeChars[b % codeChars.length]).join('');

function Attendance() {
  const { items: services } = useCollection('services');
  const { items: att } = useCollection('attendance');
  const toast = useToast();
  const [title, setTitle] = useState('Sunday Service');
  const [date, setDate] = useState(todayISO());
  const [screen, setScreen] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [listFor, setListFor] = useState<string | null>(null);
  useEffect(() => {
    if (!screen) return;
    QRCode.toDataURL(appUrl(`/checkin/${screen}`), { width: 640, margin: 1, color: { dark: '#05325a' } }).then(setQr);
  }, [screen]);
  const counts = useMemo(() => att.reduce<Record<string, number>>((m, a) => ((m[a.serviceId] = (m[a.serviceId] ?? 0) + 1), m), {}), [att]);
  const list = [...services].sort((a, b) => b.date.localeCompare(a.date));
  const max = Math.max(1, ...Object.values(counts));
  const shown = services.find((s) => s.id === screen);
  const people = att.filter((a) => a.serviceId === listFor).sort((a, b) => a.at.localeCompare(b.at));
  return (
    <>
      <Head title="Attendance" />
      <form
        className="card card-pad form-grid two"
        style={{ marginBottom: 20, alignItems: 'end' }}
        onSubmit={async (e) => {
          e.preventDefault();
          const code = newCode();
          await adminStore.add('services', { id: code, title: title.trim() || 'Service', date, code, open: true, createdAt: new Date().toISOString() });
          setScreen(code);
          toast('Check-in opened');
        }}
      >
        <div className="field">
          <label htmlFor="sv-title">Service</label>
          <input id="sv-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sv-date">Date</label>
          <input id="sv-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}><Icon name="qr" size={18} /> Open check-in and show QR code</button>
      </form>
      {list.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Service</th><th>Code</th><th>Checked in</th><th /></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.date)}</td>
                  <td>{s.title} {s.open ? <span className="pill on">Open</span> : <span className="pill">Closed</span>}</td>
                  <td><code>{s.id}</code></td>
                  <td style={{ minWidth: 160 }}>
                    <div className="row gap-8">
                      <div className="bar-track grow"><span style={{ width: `${((counts[s.id] ?? 0) / max) * 100}%` }} /></div>
                      <b className="num" style={{ minWidth: 28 }}>{counts[s.id] ?? 0}</b>
                    </div>
                  </td>
                  <td>
                    <div className="row gap-4">
                      <button className="btn btn-ghost btn-sm" onClick={() => setScreen(s.id)}>QR</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setListFor(s.id)}>Names</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminStore.set('services', s.id, { open: !s.open }, `${s.title} check-in ${s.open ? 'closed' : 'opened'}`)}>{s.open ? 'Close' : 'Reopen'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Open check-in for a service to start counting attendance.</div>
      )}
      <Modal open={Boolean(screen)} onClose={() => setScreen(null)} title={shown ? `${shown.title} · ${fmtDate(shown.date)}` : 'Check-in'}>
        <div className="stack gap-12 center">
          {qr && <img src={qr} alt={`QR code to check in to ${shown?.title}`} style={{ width: '100%', maxWidth: 420, margin: '0 auto', imageRendering: 'pixelated' }} />}
          <p>Scan with your phone camera to check in</p>
          <p>or go to <b>Check in</b> in the app and enter</p>
          <div style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--blue)' }}>{screen}</div>
          <p className="tiny muted">{(screen && counts[screen]) ?? 0} checked in so far</p>
        </div>
      </Modal>
      <Modal open={Boolean(listFor)} onClose={() => setListFor(null)} title={`Checked in (${people.length})`}>
        <div className="stack gap-8">
          {people.map((p) => (
            <div key={p.id} className="row" style={{ justifyContent: 'space-between' }}><span>{p.name}</span><span className="tiny muted">{new Date(p.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></div>
          ))}
          {people.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => csvDownload(`attendance-${listFor}.csv`, [['Name', 'Time'], ...people.map((p) => [p.name, new Date(p.at).toLocaleString('en-GB')])])}>
              <Icon name="download" size={16} /> Export
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}

// ── Notifications ───────────────────────────────────────────
function NotificationsAdmin() {
  const { member } = useAuth();
  const { items } = useCollection('notifications');
  const { items: depts } = useCollection('departments');
  const toast = useToast();
  const [f, setF] = useState({ title: '', body: '', link: '', audience: 'all' });
  const sent = items.filter((n) => !n.audience.startsWith('user:')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const audienceLabel = (a: string) => (a === 'all' ? 'Everyone' : depts.find((d) => `dept:${d.id}` === a)?.name ?? a);
  return (
    <>
      <Head title="Send a notification" />
      <div className="two-col" style={{ alignItems: 'start', gap: 24 }}>
        <form
          className="card card-pad form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!f.title.trim() || !f.body.trim()) return toast('Add a title and a message');
            const n: Omit<AppNotification, 'id'> = { title: f.title.trim().slice(0, 80), body: f.body.trim().slice(0, 300), link: f.link.trim() || undefined, audience: f.audience, createdAt: new Date().toISOString(), createdBy: member?.name };
            await adminStore.add('notifications', n);
            setF({ title: '', body: '', link: '', audience: f.audience });
            toast('Sent');
          }}
        >
          <div className="field">
            <label htmlFor="nt-aud">Send to</label>
            <select id="nt-aud" className="select" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
              <option value="all">Everyone</option>
              {depts.map((d) => <option key={d.id} value={`dept:${d.id}`}>{d.name} department</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nt-title">Title</label>
            <input id="nt-title" className="input" maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="nt-body">Message</label>
            <textarea id="nt-body" className="textarea" maxLength={300} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            <span className="hint">{f.body.length}/300 · keep it short, it shows on phone lock screens</span>
          </div>
          <div className="field">
            <label htmlFor="nt-link">Opens page (optional)</label>
            <input id="nt-link" className="input" placeholder="/events" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
          </div>
          <button className="btn btn-primary"><Icon name="bell" size={16} /> Send notification</button>
          <p className="hint">Members get it in the app inbox and, if they turned notifications on, as a phone alert. New sermons, going live, devotionals and event reminders are sent automatically.</p>
        </form>
        <section className="section">
          <h2 style={{ fontSize: 18 }}>Sent</h2>
          {sent.map((n) => (
            <div key={n.id} className="admin-item" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="row-title">{n.title}</div>
                <p className="small" style={{ marginTop: 2 }}>{n.body}</p>
                <div className="row-meta">{audienceLabel(n.audience)} · {new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{n.auto ? ' · automatic' : n.createdBy ? ` · ${n.createdBy}` : ''}</div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

// ── Super admin: members, roles, audit, settings ────────────
function Members() {
  const { member: me } = useAuth();
  const { items } = useCollection('members');
  const { items: admins } = useCollection('admins');
  const { items: depts } = useCollection('departments');
  const toast = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const roleOf = (id: string) => admins.find((a) => a.id === id)?.role;
  const list = [...items]
    .filter((m) => !q || `${m.name} ${m.email} ${m.phone} ${m.area}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const m = items.find((x) => x.id === open);
  const thisMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const bdays = items.filter((x) => x.birthday?.startsWith(thisMonth)).sort((a, b) => (a.birthday ?? '').localeCompare(b.birthday ?? ''));
  return (
    <>
      <Head title={`Members (${items.length})`}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() =>
            csvDownload('crcc-members.csv', [
              ['Name', 'Email', 'Phone', 'Birthday', 'Anniversary', 'Area', 'Departments', 'Joined', 'Role'],
              ...items.map((x) => [x.name, x.email ?? '', x.phone ?? '', x.birthday ?? '', x.anniversary ?? '', x.area ?? '', (x.departments ?? []).map((d) => depts.find((y) => y.id === d)?.name ?? d).join('; '), fmtDate(x.createdAt), roleLabel(roleOf(x.id))]),
            ])
          }
        >
          <Icon name="download" size={16} /> Export
        </button>
      </Head>
      <div className="two-col" style={{ alignItems: 'start', gap: 24 }}>
        <div className="stack gap-12">
          <label className="search" style={{ background: '#fff' }}>
            <Icon name="search" size={18} />
            <span className="sr-only">Search members</span>
            <input type="search" placeholder="Search by name, phone, email or area" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="admin-list">
            {list.map((x) => (
              <button key={x.id} className="admin-item" style={{ textAlign: 'left', width: '100%' }} onClick={() => setOpen(x.id)}>
                <div className="grow">
                  <div className="row-title">{x.name}</div>
                  <div className="row-meta">{[x.phone, x.email].filter(Boolean).join(' · ')}</div>
                </div>
                {roleOf(x.id) && <span className="pill on">{roleLabel(roleOf(x.id))}</span>}
                {x.blocked && <span className="pill warn">Paused</span>}
              </button>
            ))}
          </div>
        </div>
        <section className="card card-pad stack gap-8">
          <h2 style={{ fontSize: 18 }}><Icon name="cake" size={18} /> Birthdays this month</h2>
          {bdays.length ? bdays.map((x) => (
            <div key={x.id} className="row" style={{ justifyContent: 'space-between' }}><span>{x.name}</span><span className="small muted">{new Date(2024, Number(x.birthday!.slice(0, 2)) - 1, Number(x.birthday!.slice(3))).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div>
          )) : <p className="small muted">None recorded.</p>}
        </section>
      </div>
      <Modal open={Boolean(m)} onClose={() => setOpen(null)} title={m?.name ?? ''}>
        {m && (
          <div className="stack gap-16">
            <dl className="dl">
              <dt>Phone</dt><dd>{m.phone || '—'}</dd>
              <dt>Email</dt><dd>{m.email || '—'}</dd>
              <dt>Area</dt><dd>{m.area || '—'}</dd>
              <dt>Departments</dt><dd>{(m.departments ?? []).map((d) => depts.find((y) => y.id === d)?.name ?? d).join(', ') || '—'}</dd>
              <dt>Joined</dt><dd>{fmtDate(m.createdAt)}</dd>
              <dt>Last seen</dt><dd>{m.lastSeenAt ? fmtDate(m.lastSeenAt) : '—'}</dd>
            </dl>
            <div className="field">
              <label htmlFor="mb-role">Admin role</label>
              <select
                id="mb-role"
                className="select"
                value={roleOf(m.id) ?? ''}
                disabled={m.id === me?.id}
                onChange={async (e) => {
                  const r = e.target.value as Role | '';
                  if (r) await adminStore.set('admins', m.id, { role: r, name: m.name, email: m.email, addedAt: new Date().toISOString() }, `${m.name} → ${roleLabel(r)}`);
                  else await adminStore.remove('admins', m.id, `${m.name} removed as admin`);
                  toast(r ? `${m.name} is now ${roleLabel(r)}` : `${m.name} is no longer an admin`);
                }}
              >
                <option value="">Member (no admin access)</option>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}: {r.does}</option>)}
              </select>
              {m.id === me?.id && <span className="hint">You can’t change your own role.</span>}
            </div>
            {m.id !== me?.id && (
              <button
                className={`btn btn-sm ${m.blocked ? 'btn-primary' : 'btn-danger'}`}
                style={{ alignSelf: 'flex-start' }}
                onClick={async () => {
                  await adminStore.set('members', m.id, { blocked: !m.blocked }, `${m.name} ${m.blocked ? 'restored' : 'paused'}`);
                  toast(m.blocked ? 'Access restored' : 'Access paused');
                }}
              >
                {m.blocked ? 'Restore access' : 'Pause this account'}
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function Audit() {
  const { items } = useCollection('audit');
  const list = [...items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  return (
    <>
      <Head title="Audit log" />
      <p className="small muted" style={{ marginBottom: 12 }}>Every change made in the admin area: who, what and when. Entries can’t be edited or deleted.</p>
      {list.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Section</th><th>Detail</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{a.name}</td>
                  <td><span className={`pill ${a.action === 'delete' ? 'warn' : a.action === 'create' ? 'on' : ''}`}>{a.action}</span></td>
                  <td>{a.collection}</td>
                  <td style={{ minWidth: 200 }}>{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Changes made in the admin area will be listed here.</div>
      )}
    </>
  );
}

function SettingsPage() {
  const current = useSettings();
  const toast = useToast();
  const [d, setD] = useState<Settings | null>(null);
  const [armed, setArmed] = useState(false);
  const s = d ?? current;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setD({ ...s, [k]: v });
  const text = (k: keyof Settings, label: string, hint?: string, type = 'text') => (
    <div className="field">
      <label htmlFor={`s-${k}`}>{label}</label>
      <input id={`s-${k}`} className="input" type={type} value={(s[k] as string) ?? ''} onChange={(e) => set(k, e.target.value as never)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
  return (
    <>
      <Head title="Settings">
        <button className="btn btn-primary btn-sm" disabled={!d} onClick={async () => { await adminStore.set('settings', 'main', s, 'Church settings'); setD(null); toast('Settings saved'); }}>
          Save changes
        </button>
      </Head>
      <div className="stack gap-24" style={{ maxWidth: 760 }}>
        <section className="card card-pad stack gap-16">
          <h2 style={{ fontSize: 18 }}>Service times</h2>
          <div className="list-editor">
            {s.serviceTimes.map((t, i) => (
              <div key={i} className="row gap-8">
                <input className="input" aria-label="Service name" value={t.label} onChange={(e) => set('serviceTimes', s.serviceTimes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="input" aria-label="Day and time" value={t.time} onChange={(e) => set('serviceTimes', s.serviceTimes.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                <button className="icon-btn" aria-label="Remove" onClick={() => set('serviceTimes', s.serviceTimes.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => set('serviceTimes', [...s.serviceTimes, { label: '', time: '' }])}><Icon name="plus" size={16} /> Add service</button>
          </div>
          {text('liveTitle', 'Livestream title', 'Shown on the home page when you go live')}
        </section>
        <section className="card card-pad stack gap-16">
          <h2 style={{ fontSize: 18 }}>Bank details (shown on the Give page)</h2>
          <div className="form-grid two">
            {text('bankName', 'Bank')}
            {text('accountNumber', 'Account number')}
          </div>
          {text('accountName', 'Account name')}
        </section>
        <section className="card card-pad stack gap-16">
          <h2 style={{ fontSize: 18 }}>Contact &amp; social</h2>
          <div className="form-grid two">
            {text('phone', 'Phone', undefined, 'tel')}
            {text('whatsapp', 'WhatsApp number', undefined, 'tel')}
            {text('email', 'Email', undefined, 'email')}
            {text('youtube', 'YouTube channel link', undefined, 'url')}
            {text('facebook', 'Facebook link', undefined, 'url')}
            {text('instagram', 'Instagram link', undefined, 'url')}
          </div>
        </section>
        <section className="card card-pad stack gap-16">
          <h2 style={{ fontSize: 18 }}>About page</h2>
          {text('vision', 'Vision')}
          {text('mission', 'Mission')}
          {text('firstLadyName', 'First Lady’s name')}
          <div className="field">
            <label htmlFor="s-flbio">First Lady’s bio</label>
            <textarea id="s-flbio" className="textarea" value={s.firstLadyBio} onChange={(e) => set('firstLadyBio', e.target.value)} />
          </div>
        </section>
        {!isDemo && (
          <section className="card card-pad stack gap-12">
            <h2 style={{ fontSize: 18 }}>Starter content</h2>
            <p className="small muted">Fill an empty site with the sample content so you can edit it instead of starting blank. Existing items with the same ID are overwritten.</p>
            <div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  const { seed } = await import('../data/seed');
                  const cols = ['settings', 'announcements', 'adverts', 'sermons', 'lessons', 'events', 'projects', 'devotionals', 'departments', 'cells', 'plans', 'products', 'albums'] as const;
                  for (const c of cols) for (const item of seed[c] as { id: string }[]) await store.set(c, item.id, item as never);
                  toast('Sample content loaded');
                }}
              >
                Load sample content
              </button>
            </div>
          </section>
        )}
        {isDemo && store.reset && (
          <section className="card card-pad stack gap-12">
            <h2 style={{ fontSize: 18 }}>Demo data</h2>
            <p className="small muted">Clear all practice data and accounts in this browser and start again from the sample content.</p>
            <div>
              <button className="btn btn-danger btn-sm" onClick={() => (armed ? store.reset!() : setArmed(true))}>{armed ? 'Tap again to reset' : 'Reset demo data'}</button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ── Shell ───────────────────────────────────────────────────
const NAV: { to: string; label: string; icon: string; area: string; group: string }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', area: 'dashboard', group: '' },
  { to: '/admin/c/announcements', label: 'Announcement bar', icon: 'megaphone', area: 'announcements', group: 'Communications' },
  { to: '/admin/c/adverts', label: 'Adverts', icon: 'image', area: 'adverts', group: 'Communications' },
  { to: '/admin/c/events', label: 'Events', icon: 'calendar', area: 'events', group: 'Communications' },
  { to: '/admin/notifications', label: 'Notifications', icon: 'bell', area: 'notifications', group: 'Communications' },
  { to: '/admin/c/departments', label: 'Departments', icon: 'users', area: 'departments', group: 'Communications' },
  { to: '/admin/c/deptPosts', label: 'Department updates', icon: 'chat', area: 'deptPosts', group: 'Communications' },
  { to: '/admin/c/cells', label: 'House fellowships', icon: 'compass', area: 'cells', group: 'Communications' },
  { to: '/admin/c/sermons', label: 'Sermons', icon: 'headphones', area: 'sermons', group: 'Media' },
  { to: '/admin/c/lessons', label: 'Oxygen Class', icon: 'layers', area: 'lessons', group: 'Media' },
  { to: '/admin/c/devotionals', label: 'Devotionals', icon: 'sun', area: 'devotionals', group: 'Media' },
  { to: '/admin/c/plans', label: 'Reading plans', icon: 'bookmark', area: 'plans', group: 'Media' },
  { to: '/admin/c/albums', label: 'Gallery', icon: 'image', area: 'albums', group: 'Media' },
  { to: '/admin/giving', label: 'Giving', icon: 'heart', area: 'giving', group: 'Finance' },
  { to: '/admin/c/projects', label: 'Projects', icon: 'target', area: 'projects', group: 'Finance' },
  { to: '/admin/pledges', label: 'Pledges', icon: 'target', area: 'pledges', group: 'Finance' },
  { to: '/admin/c/products', label: 'Bookshop products', icon: 'cart', area: 'products', group: 'Finance' },
  { to: '/admin/orders', label: 'Bookshop orders', icon: 'cart', area: 'orders', group: 'Finance' },
  { to: '/admin/people', label: 'First-timers', icon: 'users', area: 'people', group: 'Pastoral' },
  { to: '/admin/prayers', label: 'Prayer requests', icon: 'hands', area: 'prayers', group: 'Pastoral' },
  { to: '/admin/testimonies', label: 'Testimonies', icon: 'star', area: 'testimonies', group: 'Pastoral' },
  { to: '/admin/appointments', label: 'Counselling', icon: 'chat', area: 'appointments', group: 'Pastoral' },
  { to: '/admin/attendance', label: 'Attendance', icon: 'qr', area: 'attendance', group: 'Pastoral' },
  { to: '/admin/members', label: 'Members & roles', icon: 'user', area: 'members', group: 'Super admin' },
  { to: '/admin/audit', label: 'Audit log', icon: 'file', area: 'audit', group: 'Super admin' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings', area: 'settings', group: 'Super admin' },
];

export default function Admin() {
  const auth = useAuth();
  if (!auth.isAdmin)
    return (
      <div className="login-wrap">
        <div className="login-card center">
          <h1 style={{ fontSize: 20 }}>No admin access</h1>
          <p className="muted">You’re signed in as {auth.member?.name}, but this account isn’t a church admin. A super admin can give you a role under Members &amp; roles.</p>
          <Link to="/" className="btn btn-primary">Back to the app</Link>
        </div>
      </div>
    );
  const nav = NAV.filter((n) => can(auth.role, n.area));
  let lastGroup = '';
  return (
    <div className="admin">
      <aside className="admin-side" aria-label="Admin">
        <div className="brand-row">
          <img src={asset('/images/logo-white.png')} alt="CRCC" />
        </div>
        <div className="admin-role tiny">{auth.member?.name} · {roleLabel(auth.role)}</div>
        {nav.map((n) => {
          const head = n.group && n.group !== lastGroup ? n.group : '';
          lastGroup = n.group || lastGroup;
          return (
            <div key={n.to} className="admin-nav-item">
              {head && <div className="admin-group">{head}</div>}
              <NavLink to={n.to} end={n.to === '/admin'} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={n.icon} size={18} /> {n.label}
              </NavLink>
            </div>
          );
        })}
        <span className="spacer" />
        <Link to="/"><Icon name="external" size={18} /> Back to the app</Link>
        <button className="linklike" onClick={auth.signOut}><Icon name="logout" size={18} /> Sign out</button>
      </aside>
      <main className="admin-main">
        <Routes>
          <Route index element={<Guard area="dashboard"><Dashboard /></Guard>} />
          <Route path="c/:name" element={<ResourceRoute />} />
          <Route path="giving" element={<Guard area="giving"><Giving /></Guard>} />
          <Route path="pledges" element={<Guard area="pledges"><PledgesAdmin /></Guard>} />
          <Route path="orders" element={<Guard area="orders"><Orders /></Guard>} />
          <Route path="people" element={<Guard area="people"><People /></Guard>} />
          <Route path="prayers" element={<Guard area="prayers"><PrayersAdmin /></Guard>} />
          <Route path="testimonies" element={<Guard area="testimonies"><TestimoniesAdmin /></Guard>} />
          <Route path="appointments" element={<Guard area="appointments"><AppointmentsAdmin /></Guard>} />
          <Route path="attendance" element={<Guard area="attendance"><Attendance /></Guard>} />
          <Route path="notifications" element={<Guard area="notifications"><NotificationsAdmin /></Guard>} />
          <Route path="members" element={<Guard area="members"><Members /></Guard>} />
          <Route path="audit" element={<Guard area="audit"><Audit /></Guard>} />
          <Route path="settings" element={<Guard area="settings"><SettingsPage /></Guard>} />
        </Routes>
      </main>
    </div>
  );
}

export { AREA_ROLES };
