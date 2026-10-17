import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { asset, useToast } from './ui';
import type { Sermon } from '../types';
import { fmtDate } from '../lib/format';
import { usePlayer } from '../lib/player';
import { removeOffline, saveOffline, useOfflineSaved } from '../lib/offline';
import { useState } from 'react';

export const sermonMeta = (s: Sermon, withPreacher = true) =>
  [fmtDate(s.date), s.durationMin ? `${s.durationMin} min` : '', withPreacher ? s.preacher : ''].filter(Boolean).join(' · ');

export function PlayButton({ s, light }: { s: Sermon; light?: boolean }) {
  const p = usePlayer();
  const toast = useToast();
  const isCurrent = p.current?.id === s.id;
  const playing = isCurrent && p.playing;
  return (
    <button
      className={light ? 'round-btn' : 'round-btn'}
      style={light ? { background: '#fff', color: 'var(--blue)' } : undefined}
      onClick={() => {
        if (!s.audioUrl) return toast(s.videoUrl ? 'This message is available as video. Open it to watch.' : 'Audio for this message will be uploaded soon.');
        if (isCurrent) p.toggle();
        else p.play(s);
      }}
      aria-label={playing ? `Pause ${s.title}` : `Play ${s.title}`}
    >
      <Icon name={playing ? 'pause' : 'play'} size={18} />
    </button>
  );
}

export function SaveButton({ s, light }: { s: Sermon; light?: boolean }) {
  const saved = useOfflineSaved();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isSaved = Boolean(saved[s.id]);
  return (
    <button
      className={`round-btn ${isSaved ? 'saved' : 'ghost'}`}
      style={light && !isSaved ? { background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.6)' } : undefined}
      disabled={busy}
      aria-label={isSaved ? `Remove ${s.title} from downloads` : `Download ${s.title} for offline`}
      onClick={async () => {
        if (isSaved) {
          await removeOffline(s.id);
          return toast('Removed from downloads');
        }
        if (!s.audioUrl) return toast('Audio for this message will be uploaded soon.');
        setBusy(true);
        try {
          await saveOffline(s.id, s.audioUrl);
          toast('Saved. It will play without data.');
        } catch (e) {
          toast((e as Error).message || 'Could not save this sermon.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name={isSaved ? 'check' : 'download'} size={19} />
    </button>
  );
}

export function SermonRow({ s }: { s: Sermon }) {
  return (
    <div className="media-row">
      <Link to={`/sermons/${s.id}`} className="row gap-12 grow" style={{ textDecoration: 'none', color: 'inherit' }}>
        <img className="thumb" src={asset(s.image || '/images/founder.jpg')} alt="" loading="lazy" />
        <div className="grow">
          <div className="row-title">{s.title}</div>
          <div className="row-meta">{sermonMeta(s, false)}</div>
        </div>
      </Link>
      <SaveButton s={s} />
      <PlayButton s={s} />
    </div>
  );
}
