import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { DateBox, PageHead, asset, useDocumentTitle } from '../components/ui';
import { store, useCollection } from '../lib/store';
import { downloadIcs, fmtDate, fmtLong, isUpcoming, mapsLink } from '../lib/format';
import { useAuth } from '../lib/auth';

export default function Events() {
  useDocumentTitle('Events');
  const { items, loading } = useCollection('events');
  const upcoming = items.filter((e) => isUpcoming(e.date)).sort((a, b) => a.date.localeCompare(b.date));
  const past = items.filter((e) => !isUpcoming(e.date)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return (
    <div className="container page">
      <PageHead title="Events" sub="Services, vigils, conventions and celebrations at CRCC." />
      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <div className="stack gap-32">
          <div className="events-grid">
            {upcoming.length ? (
              upcoming.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="event-card">
                  <DateBox date={e.date} />
                  <div className="grow">
                    <div className="row-title">{e.title}</div>
                    <div className="row-meta">{[fmtLong(e.date), e.time].filter(Boolean).join(' · ')}</div>
                  </div>
                  {e.registration && <span className="tag">Register</span>}
                </Link>
              ))
            ) : (
              <div className="empty">New events will be posted here.</div>
            )}
          </div>
          {past.length > 0 && (
            <section className="section">
              <h2 style={{ fontSize: 19 }}>Past events</h2>
              <div>
                {past.map((e) => (
                  <Link key={e.id} to={`/events/${e.id}`} className="media-row">
                    <div className="grow">
                      <div className="row-title">{e.title}</div>
                      <div className="row-meta">{fmtDate(e.date)}</div>
                    </div>
                    <Icon name="chevron" size={18} className="muted" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function EventDetail() {
  const { id } = useParams();
  const { items, loading } = useCollection('events');
  const e = items.find((x) => x.id === id);
  useDocumentTitle(e?.title ?? 'Event');
  const { member } = useAuth();
  const [form, setForm] = useState({ name: member?.name ?? '', phone: member?.phone ?? '', email: member?.email ?? '', people: 1 });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="container page"><div className="empty">Loading…</div></div>;
  if (!e)
    return (
      <div className="container page">
        <PageHead title="Event not found" back="/events" />
      </div>
    );

  const register = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr('');
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10) return setErr('Enter your name and a valid phone number.');
    setBusy(true);
    try {
      await store.add('registrations', {
        id: member ? `${e.id}_${member.id}` : undefined,
        uid: member?.id,
        eventId: e.id,
        eventTitle: e.title,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        people: Math.max(1, form.people),
        createdAt: new Date().toISOString(),
      });
      setDone(true);
    } catch {
      setErr('Could not register right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page page-narrow">
      <PageHead title={e.title} back="/events" />
      <div className="stack gap-24">
        {e.image && <img className="event-banner" src={asset(e.image)} alt="" />}
        <div className="soft card-pad stack gap-12">
          <div className="row gap-12"><Icon name="calendar" size={20} className="muted" /><span>{fmtLong(e.date)}{e.endDate ? ` – ${fmtLong(e.endDate)}` : ''}</span></div>
          {e.time && <div className="row gap-12"><Icon name="clock" size={20} className="muted" /><span>{e.time}</span></div>}
          {e.venue && (
            <div className="row gap-12">
              <Icon name="pin" size={20} className="muted" />
              <span>{e.venue} · <a href={mapsLink(e.venue)} target="_blank" rel="noreferrer">Directions</a></span>
            </div>
          )}
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => downloadIcs(e)}>
              <Icon name="plus" size={18} /> Add to calendar
            </button>
          </div>
        </div>
        {e.description && <p className="prose">{e.description}</p>}

        {e.registration && isUpcoming(e.date) && (
          <section className="card card-pad stack gap-16">
            <h2 style={{ fontSize: 20 }}>Register</h2>
            {done ? (
              <div className="stack gap-8 center">
                <div className="success-ic"><Icon name="check" size={30} /></div>
                <p><b>You’re registered.</b> We look forward to seeing you.</p>
              </div>
            ) : (
              <form className="form-grid" onSubmit={register} noValidate>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="r-name">Full name</label>
                    <input id="r-name" className="input" autoComplete="name" value={form.name} onChange={(x) => setForm({ ...form, name: x.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="r-phone">Phone</label>
                    <input id="r-phone" className="input" type="tel" autoComplete="tel" value={form.phone} onChange={(x) => setForm({ ...form, phone: x.target.value })} />
                  </div>
                </div>
                <div className="form-grid two">
                  <div className="field">
                    <label htmlFor="r-email">Email (optional)</label>
                    <input id="r-email" className="input" type="email" autoComplete="email" value={form.email} onChange={(x) => setForm({ ...form, email: x.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="r-people">How many people?</label>
                    <input id="r-people" className="input" type="number" min={1} max={20} value={form.people} onChange={(x) => setForm({ ...form, people: +x.target.value })} />
                  </div>
                </div>
                {err && <p className="error-text" role="alert">{err}</p>}
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
