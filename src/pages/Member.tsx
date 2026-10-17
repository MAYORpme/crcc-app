import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Layout';
import { InstallHelp, useInstall } from '../components/InstallPrompt';
import { PageHead, useDocumentTitle, useToast } from '../components/ui';
import { MonthDay } from './AuthScreens';
import { church } from '../config';
import { useAuth } from '../lib/auth';
import { roleLabel } from '../lib/roles';
import { store, useCollection } from '../lib/store';
import { fmtDate, naira } from '../lib/format';
import { enablePush, markAllRead, pushPermission, pushSupported, useMyNotifications } from '../lib/push';
import type { Gift, Member } from '../types';

const GROUPS: { title: string; items: { to: string; label: string; icon: string; sub: string }[] }[] = [
  {
    title: 'Grow',
    items: [
      { to: '/devotional', label: 'Daily devotional', icon: 'sun', sub: 'Today’s word and prayer' },
      { to: '/bible', label: 'Bible & reading plans', icon: 'book', sub: 'Read the KJV, follow a plan' },
      { to: '/oxygen', label: 'Oxygen Class', icon: 'layers', sub: 'This week’s Sunday School lesson' },
      { to: '/sermons', label: 'Sermons', icon: 'headphones', sub: 'Listen, watch, download' },
    ],
  },
  {
    title: 'Community',
    items: [
      { to: '/prayer', label: 'Prayer wall', icon: 'hands', sub: 'Share a request, pray for others' },
      { to: '/testimonies', label: 'Testimonies', icon: 'star', sub: 'What God has done' },
      { to: '/departments', label: 'Departments', icon: 'users', sub: 'Choir, ushering, media and more' },
      { to: '/fellowships', label: 'House fellowships', icon: 'compass', sub: 'Find one near you' },
      { to: '/events', label: 'Events', icon: 'calendar', sub: 'What’s coming up' },
      { to: '/gallery', label: 'Gallery', icon: 'image', sub: 'Photos from church life' },
    ],
  },
  {
    title: 'Give & shop',
    items: [
      { to: '/give', label: 'Give', icon: 'heart', sub: 'Tithe, offering, projects' },
      { to: '/pledges', label: 'My pledges', icon: 'target', sub: 'Track what you’ve promised' },
      { to: '/shop', label: 'Bookshop', icon: 'cart', sub: 'Manuals, books and merchandise' },
    ],
  },
  {
    title: 'Care',
    items: [
      { to: '/counselling', label: 'Book counselling', icon: 'chat', sub: 'Speak with a pastor' },
      { to: '/checkin', label: 'Check in to service', icon: 'qr', sub: 'Scan the code at church' },
    ],
  },
  {
    title: 'Church',
    items: [
      { to: '/about', label: 'About CRCC', icon: 'church', sub: 'Our story, founder, visit us' },
      { to: '/notifications', label: 'Notifications', icon: 'bell', sub: 'Messages from the church' },
      { to: '/profile', label: 'My profile', icon: 'user', sub: 'Details, giving history, settings' },
    ],
  },
];

export function More() {
  useDocumentTitle('More');
  const { isAdmin, member, signOut } = useAuth();
  const { installed } = useInstall();
  const [help, setHelp] = useState(false);
  return (
    <div className="container page">
      <div className="row gap-12" style={{ marginBottom: 24 }}>
        <Avatar name={member?.name ?? ''} photo={member?.photo} size={52} />
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: 24 }}>{member?.name}</h1>
          <Link to="/profile" className="small">View profile</Link>
        </div>
      </div>
      <div className="stack gap-32">
        {GROUPS.map((g) => (
          <section key={g.title} className="section">
            <h2 className="eyebrow muted">{g.title}</h2>
            <div className="tile-grid">
              {g.items.map((i) => (
                <Link key={i.to} to={i.to} className="tile">
                  <span className="tile-ic"><Icon name={i.icon} size={22} /></span>
                  <span>
                    <span className="tile-label">{i.label}</span>
                    <span className="tile-sub">{i.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <div className="row gap-8 wrap">
          {isAdmin && <Link to="/admin" className="btn btn-primary"><Icon name="settings" size={18} /> Church admin</Link>}
          {!installed && <button className="btn btn-ghost" onClick={() => setHelp(true)}><Icon name="download" size={18} /> Add to home screen</button>}
          <button className="btn btn-ghost" onClick={signOut}><Icon name="logout" size={18} /> Sign out</button>
        </div>
      </div>
      <InstallHelp open={help} onClose={() => setHelp(false)} />
    </div>
  );
}

function sumBy(gifts: Gift[]) {
  const by: Record<string, number> = {};
  gifts.forEach((g) => (by[g.projectTitle ? `Project: ${g.projectTitle}` : g.type] = (by[g.projectTitle ? `Project: ${g.projectTitle}` : g.type] ?? 0) + g.amount));
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}

export function Profile() {
  useDocumentTitle('My profile');
  const { member, user, role, saveProfile, signOut } = useAuth();
  const toast = useToast();
  const { items: gifts } = useCollection('gifts', member ? { field: 'uid', op: '==', value: member.id } : null);
  const { items: depts } = useCollection('departments');
  const { items: cells } = useCollection('cells');
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState<Partial<Member>>({});
  const [perm, setPerm] = useState(pushPermission());
  const [busy, setBusy] = useState(false);
  if (!member) return null;
  const v = { ...member, ...d };
  const ok = gifts.filter((g) => g.status === 'success').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const years = [...new Set(ok.map((g) => g.createdAt.slice(0, 4)))];
  const thisYear = String(new Date().getFullYear());
  if (!years.includes(thisYear)) years.unshift(thisYear);
  const yearTotal = ok.filter((g) => g.createdAt.startsWith(thisYear)).reduce((n, g) => n + g.amount, 0);
  const myDepts = depts.filter((x) => member.departments?.includes(x.id));
  const myCell = cells.find((c) => c.id === member.cellId);

  return (
    <div className="container page">
      <div className="profile-head">
        <label className="avatar-upload" aria-label="Change profile photo">
          <Avatar name={member.name} photo={member.photo} size={84} />
          <span className="avatar-edit"><Icon name="edit" size={14} /></span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const url = await store.upload(f, `members/${member.id}`);
                await saveProfile({ photo: url });
                toast('Photo updated');
              } catch {
                toast('Could not upload the photo. Try a smaller image.');
              }
            }}
          />
        </label>
        <div>
          <h1 className="page-title" style={{ fontSize: 26 }}>{member.name}</h1>
          <p className="muted small">{[member.email || user?.email, member.phone].filter(Boolean).join(' · ')}</p>
          {role && <span className="tag" style={{ marginTop: 6 }}>{roleLabel(role)}</span>}
        </div>
      </div>

      <div className="two-col" style={{ alignItems: 'start', marginTop: 24 }}>
        <div className="stack gap-24">
          <section className="card card-pad stack gap-16">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18 }}>My details</h2>
              {!edit && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={16} /> Edit</button>}
            </div>
            {edit ? (
              <form
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!v.name?.trim()) return toast('Enter your name');
                  setBusy(true);
                  await saveProfile(d);
                  setBusy(false);
                  setD({});
                  setEdit(false);
                  toast('Profile saved');
                }}
              >
                <div className="field">
                  <label htmlFor="p-name">Full name</label>
                  <input id="p-name" className="input" value={v.name ?? ''} onChange={(e) => setD({ ...d, name: e.target.value })} />
                </div>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="p-phone">Phone</label>
                    <input id="p-phone" className="input" type="tel" value={v.phone ?? ''} onChange={(e) => setD({ ...d, phone: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="p-email">Email</label>
                    <input id="p-email" className="input" type="email" value={v.email ?? ''} onChange={(e) => setD({ ...d, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-grid two">
                  <MonthDay id="p-bday" label="Birthday" value={v.birthday ?? ''} onChange={(x) => setD({ ...d, birthday: x })} />
                  <MonthDay id="p-anniv" label="Wedding anniversary" value={v.anniversary ?? ''} onChange={(x) => setD({ ...d, anniversary: x })} />
                </div>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="p-gender">Gender</label>
                    <select id="p-gender" className="select" value={v.gender ?? ''} onChange={(e) => setD({ ...d, gender: e.target.value as Member['gender'] })}>
                      <option value="">Prefer not to say</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="p-area">Area</label>
                    <input id="p-area" className="input" value={v.area ?? ''} onChange={(e) => setD({ ...d, area: e.target.value })} />
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={v.celebrate ?? true} onChange={(e) => setD({ ...d, celebrate: e.target.checked })} />
                  Let the church celebrate my birthday and anniversary
                </label>
                <div className="row gap-8">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setD({}); setEdit(false); }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            ) : (
              <dl className="dl">
                <dt>Birthday</dt><dd>{member.birthday ? fmtMonthDay(member.birthday) : <span className="muted">Not added</span>}</dd>
                <dt>Anniversary</dt><dd>{member.anniversary ? fmtMonthDay(member.anniversary) : <span className="muted">Not added</span>}</dd>
                <dt>Area</dt><dd>{member.area || <span className="muted">Not added</span>}</dd>
                <dt>Departments</dt><dd>{myDepts.length ? myDepts.map((x) => x.name).join(', ') : <Link to="/departments">Join a department</Link>}</dd>
                <dt>House fellowship</dt><dd>{myCell ? myCell.name : <Link to="/fellowships">Find one near you</Link>}</dd>
                <dt>Member since</dt><dd>{fmtDate(member.createdAt)}</dd>
              </dl>
            )}
          </section>

          <section className="card card-pad stack gap-12">
            <h2 style={{ fontSize: 18 }}>Notifications</h2>
            {!pushSupported() ? (
              <p className="small muted">This browser can’t show notifications. On iPhone, add CRCC to your home screen first, then open it from there.</p>
            ) : perm === 'granted' ? (
              <p className="small" style={{ color: 'var(--ok)' }}><Icon name="check" size={16} /> Notifications are on for this device.</p>
            ) : perm === 'denied' ? (
              <p className="small muted">Notifications are blocked. Turn them on in your browser or phone settings for this site.</p>
            ) : (
              <>
                <p className="small muted">Get alerts when a new sermon is uploaded, when we go live, and for event and pledge reminders.</p>
                <div>
                  <button className="btn btn-primary btn-sm" onClick={async () => setPerm((await enablePush(member.id)) === 'granted' ? 'granted' : pushPermission())}>
                    <Icon name="bell" size={16} /> Turn on notifications
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="stack gap-24">
          <section className="card card-pad stack gap-12">
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <h2 style={{ fontSize: 18 }}>My giving</h2>
              <span className="small muted">{thisYear}: <b style={{ color: 'var(--ink)' }}>{naira(yearTotal)}</b></span>
            </div>
            {ok.length ? (
              <div>
                {ok.slice(0, 8).map((g) => (
                  <div key={g.reference} className="media-row">
                    <div className="grow">
                      <div className="row-title" style={{ fontSize: 15 }}>{g.projectTitle || g.type}{g.recurring ? ' · monthly' : ''}</div>
                      <div className="row-meta">{fmtDate(g.createdAt)}{g.demo ? ' · practice' : ''}</div>
                    </div>
                    <b>{naira(g.amount)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">Your gifts will be listed here.</div>
            )}
            <div className="row gap-8 wrap">
              {years.map((y) => (
                <Link key={y} to={`/profile/statement?year=${y}`} className="btn btn-ghost btn-sm"><Icon name="file" size={16} /> {y} statement</Link>
              ))}
              <Link to="/pledges" className="btn btn-ghost btn-sm"><Icon name="target" size={16} /> My pledges</Link>
            </div>
          </section>

          <section className="card card-pad stack gap-8">
            <h2 style={{ fontSize: 18 }}>Account</h2>
            <p className="small muted">Signed in with {user?.provider === 'google' ? 'Google' : user?.provider === 'phone' ? 'phone number' : 'email and password'}.</p>
            <div className="row gap-8 wrap">
              <Link to="/counselling" className="btn btn-ghost btn-sm">My appointments</Link>
              <Link to="/shop?tab=orders" className="btn btn-ghost btn-sm">My orders</Link>
              <button className="btn btn-danger btn-sm" onClick={signOut}><Icon name="logout" size={16} /> Sign out</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export const fmtMonthDay = (md: string) => {
  const [m, d] = md.split('-').map(Number);
  return new Date(2024, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};

export function Statement() {
  const [params] = useSearchParams();
  const year = params.get('year') ?? String(new Date().getFullYear());
  useDocumentTitle(`Giving statement ${year}`);
  const { member } = useAuth();
  const { items } = useCollection('gifts', member ? { field: 'uid', op: '==', value: member.id } : null);
  const gifts = useMemo(
    () => items.filter((g) => g.status === 'success' && g.createdAt.startsWith(year)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [items, year],
  );
  const total = gifts.reduce((n, g) => n + g.amount, 0);
  const csv = () => {
    const rows = [['Date', 'Reference', 'For', 'Amount (NGN)'], ...gifts.map((g) => [fmtDate(g.createdAt), g.reference, g.projectTitle || g.type, String(g.amount)]), ['', '', 'Total', String(total)]];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `CRCC-giving-${year}.csv`;
    a.click();
  };
  if (!member) return null;
  return (
    <div className="container page page-narrow">
      <div className="no-print"><PageHead title={`${year} giving statement`} back="/profile" /></div>
      <div className="row gap-8 wrap no-print" style={{ marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Icon name="file" size={16} /> Print or save as PDF</button>
        <button className="btn btn-ghost btn-sm" onClick={csv}><Icon name="download" size={16} /> Download (Excel)</button>
      </div>
      <article className="statement">
        <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>{church.name}</h2>
            <p className="small muted">{church.address}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="eyebrow muted">Giving statement</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700 }}>{year}</div>
          </div>
        </header>
        <p style={{ margin: '20px 0' }}>
          <b>{member.name}</b><br />
          <span className="small muted">{[member.email, member.phone].filter(Boolean).join(' · ')}</span>
        </p>
        {gifts.length ? (
          <>
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="table">
                <thead><tr><th>Date</th><th>For</th><th>Reference</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {gifts.map((g) => (
                    <tr key={g.reference}>
                      <td>{fmtDate(g.createdAt)}</td>
                      <td>{g.projectTitle || g.type}{g.demo ? ' (practice)' : ''}</td>
                      <td className="tiny">{g.reference}</td>
                      <td className="num">{naira(g.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="stack gap-4" style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 320 }}>
              {sumBy(gifts).map(([k, n]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}><span className="muted small">{k}</span><span>{naira(n)}</span></div>
              ))}
              <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                <b>Total</b><b>{naira(total)}</b>
              </div>
            </div>
          </>
        ) : (
          <div className="empty">No gifts recorded for {year}.</div>
        )}
        <p className="tiny muted" style={{ marginTop: 24 }}>Online gifts made through the CRCC app. Generated {fmtDate(new Date().toISOString())}. God bless you for your faithful giving.</p>
      </article>
    </div>
  );
}

export function Notifications() {
  useDocumentTitle('Notifications');
  const { member } = useAuth();
  const { items, readAt } = useMyNotifications(member);
  const uid = member?.id;
  useEffect(() => {
    if (!uid) return;
    const t = setTimeout(() => markAllRead(uid), 1500);
    return () => clearTimeout(t);
  }, [uid]);
  return (
    <div className="container page page-narrow">
      <PageHead title="Notifications" />
      {items.length ? (
        <div className="stack gap-8">
          {items.map((n) => {
            const isNew = !readAt || n.createdAt > readAt;
            const inner = (
              <>
                <span className={`notif-dot ${isNew ? 'on' : ''}`} aria-hidden="true" />
                <div className="grow">
                  <div className="row-title">{n.title}</div>
                  <p className="small" style={{ marginTop: 2 }}>{n.body}</p>
                  <div className="row-meta">{new Date(n.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                {n.link && <Icon name="chevron" size={18} className="muted" />}
              </>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} className="notif">{inner}</Link>
            ) : (
              <div key={n.id} className="notif">{inner}</div>
            );
          })}
        </div>
      ) : (
        <div className="empty">Messages from the church will appear here.</div>
      )}
    </div>
  );
}
