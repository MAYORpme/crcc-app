import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PlayButton, SaveButton, SermonRow, sermonMeta } from '../components/SermonRow';
import { PageHead, asset, useDocumentTitle, useToast } from '../components/ui';
import { useCollection, useSettings } from '../lib/store';
import { fmtLong, youTubeEmbed } from '../lib/format';
import { useOfflineSaved } from '../lib/offline';
import type { SermonCategory } from '../types';

const FILTERS: ('All' | SermonCategory | 'Downloaded')[] = ['All', 'Sunday', 'Midweek', 'Oxygen Class', 'Special', 'Downloaded'];

export default function Sermons() {
  useDocumentTitle('Sermons');
  const { items, loading } = useCollection('sermons');
  const saved = useOfflineSaved();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items]);
  const list = sorted.filter((s) => {
    if (filter === 'Downloaded' && !saved[s.id]) return false;
    if (filter !== 'All' && filter !== 'Downloaded' && s.category !== filter) return false;
    if (!q.trim()) return true;
    const hay = [s.title, s.preacher, s.series, s.scripture, s.date, s.category].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });
  const featured = sorted[0];
  const showFeatured = featured && filter === 'All' && !q;

  return (
    <div className="container page">
      <PageHead title="Sermons" sub="Every message from Sunday, midweek and Oxygen Class. Download to listen without data." />
      <div className="stack gap-24">
        <div className="stack gap-12">
          <label className="search">
            <Icon name="search" size={20} />
            <span className="sr-only">Search sermons</span>
            <input type="search" placeholder="Search by title, preacher, scripture or date" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="chips scroll" role="group" aria-label="Filter sermons">
            {FILTERS.map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {showFeatured && (
          <article className="featured">
            <img src={asset(featured.image || '/images/founder.jpg')} alt="" />
            <div className="f-body">
              <span className="eyebrow" style={{ opacity: 0.85 }}>Latest · {featured.category}</span>
              <h2>{featured.title}</h2>
              <div className="small" style={{ opacity: 0.92 }}>{featured.preacher}</div>
              <div className="tiny" style={{ opacity: 0.85 }}>{[fmtLong(featured.date), featured.scripture].filter(Boolean).join(' · ')}</div>
              <div className="row gap-8" style={{ marginTop: 'auto', paddingTop: 10 }}>
                <PlayButton s={featured} light />
                <SaveButton s={featured} light />
                <Link to={`/sermons/${featured.id}`} className="btn btn-outline-white btn-sm">
                  Open
                </Link>
              </div>
            </div>
          </article>
        )}

        <section className="section">
          <h2 style={{ fontSize: 19 }}>{filter === 'All' && !q ? 'All messages' : `${list.length} ${list.length === 1 ? 'message' : 'messages'}`}</h2>
          {loading ? (
            <div className="empty">Loading…</div>
          ) : list.length ? (
            <div className="sermon-grid">
              {list.map((s) => (
                <SermonRow key={s.id} s={s} />
              ))}
            </div>
          ) : (
            <div className="empty">{filter === 'Downloaded' ? 'Sermons you download will appear here and play without data.' : 'No messages match your search.'}</div>
          )}
        </section>
      </div>
    </div>
  );
}

export function SermonDetail() {
  const { id } = useParams();
  const { items, loading } = useCollection('sermons');
  const toast = useToast();
  const s = items.find((x) => x.id === id);
  useDocumentTitle(s?.title ?? 'Sermon');
  if (loading) return <div className="container page"><div className="empty">Loading…</div></div>;
  if (!s)
    return (
      <div className="container page">
        <PageHead title="Message not found" back="/sermons" />
        <Link to="/sermons" className="btn btn-primary">See all sermons</Link>
      </div>
    );
  const embed = youTubeEmbed(s.videoUrl);
  const more = items.filter((x) => x.id !== s.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: s.title, text: `${s.title} · ${s.preacher}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied. Paste it in WhatsApp to share.');
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="container page page-narrow">
      <PageHead title={s.title} sub={sermonMeta(s)} back="/sermons" />
      <div className="stack gap-24">
        {embed ? (
          <div className="video-frame">
            <iframe src={embed} title={s.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
          </div>
        ) : (
          <img src={asset(s.image || '/images/founder.jpg')} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'cover', objectPosition: 'top', borderRadius: 'var(--r-lg)' }} />
        )}

        <div className="row gap-12 wrap">
          <PlayButton s={s} />
          <SaveButton s={s} />
          <button className="btn btn-ghost btn-sm" onClick={share}>
            <Icon name="share" size={18} /> Share
          </button>
          {s.notesUrl && (
            <a className="btn btn-ghost btn-sm" href={s.notesUrl} target="_blank" rel="noreferrer">
              <Icon name="file" size={18} /> Sermon notes
            </a>
          )}
          {s.audioUrl && (
            <a className="btn btn-ghost btn-sm" href={s.audioUrl} download target="_blank" rel="noreferrer">
              <Icon name="download" size={18} /> Save MP3
            </a>
          )}
        </div>
        {!s.audioUrl && !embed && <p className="muted small">The recording for this message will be uploaded soon.</p>}

        {(s.scripture || s.summary) && (
          <div className="stack gap-8 prose">
            {s.scripture && (
              <p>
                <b>Scripture:</b> {s.scripture}
              </p>
            )}
            {s.summary && <p>{s.summary}</p>}
          </div>
        )}

        {more.length > 0 && (
          <section className="section">
            <h2 style={{ fontSize: 19 }}>More messages</h2>
            <div>
              {more.map((m) => (
                <SermonRow key={m.id} s={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function Live() {
  useDocumentTitle('Live');
  const s = useSettings();
  const embed = youTubeEmbed(s.liveUrl);
  return (
    <div className="container page page-narrow">
      <PageHead title={s.isLive ? s.liveTitle : 'Live service'} sub={s.isLive ? 'Streaming now' : 'Services stream here when we go live.'} back="/" />
      {s.isLive && embed ? (
        <div className="video-frame">
          <iframe src={embed + '&autoplay=1'} title="Live service" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <div className="stack gap-16">
          <div className="empty">We’re not live right now. Catch up on recent messages, or join us in person this Sunday.</div>
          <div className="times">
            {s.serviceTimes.map((t) => (
              <div key={t.label} className="time-row">
                <span className="ic-box"><Icon name="clock" size={20} /></span>
                <div><div style={{ fontWeight: 700 }}>{t.label}</div><div className="small muted">{t.time}</div></div>
              </div>
            ))}
          </div>
          <div className="row gap-12 wrap">
            <Link to="/sermons" className="btn btn-primary">Recent messages</Link>
            {s.youtube && <a className="btn btn-ghost" href={s.youtube} target="_blank" rel="noreferrer">YouTube channel</a>}
          </div>
        </div>
      )}
    </div>
  );
}
