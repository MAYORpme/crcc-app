const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  heart: 'M12 20s-7-4.4-9-8.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 4.4C19 15.6 12 20 12 20z',
  headphones: 'M4 18v-6a8 8 0 0 1 16 0v6|M3 14h4v7H4.5A1.5 1.5 0 0 1 3 19.5z|M17 14h4v5.5a1.5 1.5 0 0 1-1.5 1.5H17z',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z|M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 11v6|M12 7.5v.01',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z|M12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z|M4 10h16|M8 3v4|M16 3v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3 2',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z|M10 20.5a2 2 0 0 0 4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M20 20l-3.5-3.5',
  download: 'M12 4v11|M7 10l5 5 5-5|M5 20h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12|M18 6 6 18',
  menu: 'M4 7h16|M4 12h16|M4 17h16',
  share: 'M12 15V3|M8 7l4-4 4 4|M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12',
  plus: 'M12 5v14|M5 12h14',
  lock: 'M5 11h14v10H5z|M8 11V8a4 4 0 0 1 8 0v3',
  video: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h10A1.5 1.5 0 0 1 16 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 17.5z|M16 10l5-3v10l-5-3',
  file: 'M6 3h8l4 4v14H6z|M14 3v4h4|M9 12h6|M9 16h6',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z|M5 11a7 7 0 0 0 14 0|M12 18v3',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M3 6h18v12H3z|M3 7l9 6 9-6',
  copy: 'M8 8h11v13H8z|M5 16V3h11',
  logout: 'M15 4h4v16h-4|M10 8l-4 4 4 4|M6 12h10',
  edit: 'M4 20h4L19 9l-4-4L4 16z|M13.5 6.5l4 4',
  trash: 'M4 7h16|M9 7V4h6v3|M6 7l1 14h10l1-14',
  grid: 'M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z',
  megaphone: 'M3 10v4h3l7 5V5L6 10z|M17 9a4 4 0 0 1 0 6',
  image: 'M4 5h16v14H4z|M4 16l5-5 4 4 3-3 4 4|M15.5 9.5v.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M12 12v.01',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M2 21v-1a6 6 0 0 1 12 0v1|M16 3.5a4 4 0 0 1 0 7|M18 14a6 6 0 0 1 4 6v1',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  external: 'M14 4h6v6|M20 4l-9 9|M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M12 2v2|M12 20v2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M2 12h2|M20 12h2|M4.9 19.1l1.4-1.4|M17.7 6.3l1.4-1.4',
  cart: 'M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2|M9.5 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M17.5 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  qr: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h2v2h-2z|M18 14h2|M14 18h2|M18 18h2v2|M20 16v-2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21v-1a7 7 0 0 1 14 0v1',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  chat: 'M4 5h16v11H9l-5 4z|M8 10h8|M8 13h5',
  hands: 'M8 21v-5l-3-4V6.5a1.5 1.5 0 0 1 3 0V11|M16 21v-5l3-4V6.5a1.5 1.5 0 0 0-3 0V11|M8 11l3.2-6.4a.9.9 0 0 1 1.6 0L16 11',
  church: 'M12 2v4|M10 4h4|M5 21V11l7-5 7 5v10|M3 21h18|M10 21v-5h4v5',
  layers: 'M12 3l9 5-9 5-9-5z|M3 13l9 5 9-5|M3 17l9 5 9-5',
  minus: 'M5 12h14',
  cake: 'M4 21h16|M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7|M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0|M12 12V8|M12 6.5c.8-.6.8-1.8 0-3-.8 1.2-.8 2.4 0 3z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M15.5 8.5l-2 5-5 2 2-5z',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7|M20 4v7h-7',
};

const filled: Record<string, string> = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
};

export function Icon({ name, size = 22, className, label }: { name: string; size?: number; className?: string; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  if (filled[name])
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" {...a11y}>
        <path d={filled[name]} />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y}
    >
      {(paths[name] ?? '').split('|').map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
