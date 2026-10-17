import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { InstallHelp, InstallPrompt, useInstall } from './InstallPrompt';
import { SmartLink, asset, useToast } from './ui';
import { church, isDemo } from '../config';
import { useCollection, useSettings } from '../lib/store';
import { clock, usePlayer } from '../lib/player';
import { mapsLink, notExpired } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useMyNotifications, useNewNotificationAlert } from '../lib/push';
import type { AppNotification } from '../types';

const TOP_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/sermons', label: 'Sermons' },
  { to: '/devotional', label: 'Devotional' },
  { to: '/oxygen', label: 'Oxygen Class' },
  { to: '/events', label: 'Events' },
  { to: '/more', label: 'More' },
];

const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/sermons', label: 'Sermons', icon: 'headphones' },
  { to: '/give', label: 'Give', icon: 'heart' },
  { to: '/devotional', label: 'Devotional', icon: 'sun' },
  { to: '/more', label: 'More', icon: 'grid' },
];

function AnnouncementBar() {
  const { items } = useCollection('announcements');
  const list = items.filter((a) => a.active && notExpired(a.endsAt)).sort((a, b) => a.order - b.order);
  if (!list.length) return null;
  const run = [...list, ...list];
  const dur = Math.max(18, list.reduce((n, a) => n + a.text.length, 0) / 4);
  return (
    <div className="ann-bar" role="region" aria-label="Announcements">
      <div className="container ann-inner">
        <span className="ann-tag">NOTICE</span>
        <div className="ann-track">
          <div className="ann-marquee" style={{ ['--dur' as string]: `${dur}s` }}>
            {run.map((a, i) =>
              a.link ? (
                <SmartLink key={i} to={a.link}>{a.text}</SmartLink>
              ) : (
                <span key={i} aria-hidden={i >= list.length}>{a.text}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPlayer() {
  const p = usePlayer();
  if (!p.current) return null;
  return (
    <div className="mini-player" role="region" aria-label="Now playing">
      <img src={asset(p.current.image || '/icons/icon-192.png')} alt="" />
      <div className="grow">
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.current.title}</div>
        <div className="row gap-8 tiny" style={{ color: '#c9d1dc' }}>
          <span>{clock(p.time)}</span>
          <input type="range" min={0} max={p.duration || 0} step={1} value={p.time} onChange={(e) => p.seek(+e.target.value)} aria-label="Seek" />
          <span>{clock(p.duration)}</span>
        </div>
      </div>
      <button className="round-btn" onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'}>
        <Icon name={p.playing ? 'pause' : 'play'} size={18} />
      </button>
      <button className="x" onClick={p.close} aria-label="Close player">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return photo ? (
    <img src={asset(photo)} alt="" className="avatar" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">{initials || '•'}</span>
  );
}

function Footer() {
  const s = useSettings();
  const [help, setHelp] = useState(false);
  const { installed } = useInstall();
  const { isAdmin } = useAuth();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack gap-12">
            <img src={asset('/images/logo-white.png')} alt="CRCC — Transforming Lives" />
            <p style={{ maxWidth: 320 }}>{church.name}. Renewing and transforming lives and nations. {church.scripture}.</p>
          </div>
          <div>
            <h3>Visit</h3>
            <ul>
              <li>{church.address}</li>
              <li><a href={mapsLink(church.mapsQuery)} target="_blank" rel="noreferrer">Get directions</a></li>
            </ul>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li><Link to="/give">Give</Link></li>
              <li><Link to="/bible">Bible</Link></li>
              <li><Link to="/prayer">Prayer wall</Link></li>
              <li><Link to="/shop">Bookshop</Link></li>
              <li><Link to="/about">About CRCC</Link></li>
            </ul>
          </div>
          <div>
            <h3>Connect</h3>
            <ul>
              {s.phone && <li><a href={`tel:${s.phone}`}>{s.phone}</a></li>}
              {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
              {s.youtube && <li><a href={s.youtube} target="_blank" rel="noreferrer">YouTube</a></li>}
              {s.facebook && <li><a href={s.facebook} target="_blank" rel="noreferrer">Facebook</a></li>}
              {s.instagram && <li><a href={s.instagram} target="_blank" rel="noreferrer">Instagram</a></li>}
              {!installed && (
                <li>
                  <button onClick={() => setHelp(true)} className="footer-link-btn">Add CRCC to your home screen</button>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {church.name}</span>
          {isAdmin && <Link to="/admin" style={{ color: '#a9bfd8' }}>Church admin</Link>}
        </div>
      </div>
      <InstallHelp open={help} onClose={() => setHelp(false)} />
    </footer>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const player = usePlayer();
  const { member } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { items, unread } = useMyNotifications(member);
  const onNew = useCallback((n: AppNotification) => toast(`${n.title}: ${n.body}`), [toast]);
  useNewNotificationAlert(items, onNew);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Open the page a push notification points to (service worker navigation)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'navigate' && typeof e.data.url === 'string') navigate(e.data.url);
    };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, [navigate]);

  return (
    <>
      {isDemo && <div className="demo-ribbon">Demo preview · sample content, practice payments, no money is charged</div>}
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand" aria-label="CRCC home">
            <img src={asset('/images/logo.png')} alt="CRCC — Transforming Lives" />
          </Link>
          <nav className="topnav" aria-label="Main">
            {TOP_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-actions">
            <Link to="/notifications" className="icon-btn" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
              <Icon name="bell" size={20} />
              {unread > 0 && <span className="badge-count">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link to="/give" className="btn btn-give btn-sm hide-sm">Give</Link>
            <Link to="/profile" className="avatar-link" aria-label="My profile">
              <Avatar name={member?.name ?? ''} photo={member?.photo} size={40} />
            </Link>
          </div>
        </div>
      </header>
      <AnnouncementBar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <nav className="bottom-nav" aria-label="Main">
        {BOTTOM_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `${isActive ? 'active' : ''} ${n.to === '/give' ? 'give-tab' : ''}`}>
            <Icon name={n.icon} size={22} className="ic" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <MiniPlayer />
      {!player.current && <InstallPrompt />}
    </>
  );
}
