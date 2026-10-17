export const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');

export const nairaShort = (n: number) => {
  if (n >= 1_000_000) return '₦' + +(n / 1_000_000).toFixed(1) + 'm';
  if (n >= 1_000) return '₦' + +(n / 1_000).toFixed(1) + 'k';
  return naira(n);
};

const asDate = (d: string) => new Date(d.length === 10 ? d + 'T12:00:00' : d);

export const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? asDate(d).toLocaleDateString('en-GB', opts) : '';

export const fmtLong = (d: string) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const dayMonth = (d: string) => {
  const x = asDate(d);
  return { day: x.getDate(), month: x.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() };
};

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isUpcoming = (d: string) => d >= todayISO();
export const notExpired = (endsAt?: string) => !endsAt || endsAt >= todayISO();

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Pull the video id out of any common YouTube link. */
export function youTubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/live\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export const youTubeEmbed = (url?: string) => {
  const id = youTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
};

/** Build and download an .ics file so members can add an event to their calendar. */
export function downloadIcs(ev: { id: string; title: string; date: string; description?: string; venue?: string }) {
  const d = ev.date.replace(/-/g, '');
  const next = asDate(ev.date);
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, '');
  const esc = (s = '') => s.replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRCC//Events//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@crcc`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(ev.description)}`,
    `LOCATION:${esc(ev.venue)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = ev.title.replace(/\W+/g, '-') + '.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const whatsappLink = (n: string, text = '') =>
  `https://wa.me/${n.replace(/\D/g, '').replace(/^0/, '234')}${text ? '?text=' + encodeURIComponent(text) : ''}`;

export const safeLocal = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};

/** Progress label that never shows 0% once something has been given. */
export const pctLabel = (raised: number, target: number) => {
  if (!target) return '0%';
  const v = (raised / target) * 100;
  return v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%`;
};
