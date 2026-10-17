import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHead, useDocumentTitle } from '../components/ui';
import { useCollection } from '../lib/store';
import { fmtDate, fmtLong, isUpcoming } from '../lib/format';
import type { Lesson } from '../types';

const bibleLink = (ref: string) => `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=KJV`;

function LessonBody({ l, current }: { l: Lesson; current: boolean }) {
  return (
    <div className="stack gap-24">
      <section className="lesson-hero">
        <span className="eyebrow" style={{ opacity: 0.9 }}>
          {current ? (isUpcoming(l.date) ? 'This Sunday' : 'Latest lesson') : 'Lesson'} · {fmtLong(l.date)}
        </span>
        <h2>{l.topic}</h2>
        <div className="verse">
          <div className="eyebrow" style={{ opacity: 0.85, marginBottom: 6 }}>Memory verse</div>
          <q>{l.memoryVerse}</q>
          <div className="small" style={{ fontWeight: 700, marginTop: 6 }}>{l.memoryRef}</div>
        </div>
        <div className="row gap-8 wrap">
          {l.manualUrl && (
            <a href={l.manualUrl} className="btn btn-white btn-sm" target="_blank" rel="noreferrer">
              <Icon name="file" size={18} /> Manual (PDF)
            </a>
          )}
          {l.recordingUrl && (
            <a href={l.recordingUrl} className="btn btn-outline-white btn-sm" target="_blank" rel="noreferrer">
              <Icon name="mic" size={18} /> Class recording
            </a>
          )}
        </div>
      </section>

      {l.intro && <p className="prose">{l.intro}</p>}

      {l.passages.length > 0 && (
        <section className="section">
          <h2 style={{ fontSize: 19 }}>Bible passages</h2>
          <div className="chips">
            {l.passages.map((p) => (
              <a key={p} className="passage" href={bibleLink(p)} target="_blank" rel="noreferrer">
                {p}
              </a>
            ))}
          </div>
        </section>
      )}

      {l.outline.length > 0 && (
        <section className="section">
          <h2 style={{ fontSize: 19 }}>Lesson outline</h2>
          <ol className="outline-list">
            {l.outline.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ol>
        </section>
      )}

      {l.questions.length > 0 && (
        <section className="discuss">
          <h3>For discussion</h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
            {l.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Oxygen() {
  useDocumentTitle('Oxygen Class');
  const { items, loading } = useCollection('lessons');
  const upcoming = items.filter((l) => isUpcoming(l.date)).sort((a, b) => a.date.localeCompare(b.date));
  const past = items.filter((l) => !isUpcoming(l.date)).sort((a, b) => b.date.localeCompare(a.date));
  const current = upcoming[0] ?? past[0];
  const archive = items.filter((l) => l.id !== current?.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="container page">
      <div className="row gap-12" style={{ marginBottom: 20 }}>
        <span className="o2">O₂</span>
        <div>
          <h1 className="page-title">Oxygen Class</h1>
          <p className="page-sub" style={{ marginTop: 0 }}>Sunday School · read ahead and come ready</p>
        </div>
      </div>
      {loading ? (
        <div className="empty">Loading…</div>
      ) : !current ? (
        <div className="empty">This week’s lesson will be posted soon.</div>
      ) : (
        <div className="two-col" style={{ alignItems: 'start' }}>
          <LessonBody l={current} current />
          <section className="section">
            <h2 style={{ fontSize: 19 }}>Past lessons</h2>
            {archive.length ? (
              <div className="stack gap-16">
                {Object.entries(
                  archive.reduce<Record<string, typeof archive>>((acc, l) => {
                    const d = new Date(l.date + 'T12:00:00');
                    const k = `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
                    (acc[k] ??= []).push(l);
                    return acc;
                  }, {}),
                ).map(([q, ls]) => (
                  <div key={q}>
                    <div className="eyebrow muted" style={{ marginBottom: 4 }}>{q}</div>
                    {ls.map((l) => (
                      <Link key={l.id} to={`/oxygen/${l.id}`} className="media-row">
                        <div className="grow">
                          <div className="row-title">{l.topic}</div>
                          <div className="row-meta">{fmtDate(l.date)} · {l.memoryRef}</div>
                        </div>
                        <Icon name="chevron" size={18} className="muted" />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">Past lessons will be listed here.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function LessonPage() {
  const { id } = useParams();
  const { items, loading } = useCollection('lessons');
  const l = items.find((x) => x.id === id);
  useDocumentTitle(l?.topic ?? 'Oxygen Class');
  return (
    <div className="container page page-narrow">
      <PageHead title="Oxygen Class" back="/oxygen" />
      {loading ? <div className="empty">Loading…</div> : l ? <LessonBody l={l} current={false} /> : <div className="empty">Lesson not found.</div>}
    </div>
  );
}
