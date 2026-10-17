// Save sermon audio on the device so it plays without data.
// The service worker serves these from the same cache during playback.
import { useEffect, useState } from 'react';
import { safeLocal } from './format';

const CACHE = 'crcc-sermons';
const KEY = 'crcc-offline';
const listeners = new Set<() => void>();

const getSaved = () => safeLocal.get<Record<string, string>>(KEY, {});
const emit = () => listeners.forEach((l) => l());

export const offlineSupported = () => typeof caches !== 'undefined';

export async function saveOffline(sermonId: string, url: string) {
  if (!offlineSupported()) throw new Error('This browser cannot save audio for offline use.');
  if (!/^https?:/.test(url)) throw new Error('This audio can only be saved once it is uploaded to the church’s storage.');
  const cache = await caches.open(CACHE);
  await cache.add(url);
  safeLocal.set(KEY, { ...getSaved(), [sermonId]: url });
  emit();
}

export async function removeOffline(sermonId: string) {
  const saved = getSaved();
  const url = saved[sermonId];
  if (url && offlineSupported()) await (await caches.open(CACHE)).delete(url);
  delete saved[sermonId];
  safeLocal.set(KEY, saved);
  emit();
}

export function useOfflineSaved() {
  const [saved, setSaved] = useState(getSaved);
  useEffect(() => {
    const l = () => setSaved(getSaved());
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return saved;
}
