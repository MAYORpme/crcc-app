import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHead, Progress, useDocumentTitle, useToast } from '../components/ui';
import { BOOKS, OT_COUNT, neighbour, parseRef } from '../data/bible';
import { useAuth } from '../lib/auth';
import { store, useCollection, useDoc } from '../lib/store';
import { fmtDate, fmtLong, safeLocal, todayISO } from '../lib/format';
import type { Devotional as Dev } from '../types';

const share = async (title: string, text: string, toast: (m: string) => void) => {
  try {
    if (navigator.share) await navigator.share({ title, text, url: location.href });
    else {
      await navigator.clipboard.writeText(`${title}\n\n${text}\n\n${location.href}`);
      toast('Copied. Paste it in WhatsApp to share.');
    }
  } catch {
    /* cancelled */
  }
};

// ── Daily devotional ────────────────────────────────────────
export function Devotional() {
  const { date } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { items, loading } = useCollection('devotionals');
  const today = todayISO();
  const published = useMemo(() => items.filter((d) => d.date <= today).sort((a, b) => b.date.localeCompare(a.date)), [items, today]);
  const d: Dev | undefined = date ? published.find((x) => x.date === date) : published[0];
  useDocumentTitle(d ? d.title : 'Daily devotional');
  const idx = d ? published.indexOf(d) : -1;
  const older = idx >= 0 ? published[idx + 1] : undefined;
  const newer = idx > 0 ? published[idx - 1] : undefined;

  if (loading) return <div className="container page"><div className="empty">Loading…</div></div>;
  if (!d)
    return (
      <div className="container page">
        <PageHead title="Daily devotional" />
        <div className="empty">Today’s devotional will be posted soon.</div>
      </div>
    );
  return (
    <div className="container page page-narrow">
      <div className="row gap-12" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
        <span className="eyebrow" style={{ color: 'var(--blue)' }}>{d.date === today ? 'Today · ' : ''}{fmtLong(d.date)}</span>
        <Link to="/devotional/archive" className="small">All devotionals</Link>
      </div>
      <article className="stack gap-24">
        <h1 className="page-title">{d.title}</h1>
        <blockquote className="verse-block">
          <p>{d.verseText}</p>
          <cite>{d.scripture} (KJV)</cite>
        </blockquote>
        <div className="prose" style={{ whiteSpace: 'pre-line' }}>{d.body}</div>
        {d.prayer && (
          <section className="discuss" style={{ background: 'var(--tint)' }}>
            <h3 style={{ color: 'var(--blue)' }}>Prayer</h3>
            <p>{d.prayer}</p>
          </section>
        )}
        {d.confession && (
          <section className="discuss">
            <h3>Say this today</h3>
            <p style={{ fontWeight: 600 }}>{d.confession}</p>
          </section>
        )}
        <div className="row gap-8 wrap">
          <button className="btn btn-ghost btn-sm" onClick={() => share(d.title, `${d.scripture}: “${d.verseText}”`, toast)}><Icon name="share" size={16} /> Share</button>
          <Link className="btn btn-ghost btn-sm" to={`/bible?ref=${encodeURIComponent(d.scripture)}`}><Icon name="book" size={16} /> Read {d.scripture.split(/[:–-]/)[0]}</Link>
        </div>
        {d.author && <p className="tiny muted">{d.author}</p>}
        <div className="row gap-8" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          {older ? <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/devotional/${older.date}`)}><Icon name="back" size={16} /> {fmtDate(older.date, { day: 'numeric', month: 'short' })}</button> : <span />}
          {newer && <button className="btn btn-ghost btn-sm" onClick={() => navigate(newer.date === today ? '/devotional' : `/devotional/${newer.date}`)}>{fmtDate(newer.date, { day: 'numeric', month: 'short' })} <Icon name="chevron" size={16} /></button>}
        </div>
      </article>
    </div>
  );
}

export function DevotionalArchive() {
  useDocumentTitle('Devotionals');
  const { items } = useCollection('devotionals');
  const today = todayISO();
  const list = items.filter((d) => d.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="container page page-narrow">
      <PageHead title="All devotionals" back="/devotional" />
      {list.map((d) => (
        <Link key={d.id} to={d.date === today ? '/devotional' : `/devotional/${d.date}`} className="media-row">
          <div className="grow">
            <div className="row-title">{d.title}</div>
            <div className="row-meta">{fmtLong(d.date)} · {d.scripture}</div>
          </div>
          <Icon name="chevron" size={18} className="muted" />
        </Link>
      ))}
    </div>
  );
}

// ── Bible reader (King James Version) ───────────────────────
interface Verse { verse: number; text: string }
const LAST = 'crcc-bible-last';

export function Bible() {
  const [params, setParams] = useSearchParams();
  const ref = parseRef(params.get('ref') ?? '') ?? safeLocal.get(LAST, { book: 'John', chapter: 1 });
  const { book, chapter } = ref;
  useDocumentTitle(`${book} ${chapter}`);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [err, setErr] = useState('');
  const [picker, setPicker] = useState(false);
  const [size, setSize] = useState(() => safeLocal.get('crcc-bible-size', 18));
  const highlight = params.get('ref')?.match(/:(\d+)(?:\s*[–-]\s*(\d+))?/);
  const [hFrom, hTo] = highlight ? [Number(highlight[1]), Number(highlight[2] ?? highlight[1])] : [0, 0];

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setErr('');
    safeLocal.set(LAST, { book, chapter });
    fetch(`https://bible-api.com/${encodeURIComponent(`${book} ${chapter}`)}?translation=kjv`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { verses: { verse: number; text: string }[] }) => alive && setVerses(j.verses.map((v) => ({ verse: v.verse, text: v.text.trim() }))))
      .catch(() => alive && setErr('Couldn’t load this chapter. Check your internet connection; chapters you’ve read before work offline.'));
    return () => {
      alive = false;
    };
  }, [book, chapter]);

  useEffect(() => {
    if (hFrom && verses) document.getElementById(`v${hFrom}`)?.scrollIntoView({ block: 'center' });
  }, [hFrom, verses]);

  const go = (r: { book: string; chapter: number } | null) => r && setParams({ ref: `${r.book} ${r.chapter}` });
  const prev = neighbour(book, chapter, -1);
  const next = neighbour(book, chapter, 1);

  return (
    <div className="container page page-narrow">
      <div className="bible-bar">
        <button className="btn btn-ghost" onClick={() => setPicker(!picker)} aria-expanded={picker}>
          <Icon name="book" size={18} /> {book} {chapter} <Icon name="chevron" size={14} />
        </button>
        <div className="row gap-4">
          <button className="icon-btn" aria-label="Smaller text" onClick={() => { const s = Math.max(14, size - 2); setSize(s); safeLocal.set('crcc-bible-size', s); }}><span style={{ fontSize: 13, fontWeight: 700 }}>A</span></button>
          <button className="icon-btn" aria-label="Larger text" onClick={() => { const s = Math.min(28, size + 2); setSize(s); safeLocal.set('crcc-bible-size', s); }}><span style={{ fontSize: 19, fontWeight: 700 }}>A</span></button>
          <Link to="/bible/plans" className="btn btn-ghost btn-sm">Reading plans</Link>
        </div>
      </div>

      {picker && (
        <BookPicker
          current={book}
          onPick={(b, c) => {
            setPicker(false);
            go({ book: b, chapter: c });
          }}
        />
      )}

      <article className="bible-text" style={{ fontSize: size }}>
        <h1 className="page-title" style={{ fontSize: 28, marginBottom: 16 }}>{book} {chapter}</h1>
        {err ? (
          <div className="empty">{err}</div>
        ) : !verses ? (
          <div className="empty">Loading…</div>
        ) : (
          <p>
            {verses.map((v) => (
              <span key={v.verse} id={`v${v.verse}`} className={v.verse >= hFrom && v.verse <= hTo ? 'hl' : ''}>
                <sup>{v.verse}</sup>
                {v.text}{' '}
              </span>
            ))}
          </p>
        )}
        <p className="tiny muted">King James Version (public domain)</p>
      </article>

      <div className="row gap-8" style={{ justifyContent: 'space-between', marginTop: 24 }}>
        {prev ? <button className="btn btn-ghost" onClick={() => go(prev)}><Icon name="back" size={16} /> {prev.book} {prev.chapter}</button> : <span />}
        {next && <button className="btn btn-primary" onClick={() => go(next)}>{next.book} {next.chapter} <Icon name="chevron" size={16} /></button>}
      </div>
    </div>
  );
}

function BookPicker({ current, onPick }: { current: string; onPick(book: string, chapter: number): void }) {
  const [book, setBook] = useState<string | null>(null);
  if (book) {
    const n = BOOKS.find(([b]) => b === book)![1];
    return (
      <div className="card card-pad stack gap-12" style={{ marginBottom: 20 }}>
        <div className="row gap-8"><button className="icon-btn" aria-label="Back to books" onClick={() => setBook(null)}><Icon name="back" size={18} /></button><b>{book}</b></div>
        <div className="chapter-grid">
          {Array.from({ length: n }, (_, i) => (
            <button key={i} onClick={() => onPick(book, i + 1)}>{i + 1}</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="card card-pad stack gap-12" style={{ marginBottom: 20 }}>
      {[['Old Testament', BOOKS.slice(0, OT_COUNT)], ['New Testament', BOOKS.slice(OT_COUNT)]].map(([label, list]) => (
        <div key={label as string} className="stack gap-8">
          <div className="eyebrow muted">{label as string}</div>
          <div className="book-grid">
            {(list as [string, number][]).map(([b]) => (
              <button key={b} aria-pressed={b === current} onClick={() => setBook(b)}>{b}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Reading plans ───────────────────────────────────────────
export function Plans() {
  useDocumentTitle('Reading plans');
  const { member } = useAuth();
  const { items } = useCollection('plans');
  const { items: progress } = useCollection('planProgress', member ? { field: 'uid', op: '==', value: member.id } : null);
  return (
    <div className="container page">
      <PageHead title="Reading plans" sub="Build a daily habit in the Word." back="/bible" />
      <div className="card-grid">
        {items.map((p) => {
          const pr = progress.find((x) => x.planId === p.id);
          const pct = pr ? (pr.done.length / p.days.length) * 100 : 0;
          return (
            <Link key={p.id} to={`/bible/plans/${p.id}`} className="card card-pad stack gap-8" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 18 }}>{p.title}</h2>
                <span className="tag">{p.days.length} days</span>
              </div>
              <p className="small muted">{p.description}</p>
              {pr ? (
                <>
                  <Progress value={pct} label={`${p.title} progress`} />
                  <span className="tiny muted">{pr.done.length} of {p.days.length} days read</span>
                </>
              ) : (
                <span className="small" style={{ color: 'var(--blue)', fontWeight: 600 }}>Start plan →</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function PlanPage() {
  const { id = '' } = useParams();
  const { member } = useAuth();
  const toast = useToast();
  const { items } = useCollection('plans');
  const p = items.find((x) => x.id === id);
  const pid = member ? `${member.id}_${id}` : null;
  const { item: pr } = useDoc('planProgress', pid);
  useDocumentTitle(p?.title ?? 'Reading plan');
  if (!p || !member) return <div className="container page"><PageHead title="Reading plan" back="/bible/plans" /><div className="empty">Loading…</div></div>;
  const done = new Set(pr?.done ?? []);
  const nextDay = p.days.findIndex((_, i) => !done.has(i + 1));
  const toggle = async (day: number) => {
    if (!pr) await store.add('planProgress', { id: pid!, uid: member.id, planId: p.id, startedAt: new Date().toISOString(), done: [day] });
    else await store.atomic('planProgress', pid!, { op: done.has(day) ? 'arrayRemove' : 'arrayUnion', field: 'done', value: day });
    if (!done.has(day) && done.size + 1 === p.days.length) toast('Plan complete! Well done.');
  };
  return (
    <div className="container page page-narrow">
      <PageHead title={p.title} sub={p.description} back="/bible/plans" />
      <div className="soft card-pad stack gap-8" style={{ marginBottom: 20 }}>
        <Progress value={(done.size / p.days.length) * 100} label="Plan progress" />
        <div className="row gap-8 wrap" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">{done.size} of {p.days.length} days read</span>
          {nextDay >= 0 && (
            <Link className="btn btn-primary btn-sm" to={`/bible?ref=${encodeURIComponent(p.days[nextDay])}`}>
              {pr ? 'Continue' : 'Start'}: Day {nextDay + 1} · {p.days[nextDay]}
            </Link>
          )}
        </div>
      </div>
      <div>
        {p.days.map((r, i) => (
          <div key={i} className="media-row">
            <button className={`check ${done.has(i + 1) ? 'on' : ''}`} onClick={() => toggle(i + 1)} aria-pressed={done.has(i + 1)} aria-label={`Mark day ${i + 1} as read`}>
              {done.has(i + 1) && <Icon name="check" size={16} />}
            </button>
            <Link to={`/bible?ref=${encodeURIComponent(r)}`} className="grow" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row-title" style={{ fontSize: 15 }}>Day {i + 1}</div>
              <div className="row-meta">{r}</div>
            </Link>
            <Icon name="chevron" size={18} className="muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
