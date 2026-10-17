import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SermonRow } from '../components/SermonRow';
import { DateBox, Progress, SmartLink, asset, useDocumentTitle } from '../components/ui';
import { church } from '../config';
import { useCollection, useSettings } from '../lib/store';
import { fmtDate, greeting, isUpcoming, mapsLink, naira, notExpired, todayISO } from '../lib/format';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Layout';
import type { Celebrant } from '../types';
import type { Advert, Project } from '../types';

function AdvertCard({ ad, project }: { ad: Advert; project?: Project }) {
  return (
    <div className={`advert ${ad.image ? 'has-img' : ''}`}>
      {ad.image ? <img className="ad-img" src={asset(ad.image)} alt="" /> : <div className="ring" />}
      <span className="eyebrow" style={{ opacity: 0.85 }}>{ad.label}</span>
      <h3>{ad.title}</h3>
      {project ? (
        <div className="on-blue stack gap-8" style={{ maxWidth: 420 }}>
          <Progress value={(project.raised / project.target) * 100} label={`${project.title} progress`} />
          <span className="small">{naira(project.raised)} raised of {naira(project.target)}</span>
        </div>
      ) : (
        ad.subtitle && <p>{ad.subtitle}</p>
      )}
      {ad.link && (
        <SmartLink to={ad.link} className="btn btn-white btn-sm">
          {ad.cta || 'Learn more'}
        </SmartLink>
      )}
    </div>
  );
}

function Adverts() {
  const { items } = useCollection('adverts');
  const { items: projects } = useCollection('projects');
  const ads = items.filter((a) => a.active && notExpired(a.endsAt)).sort((a, b) => a.order - b.order);
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [perView, setPerView] = useState(1);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const child = el.firstElementChild as HTMLElement | null;
      if (!child) return;
      setIdx(Math.round(el.scrollLeft / (child.offsetWidth + 16 * (perView - 1 ? 1 : 0))));
    };
    const onResize = () => setPerView(window.innerWidth >= 900 ? 2 : 1);
    onResize();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [perView]);

  // gentle auto-advance on phones
  useEffect(() => {
    if (ads.length < 2 || perView > 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      const el = track.current;
      if (!el) return;
      const next = (idx + 1) % ads.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 6000);
    return () => clearInterval(t);
  }, [idx, ads.length, perView]);

  if (!ads.length) return null;
  const pages = Math.max(1, ads.length - perView + 1);
  const projectFor = (ad: Advert) => {
    const m = ad.link?.match(/project=([\w-]+)/);
    return m ? projects.find((p) => p.id === m[1]) : undefined;
  };
  return (
    <section className="section" aria-label="Notices and adverts">
      <div className="carousel" ref={track}>
        {ads.map((ad) => (
          <AdvertCard key={ad.id} ad={ad} project={projectFor(ad)} />
        ))}
      </div>
      {pages > 1 && (
        <div className="dots">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              aria-label={`Show advert ${i + 1}`}
              aria-current={i === Math.min(idx, pages - 1)}
              onClick={() => {
                const el = track.current!;
                const child = el.firstElementChild as HTMLElement;
                el.scrollTo({ left: i * (child.offsetWidth + (perView > 1 ? 16 : 0)), behavior: 'smooth' });
              }}
            >
              <span />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Days from today until the next MM-DD (0 = today). */
function daysUntil(mmdd: string) {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [m, d] = mmdd.split('-').map(Number);
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < t) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - t.getTime()) / 864e5);
}

function Celebrations() {
  const { items } = useCollection('celebrants');
  const list = items
    .flatMap((c: Celebrant) => [
      c.birthday ? { c, kind: 'Birthday', days: daysUntil(c.birthday) } : null,
      c.anniversary ? { c, kind: 'Wedding anniversary', days: daysUntil(c.anniversary) } : null,
    ])
    .filter((x): x is { c: Celebrant; kind: string; days: number } => Boolean(x) && x!.days <= 7)
    .sort((a, b) => a.days - b.days);
  if (!list.length) return null;
  return (
    <section className="card card-pad stack gap-12">
      <div className="row gap-8"><span className="o2" style={{ background: 'var(--cream)', color: 'var(--orange-text)' }}><Icon name="cake" size={22} /></span><h2 style={{ fontSize: 18 }}>Celebrating this week</h2></div>
      {list.slice(0, 6).map(({ c, kind, days }) => (
        <div key={c.id + kind} className="row gap-12">
          <Avatar name={c.name} photo={c.photo} size={40} />
          <div className="grow">
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div className="tiny muted">{kind} · {days === 0 ? 'today!' : days === 1 ? 'tomorrow' : `in ${days} days`}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function PledgeReminder() {
  const { member } = useAuth();
  const { items } = useCollection('pledges', member ? { field: 'uid', op: '==', value: member.id } : null);
  const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const due = items.filter((p) => p.paid < p.amount && p.dueDate <= soon).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  if (!due) return null;
  return (
    <Link to="/pledges" className="card card-pad stack gap-8" style={{ textDecoration: 'none', color: 'inherit', borderColor: 'var(--orange)' }}>
      <span className="eyebrow" style={{ color: 'var(--orange-text)' }}>Pledge reminder</span>
      <b>{due.title}</b>
      <Progress value={(due.paid / due.amount) * 100} label="Pledge progress" />
      <span className="small muted">{naira(due.amount - due.paid)} left · due {fmtDate(due.dueDate)}</span>
    </Link>
  );
}

function TodayDevotional() {
  const { items } = useCollection('devotionals');
  const t = todayISO();
  const d = items.filter((x) => x.date <= t).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!d) return null;
  return (
    <Link to="/devotional" className="dev-card">
      <span className="eyebrow" style={{ opacity: 0.85 }}>{d.date === t ? 'Today’s devotional' : 'Latest devotional'}</span>
      <h2>{d.title}</h2>
      <p>“{d.verseText.length > 140 ? d.verseText.slice(0, 140).trim() + '…' : d.verseText}”</p>
      <span className="small" style={{ fontWeight: 700 }}>{d.scripture} · Read more →</span>
    </Link>
  );
}

export default function Home() {
  useDocumentTitle('');
  const settings = useSettings();
  const { member } = useAuth();
  const first = member?.name.split(' ')[0] ?? '';
  const { items: sermons } = useCollection('sermons');
  const { items: events } = useCollection('events');
  const { items: lessons } = useCollection('lessons');

  const latest = [...sermons].sort((a, b) => b.date.localeCompare(a.date));
  const top = latest[0];
  const upcoming = events.filter((e) => isUpcoming(e.date)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const lesson = [...lessons].filter((l) => isUpcoming(l.date)).sort((a, b) => a.date.localeCompare(b.date))[0] ?? [...lessons].sort((a, b) => b.date.localeCompare(a.date))[0];

  const live = settings.isLive;
  const heroLink = live ? '/live' : top ? `/sermons/${top.id}` : '/sermons';

  return (
    <>
      <div className="welcome-band">
        <div className="container home-hero">
          <div className="stack gap-16">
            <div>
              <p className="muted" style={{ fontWeight: 500 }}>{greeting()}{first ? `, ${first}` : ''}. Welcome to</p>
              <h1>
                Christ The Renewal <span style={{ color: 'var(--blue)' }}>Christian Church</span>
              </h1>
              <p className="lead">
                A family where lives are renewed and transformed by the Word of God. Join us this Sunday in Olode, Ibadan, or catch up on any
                message, anywhere.
              </p>
            </div>
            <div className="row gap-12 wrap">
              <Link to="/devotional" className="btn btn-primary">
                <Icon name="sun" size={18} /> Today’s devotional
              </Link>
              <Link to="/sermons" className="btn btn-ghost">
                <Icon name="headphones" size={18} /> Listen to sermons
              </Link>
            </div>
          </div>

          <Link to={heroLink} className="hero" aria-label={live ? 'Watch the service live' : 'Latest message'}>
            <img src={asset(live ? '/images/minister1.jpg' : top?.image || '/images/minister1.jpg')} alt="" />
            {live ? <span className="tag tag-orange tag-live">LIVE NOW</span> : <span className="tag" style={{ background: 'rgba(255,255,255,.92)' }}>LATEST MESSAGE</span>}
            <div className="hero-body">
              <div>
                <div className="small" style={{ opacity: 0.9 }}>{live ? settings.liveTitle : top ? fmtDate(top.date) : 'Sermons'}</div>
                <h2>{live ? 'Watch the service live' : top?.title ?? 'Catch up on recent messages'}</h2>
              </div>
              <span className="hero-play">
                <Icon name="play" size={22} />
              </span>
            </div>
          </Link>
        </div>
      </div>

      <div className="container page" style={{ paddingTop: 20 }}>
        <div className="stack gap-32">
          <nav className="quick" aria-label="Quick actions">
            <Link to="/give"><span className="q-ic"><Icon name="heart" /></span>Give</Link>
            <Link to="/bible"><span className="q-ic"><Icon name="book" /></span>Bible</Link>
            <Link to="/prayer"><span className="q-ic"><Icon name="hands" /></span>Prayer</Link>
            <Link to="/checkin"><span className="q-ic"><Icon name="qr" /></span>Check in</Link>
          </nav>

          <Adverts />

          <div className="home-grid">
            <section className="section">
              <div className="section-head">
                <h2>Recent messages</h2>
                <Link to="/sermons">See all</Link>
              </div>
              <div>
                {latest.slice(0, 4).map((s) => (
                  <SermonRow key={s.id} s={s} />
                ))}
              </div>
            </section>

            <div className="stack gap-24">
              <TodayDevotional />
              <PledgeReminder />
              <Celebrations />
              <section className="section">
                <div className="section-head">
                  <h2>Coming up</h2>
                  <Link to="/events">All events</Link>
                </div>
                {upcoming.length ? (
                  upcoming.map((e) => (
                    <Link key={e.id} to={`/events/${e.id}`} className="event-card">
                      <DateBox date={e.date} />
                      <div className="grow">
                        <div className="row-title">{e.title}</div>
                        <div className="row-meta">{e.time || fmtDate(e.date)}</div>
                      </div>
                      <Icon name="chevron" size={18} className="muted" />
                    </Link>
                  ))
                ) : (
                  <div className="empty">No upcoming events yet.</div>
                )}
              </section>

              {lesson && (
                <Link to="/oxygen" className="card card-pad stack gap-8" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="row gap-12">
                    <span className="o2">O₂</span>
                    <div>
                      <div className="eyebrow" style={{ color: 'var(--blue)' }}>Oxygen Class · {fmtDate(lesson.date, { day: 'numeric', month: 'short' })}</div>
                      <div className="row-title" style={{ fontSize: 17 }}>{lesson.topic}</div>
                    </div>
                  </div>
                  <p className="small muted">
                    Memory verse: {lesson.memoryRef}. Read the lesson before Sunday.
                  </p>
                </Link>
              )}
            </div>
          </div>

          <section className="visit-band">
            <div className="stack gap-8">
              <span className="eyebrow" style={{ opacity: 0.85 }}>Visit us</span>
              <h2 style={{ fontSize: 24 }}>{church.address}</h2>
              <p style={{ opacity: 0.9 }}>{settings.serviceTimes.map((t) => t.label).join(' · ')}</p>
            </div>
            <div className="row gap-12 wrap">
              <a href={mapsLink(church.mapsQuery)} target="_blank" rel="noreferrer" className="btn btn-white">
                <Icon name="pin" size={18} /> Directions
              </a>
              <Link to="/fellowships" className="btn btn-outline-white">
                House fellowships
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
