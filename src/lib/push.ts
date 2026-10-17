// Notifications: an in-app inbox for every member, plus phone/browser push
// alerts through Firebase Cloud Messaging once Firebase is configured.
import { useEffect, useMemo, useRef, useState } from 'react';
import { isFirebaseConfigured, vapidKey } from '../config';
import { getFirebaseApp, store, useCollection } from './store';
import { safeLocal } from './format';
import type { AppNotification, Member } from '../types';

const READ_KEY = (uid: string) => `crcc-read-${uid}`;
const listeners = new Set<() => void>();

export function markAllRead(uid: string) {
  safeLocal.set(READ_KEY(uid), new Date().toISOString());
  listeners.forEach((l) => l());
}

/** Every notification meant for this member: church-wide, their departments, and personal ones. */
export function useMyNotifications(member: Member | null) {
  const uid = member?.id ?? '';
  const all = useCollection('notifications', member ? { field: 'audience', op: '==', value: 'all' } : null);
  const mine = useCollection('notifications', member ? { field: 'audience', op: '==', value: `user:${uid}` } : null);
  const deptKey = (member?.departments ?? []).join(',');
  const [deptItems, setDeptItems] = useState<AppNotification[]>([]);
  useEffect(() => {
    const ids = deptKey ? deptKey.split(',') : [];
    const found: Record<string, AppNotification[]> = {};
    const unsubs = ids.map((d) =>
      store.subscribe('notifications', (items) => {
        found[d] = items;
        setDeptItems(Object.values(found).flat());
      }, undefined, { field: 'audience', op: '==', value: `dept:${d}` }),
    );
    if (!ids.length) setDeptItems([]);
    return () => unsubs.forEach((u) => u());
  }, [deptKey]);

  const [readAt, setReadAt] = useState(() => (uid ? safeLocal.get<string>(READ_KEY(uid), '') : ''));
  useEffect(() => {
    const l = () => setReadAt(safeLocal.get<string>(READ_KEY(uid), ''));
    l();
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [uid]);

  const items = useMemo(() => {
    const map = new Map<string, AppNotification>();
    [...all.items, ...mine.items, ...deptItems].forEach((n) => map.set(n.id, n));
    const joined = member?.createdAt ?? '';
    return [...map.values()]
      .filter((n) => n.audience !== 'all' || !joined || n.createdAt >= joined.slice(0, 10) || n.auto)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [all.items, mine.items, deptItems, member?.createdAt]);

  const unread = items.filter((n) => !readAt || n.createdAt > readAt).length;
  return { items, unread, readAt };
}

/** Shows a toast (and a system notification if allowed) when something new arrives while the app is open. */
export function useNewNotificationAlert(items: AppNotification[], onNew: (n: AppNotification) => void) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seen.current === null) {
      if (items.length) seen.current = new Set(items.map((n) => n.id));
      else seen.current = new Set();
      return;
    }
    for (const n of items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (Date.now() - new Date(n.createdAt).getTime() > 5 * 60e3) continue;
      onNew(n);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        navigator.serviceWorker?.ready.then((reg) => reg.showNotification(n.title, { body: n.body, icon: 'icons/icon-192.png', data: { url: n.link } })).catch(() => {});
      }
    }
  }, [items, onNew]);
}

export const pushSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
export const pushPermission = () => (pushSupported() ? Notification.permission : 'denied');

/** Ask permission and register this device for push alerts. */
export async function enablePush(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  if (!isFirebaseConfigured || !vapidKey) return 'granted'; // demo: in-app + local alerts only
  try {
    const [app, msg] = await Promise.all([getFirebaseApp(), import('firebase/messaging')]);
    if (!(await msg.isSupported())) return 'unsupported';
    const reg = await navigator.serviceWorker.ready;
    const token = await msg.getToken(msg.getMessaging(app!), { vapidKey, serviceWorkerRegistration: reg });
    if (token) {
      await store.set('pushTokens' as never, token, { uid, createdAt: new Date().toISOString(), ua: navigator.userAgent.slice(0, 120) } as never);
      safeLocal.set('crcc-push-token', token);
    }
    return 'granted';
  } catch {
    return 'unsupported';
  }
}
