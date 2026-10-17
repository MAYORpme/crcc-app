import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Sermon } from '../types';

interface PlayerState {
  current: Sermon | null;
  playing: boolean;
  time: number;
  duration: number;
  play(s: Sermon): void;
  toggle(): void;
  seek(t: number): void;
  close(): void;
}

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<Sermon | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.preacher,
      album: 'CRCC Sermons',
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', () => audio.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.current?.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => audio.current && (audio.current.currentTime -= 15));
    navigator.mediaSession.setActionHandler('seekforward', () => audio.current && (audio.current.currentTime += 30));
  }, [current]);

  const value: PlayerState = {
    current,
    playing,
    time,
    duration,
    play(s) {
      const a = audio.current;
      if (!a || !s.audioUrl) return;
      if (current?.id !== s.id) {
        a.src = s.audioUrl;
        setCurrent(s);
        setTime(0);
      }
      a.play().catch(() => setPlaying(false));
    },
    toggle() {
      const a = audio.current;
      if (!a) return;
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    },
    seek(t) {
      if (audio.current) audio.current.currentTime = t;
    },
    close() {
      audio.current?.pause();
      setCurrent(null);
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
      />
    </Ctx.Provider>
  );
}

export const usePlayer = () => useContext(Ctx)!;

export const clock = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
