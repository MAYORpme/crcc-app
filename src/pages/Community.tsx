import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal, PageHead, asset, useDocumentTitle, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { store, useCollection } from '../lib/store';
import { fmtDate, mapsLink } from '../lib/format';
import type { PrayerRequest } from '../types';

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)} d ago`;
  return fmtDate(iso);
};

// ── Prayer wall ─────────────────────────────────────────────
export function Prayer() {
  useDocumentTitle('Prayer wall');
  const { member } = useAuth();
  const toast = useToast();
  const uid = member?.id ?? '';
  const pub = useCollection('prayers', { field: 'visibility', op: '==', value: 'public' });
  const mine = useCollection('prayers', uid ? { field: 'uid', op: '==', value: uid } : null);
  const [tab, setTab] = useState<'wall' | 'answered' | 'mine'>('wall');
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'pastors'>('public');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const src = tab === 'mine' ? mine.items : pub.items.filter((p) => (tab === 'answered' ? p.status === 'answered' : p.status === 'open'));
    return [...src].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tab, pub.items, mine.items]);

  const pray = async (p: PrayerRequest) => {
    const has = p.prayedBy?.includes(uid);
    await store.atomic('prayers', p.id, { op: has ? 'arrayRemove' : 'arrayUnion', field: 'prayedBy', value: uid });
    if (!has) toast('Thank you for praying');
  };

  return (
    <div className="container page">
      <div className="row gap-12 wrap" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Prayer wall</h1>
          <p className="page-sub">“Pray one for another.” James 5:16</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> Share a request</button>
      </div>
      <div className="chips" role="group" aria-label="Show" style={{ marginBottom: 20 }}>
        {([['wall', 'Prayer wall'], ['answered', 'Answered'], ['mine', 'My requests']] as const).map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {list.length ? (
        <div className="card-grid">
          {list.map((p) => {
            const prayed = p.prayedBy?.includes(uid);
            const own = p.uid === uid;
            return (
              <article key={p.id} className={`prayer-card ${p.status === 'answered' ? 'answered' : ''}`}>
                <div className="row gap-8 tiny muted" style={{ justifyContent: 'space-between' }}>
                  <span>{p.anonymous ? 'Anonymous' : p.name} · {ago(p.createdAt)}</span>
                  {p.visibility === 'pastors' && <span className="pill"><Icon name="lock" size={12} /> Pastors only</span>}
                  {p.status === 'answered' && <span className="pill on">Answered</span>}
                </div>
                <p style={{ margin: '10px 0 14px', whiteSpace: 'pre-line' }}>{p.text}</p>
                <div className="row gap-8 wrap">
                  {p.visibility === 'public' && (
                    <button className={`btn btn-sm ${prayed ? 'btn-primary' : 'btn-ghost'}`} onClick={() => pray(p)} aria-pressed={prayed}>
                      <Icon name="hands" size={16} /> {prayed ? 'Prayed' : 'I prayed'} · {p.prayedBy?.length ?? 0}
                    </button>
                  )}
                  {own && p.status === 'open' && (
                    <button className="btn btn-ghost btn-sm" onClick={async () => { await store.set('prayers', p.id, { status: 'answered' }); toast('Praise God! Marked as answered.'); }}>
                      <Icon name="check" size={16} /> Mark answered
                    </button>
                  )}
                  {own && (
                    <button className="btn btn-ghost btn-sm" onClick={async () => { await store.remove('prayers', p.id); toast('Request removed'); }}>
                      Remove
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">{tab === 'mine' ? 'Requests you share will appear here.' : tab === 'answered' ? 'Answered prayers will be celebrated here.' : 'No requests yet. Be the first to share.'}</div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Share a prayer request">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (text.trim().length < 5 || !member) return;
            setBusy(true);
            await store.add('prayers', { uid, name: member.name, text: text.trim().slice(0, 1500), visibility, anonymous, prayedBy: [], status: 'open', createdAt: new Date().toISOString() });
            setBusy(false);
            setText('');
            setOpen(false);
            setTab(visibility === 'public' ? 'wall' : 'mine');
            toast(visibility === 'public' ? 'Shared on the prayer wall' : 'Sent to the pastors');
          }}
        >
          <div className="field">
            <label htmlFor="pr-text">Your request</label>
            <textarea id="pr-text" className="textarea" maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="seg" role="radiogroup" aria-label="Who can see it" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button type="button" aria-pressed={visibility === 'public'} onClick={() => setVisibility('public')}>Prayer wall</button>
            <button type="button" aria-pressed={visibility === 'pastors'} onClick={() => setVisibility('pastors')}>Pastors only</button>
          </div>
          <p className="hint">{visibility === 'public' ? 'Members can see it and pray with you.' : 'Only the pastoral team will see it.'}</p>
          {visibility === 'public' && (
            <label className="switch"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Hide my name</label>
          )}
          <button className="btn btn-primary" disabled={busy || text.trim().length < 5}>{busy ? 'Sending…' : 'Send request'}</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Testimonies ─────────────────────────────────────────────
export function Testimonies() {
  useDocumentTitle('Testimonies');
  const { member } = useAuth();
  const toast = useToast();
  const approved = useCollection('testimonies', { field: 'status', op: '==', value: 'approved' });
  const mine = useCollection('testimonies', member ? { field: 'uid', op: '==', value: member.id } : null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const pending = mine.items.filter((t) => t.status === 'pending');
  const list = [...approved.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="container page">
      <div className="row gap-12 wrap" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Testimonies</h1>
          <p className="page-sub">“They overcame by the blood of the Lamb, and by the word of their testimony.” Revelation 12:11</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> Share a testimony</button>
      </div>
      {pending.length > 0 && (
        <div className="demo-ribbon" style={{ borderRadius: 12, textAlign: 'left', marginBottom: 16 }}>
          {pending.length === 1 ? 'Your testimony is' : `${pending.length} of your testimonies are`} waiting for a pastor to review before it appears here.
        </div>
      )}
      {list.length ? (
        <div className="card-grid">
          {list.map((t) => (
            <article key={t.id} className="card card-pad stack gap-8">
              <h2 style={{ fontSize: 18 }}>{t.title}</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{t.text}</p>
              <p className="tiny muted">{t.name} · {fmtDate(t.createdAt)}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">Approved testimonies will appear here.</div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Share your testimony">
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!member || title.trim().length < 3 || text.trim().length < 20) return toast('Add a title and tell us a little more.');
            await store.add('testimonies', { uid: member.id, name: member.name, title: title.trim().slice(0, 120), text: text.trim().slice(0, 4000), status: 'pending', createdAt: new Date().toISOString() });
            setTitle('');
            setText('');
            setOpen(false);
            toast('Thank you! A pastor will review it shortly.');
          }}
        >
          <div className="field">
            <label htmlFor="t-title">Title</label>
            <input id="t-title" className="input" placeholder="e.g. God healed my son" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-text">What did God do?</label>
            <textarea id="t-text" className="textarea" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <p className="hint">A pastor reviews each testimony before it’s shared with the church.</p>
          <button className="btn btn-primary">Send testimony</button>
        </form>
      </Modal>
    </div>
  );
}

// ── Departments ─────────────────────────────────────────────
export function Departments() {
  useDocumentTitle('Departments');
  const { member } = useAuth();
  const { items } = useCollection('departments');
  const list = [...items].sort((a, b) => a.order - b.order);
  return (
    <div className="container page">
      <PageHead title="Departments & units" sub="Serve with your gifts. Join a department to get its updates." />
      <div className="card-grid">
        {list.map((d) => {
          const joined = member?.departments?.includes(d.id);
          return (
            <Link key={d.id} to={`/departments/${d.id}`} className="dept-card">
              {d.image ? <img src={asset(d.image)} alt="" /> : <span className="dept-ic"><Icon name="users" size={26} /></span>}
              <div className="grow">
                <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                  <span className="row-title">{d.name}</span>
                  {joined && <span className="pill on">Joined</span>}
                </div>
                <p className="small muted" style={{ marginTop: 4 }}>{d.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DepartmentPage() {
  const { id = '' } = useParams();
  const { member } = useAuth();
  const toast = useToast();
  const { items } = useCollection('departments');
  const { items: posts } = useCollection('deptPosts', { field: 'deptId', op: '==', value: id });
  const d = items.find((x) => x.id === id);
  useDocumentTitle(d?.name ?? 'Department');
  if (!d) return <div className="container page"><PageHead title="Department" back="/departments" /><div className="empty">Loading…</div></div>;
  const joined = member?.departments?.includes(d.id);
  return (
    <div className="container page page-narrow">
      <PageHead title={d.name} back="/departments" />
      <div className="stack gap-24">
        {d.image && <img className="event-banner" src={asset(d.image)} alt="" />}
        <p className="prose">{d.description}</p>
        <div className="soft card-pad stack gap-8">
          {d.leader && <div className="row gap-12"><Icon name="user" size={20} className="muted" /><span>Leader: {d.leader}</span></div>}
          {d.meets && <div className="row gap-12"><Icon name="clock" size={20} className="muted" /><span>{d.meets}</span></div>}
          <div>
            <button
              className={`btn btn-sm ${joined ? 'btn-ghost' : 'btn-primary'}`}
              onClick={async () => {
                if (!member) return;
                await store.atomic('members', member.id, { op: joined ? 'arrayRemove' : 'arrayUnion', field: 'departments', value: d.id });
                toast(joined ? `You left ${d.name}` : `Welcome to ${d.name}!`);
              }}
            >
              {joined ? 'Leave department' : 'Join this department'}
            </button>
          </div>
        </div>
        <section className="section">
          <h2 style={{ fontSize: 19 }}>Updates</h2>
          {posts.length ? (
            [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => (
              <div key={p.id} className="card card-pad">
                <p style={{ whiteSpace: 'pre-line' }}>{p.text}</p>
                <p className="tiny muted" style={{ marginTop: 6 }}>{p.author} · {fmtDate(p.createdAt)}</p>
              </div>
            ))
          ) : (
            <div className="empty">No updates yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── House fellowships ───────────────────────────────────────
export function Fellowships() {
  useDocumentTitle('House fellowships');
  const { member, saveProfile } = useAuth();
  const toast = useToast();
  const { items } = useCollection('cells');
  const [q, setQ] = useState('');
  const list = items
    .filter((c) => !q.trim() || `${c.name} ${c.area} ${c.address}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.id === member?.cellId ? -1 : b.id === member?.cellId ? 1 : a.area.localeCompare(b.area)));
  return (
    <div className="container page">
      <PageHead title="House fellowships" sub="Meet with members near you during the week." />
      <label className="search" style={{ marginBottom: 20 }}>
        <Icon name="search" size={20} />
        <span className="sr-only">Search by area</span>
        <input type="search" placeholder="Search by area, e.g. Moniya" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {list.length ? (
        <div className="card-grid">
          {list.map((c) => {
            const mine = member?.cellId === c.id;
            return (
              <article key={c.id} className="card card-pad stack gap-8">
                <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 18 }}>{c.name}</h2>
                  {mine && <span className="pill on">My fellowship</span>}
                </div>
                <div className="small stack gap-4">
                  <span className="row gap-8"><Icon name="pin" size={16} className="muted" /> {c.area} · {c.address}</span>
                  <span className="row gap-8"><Icon name="clock" size={16} className="muted" /> {c.meets}</span>
                  <span className="row gap-8"><Icon name="user" size={16} className="muted" /> {c.host}{c.phone ? ` · ${c.phone}` : ''}</span>
                </div>
                <div className="row gap-8 wrap" style={{ marginTop: 4 }}>
                  <a className="btn btn-ghost btn-sm" href={mapsLink(c.mapsQuery || `${c.address} ${c.area} Ibadan`)} target="_blank" rel="noreferrer"><Icon name="pin" size={16} /> Directions</a>
                  {!mine && (
                    <button className="btn btn-primary btn-sm" onClick={async () => { await saveProfile({ cellId: c.id }); toast(`${c.name} saved as your fellowship`); }}>
                      This is my fellowship
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">No fellowship found for “{q}”. Ask the church office about starting one in your area.</div>
      )}
    </div>
  );
}

// ── Gallery ─────────────────────────────────────────────────
export function Gallery() {
  useDocumentTitle('Gallery');
  const { items } = useCollection('albums');
  const list = [...items].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="container page">
      <PageHead title="Gallery" sub="Moments from services and events." />
      {list.length ? (
        <div className="album-grid">
          {list.map((a) => (
            <Link key={a.id} to={`/gallery/${a.id}`} className="album">
              <img src={asset(a.cover || a.photos[0])} alt="" loading="lazy" />
              <div className="album-meta">
                <span className="row-title" style={{ color: '#fff' }}>{a.title}</span>
                <span className="tiny" style={{ color: '#dbe7f5' }}>{fmtDate(a.date)} · {a.photos.length} photos</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">Photo albums will appear here.</div>
      )}
    </div>
  );
}

export function AlbumPage() {
  const { id } = useParams();
  const { items } = useCollection('albums');
  const a = items.find((x) => x.id === id);
  const [idx, setIdx] = useState<number | null>(null);
  useDocumentTitle(a?.title ?? 'Album');
  useEffect(() => {
    if (idx === null || !a) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx((i) => (i === null ? i : (i + 1) % a.photos.length));
      if (e.key === 'ArrowLeft') setIdx((i) => (i === null ? i : (i - 1 + a.photos.length) % a.photos.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, a]);
  if (!a) return <div className="container page"><PageHead title="Album" back="/gallery" /><div className="empty">Loading…</div></div>;
  return (
    <div className="container page">
      <PageHead title={a.title} sub={`${fmtDate(a.date)} · ${a.photos.length} photos`} back="/gallery" />
      <div className="photo-grid">
        {a.photos.map((p, i) => (
          <button key={p + i} onClick={() => setIdx(i)} aria-label={`Open photo ${i + 1}`}>
            <img src={asset(p)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <Modal open={idx !== null} onClose={() => setIdx(null)} title={`Photo ${(idx ?? 0) + 1} of ${a.photos.length}`}>
        {idx !== null && (
          <div className="stack gap-12">
            <img src={asset(a.photos[idx])} alt="" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, background: '#000' }} />
            <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setIdx((idx - 1 + a.photos.length) % a.photos.length)}><Icon name="back" size={16} /> Previous</button>
              <a className="btn btn-ghost btn-sm" href={asset(a.photos[idx])} target="_blank" rel="noreferrer" download>Save</a>
              <button className="btn btn-ghost btn-sm" onClick={() => setIdx((idx + 1) % a.photos.length)}>Next <Icon name="chevron" size={16} /></button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
