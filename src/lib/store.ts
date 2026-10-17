// One data API for the whole site. In demo mode it keeps content in the
// browser (localStorage); once Firebase is configured the same calls go
// to Firestore and Cloud Storage.
import { useEffect, useMemo, useState } from 'react';
import { firebaseConfig, isFirebaseConfigured } from '../config';
import { seed } from '../data/seed';
import type { CollectionMap, CollectionName, Settings } from '../types';

type Item<K extends CollectionName> = CollectionMap[K];
type NewItem<K extends CollectionName> = Omit<Item<K>, 'id'> & { id?: string };
type Listener = (items: unknown[]) => void;

/** Simple equality / array-contains filter, applied the same way locally and in Firestore. */
export interface Filter {
  field: string;
  op: '==' | 'array-contains';
  value: unknown;
}

export type Atomic = { op: 'arrayUnion' | 'arrayRemove'; field: string; value: unknown } | { op: 'increment'; field: string; value: number };

export interface Store {
  subscribe<K extends CollectionName>(name: K, cb: (items: Item<K>[]) => void, onError?: (e: unknown) => void, filter?: Filter): () => void;
  add<K extends CollectionName>(name: K, data: NewItem<K>): Promise<string>;
  set<K extends CollectionName>(name: K, id: string, data: Partial<Item<K>>): Promise<void>;
  atomic(name: CollectionName, id: string, op: Atomic): Promise<void>;
  watch<K extends CollectionName>(name: K, id: string, cb: (item: Item<K> | undefined) => void, onError?: (e: unknown) => void): () => void;
  remove(name: CollectionName, id: string): Promise<void>;
  upload(file: File, folder: string): Promise<string>;
  reset?(): void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const matches = (item: Record<string, unknown>, f?: Filter) => {
  if (!f) return true;
  const v = item[f.field];
  return f.op === '==' ? v === f.value : Array.isArray(v) && v.includes(f.value);
};

// ── Demo store ──────────────────────────────────────────────
const DEMO_KEY = 'crcc-demo-v2';

function createLocalStore(): Store {
  let data: Record<string, unknown[]> = structuredClone(seed) as unknown as Record<string, unknown[]>;
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    if (saved) data = { ...data, ...JSON.parse(saved) };
  } catch {
    /* storage unavailable: run from seed */
  }
  const listeners: Record<string, Set<{ cb: Listener; filter?: Filter }>> = {};
  const persist = () => {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(data));
    } catch {
      /* quota or private mode: changes last for this visit only */
    }
  };
  const view = (name: string, filter?: Filter) => (data[name] ?? []).filter((x) => matches(x as Record<string, unknown>, filter));
  const emit = (name: string) => listeners[name]?.forEach((l) => l.cb(view(name, l.filter)));
  window.addEventListener('storage', (e) => {
    if (e.key !== DEMO_KEY || !e.newValue) return;
    try {
      data = { ...data, ...JSON.parse(e.newValue) };
      Object.keys(listeners).forEach(emit);
    } catch {
      /* ignore */
    }
  });
  const list = (name: string) => (data[name] ?? []) as Record<string, unknown>[];

  return {
    subscribe(name, cb, _onError, filter) {
      const entry = { cb: cb as Listener, filter };
      (listeners[name] ??= new Set()).add(entry);
      queueMicrotask(() => cb(view(name, filter) as never));
      return () => {
        listeners[name].delete(entry);
      };
    },
    watch(name, id, cb) {
      return this.subscribe(name, (items) => cb(items[0] as never), undefined, { field: 'id', op: '==', value: id });
    },
    async add(name, item) {
      const id = item.id ?? uid();
      data[name] = [...list(name).filter((x) => x.id !== id), { ...item, id }];
      persist();
      emit(name);
      return id;
    },
    async set(name, id, patch) {
      const l = list(name);
      const exists = l.some((x) => x.id === id);
      data[name] = exists ? l.map((x) => (x.id === id ? { ...x, ...patch, id } : x)) : [...l, { ...patch, id }];
      persist();
      emit(name);
    },
    async atomic(name, id, a) {
      data[name] = list(name).map((x) => {
        if (x.id !== id) return x;
        const cur = x[a.field];
        if (a.op === 'increment') return { ...x, [a.field]: ((cur as number) || 0) + a.value };
        const arr = Array.isArray(cur) ? (cur as unknown[]) : [];
        return { ...x, [a.field]: a.op === 'arrayUnion' ? (arr.includes(a.value) ? arr : [...arr, a.value]) : arr.filter((v) => v !== a.value) };
      });
      persist();
      emit(name);
    },
    async remove(name, id) {
      data[name] = list(name).filter((x) => x.id !== id);
      persist();
      emit(name);
    },
    async upload(file) {
      if (file.type.startsWith('image/')) return shrinkImage(file);
      return URL.createObjectURL(file); // audio / PDF in demo mode: for this visit only
    },
    reset() {
      try {
        localStorage.removeItem(DEMO_KEY);
        localStorage.removeItem('crcc-demo-auth');
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
      location.reload();
    },
  };
}

export function shrinkImage(file: File, max = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ── Firebase store ──────────────────────────────────────────
let appPromise: Promise<import('firebase/app').FirebaseApp> | null = null;
export function getFirebaseApp() {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  appPromise ??= import('firebase/app').then(({ getApps, initializeApp }) => getApps()[0] ?? initializeApp(firebaseConfig));
  return appPromise;
}

function createFirebaseStore(): Store {
  const ready = (async () => {
    const [app, fs, st] = await Promise.all([getFirebaseApp(), import('firebase/firestore'), import('firebase/storage')]);
    let db: import('firebase/firestore').Firestore;
    try {
      db = fs.initializeFirestore(app!, { ignoreUndefinedProperties: true, localCache: fs.persistentLocalCache() });
    } catch {
      db = fs.getFirestore(app!);
    }
    return { fs, st, db, storage: st.getStorage(app!) };
  })();

  return {
    subscribe(name, cb, onError, filter) {
      let unsub: (() => void) | null = null;
      let cancelled = false;
      ready.then(({ fs, db }) => {
        if (cancelled) return;
        const col = fs.collection(db, name);
        const q = filter ? fs.query(col, fs.where(filter.field, filter.op, filter.value)) : col;
        unsub = fs.onSnapshot(
          q,
          (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })) as never),
          (e) => onError?.(e),
        );
      });
      return () => {
        cancelled = true;
        unsub?.();
      };
    },
    watch(name, id, cb, onError) {
      let unsub: (() => void) | null = null;
      let cancelled = false;
      ready.then(({ fs, db }) => {
        if (cancelled) return;
        unsub = fs.onSnapshot(
          fs.doc(db, name, id),
          (d) => cb(d.exists() ? ({ ...d.data(), id: d.id } as never) : undefined),
          (e) => onError?.(e),
        );
      });
      return () => {
        cancelled = true;
        unsub?.();
      };
    },
    async add(name, item) {
      const { fs, db } = await ready;
      const { id, ...rest } = item as { id?: string };
      if (id) {
        await fs.setDoc(fs.doc(db, name, id), rest);
        return id;
      }
      return (await fs.addDoc(fs.collection(db, name), rest)).id;
    },
    async set(name, id, patch) {
      const { fs, db } = await ready;
      const { id: _drop, ...rest } = patch as { id?: string };
      void _drop;
      await fs.setDoc(fs.doc(db, name, id), rest, { merge: true });
    },
    async atomic(name, id, a) {
      const { fs, db } = await ready;
      const v =
        a.op === 'increment' ? fs.increment(a.value) : a.op === 'arrayUnion' ? fs.arrayUnion(a.value) : fs.arrayRemove(a.value);
      await fs.updateDoc(fs.doc(db, name, id), { [a.field]: v });
    },
    async remove(name, id) {
      const { fs, db } = await ready;
      await fs.deleteDoc(fs.doc(db, name, id));
    },
    async upload(file, folder) {
      const { st, storage } = await ready;
      const ref = st.ref(storage, `${folder}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`);
      await st.uploadBytes(ref, file, { contentType: file.type });
      return st.getDownloadURL(ref);
    },
  };
}

export const store: Store = isFirebaseConfigured ? createFirebaseStore() : createLocalStore();

// ── Audit log for admin changes ─────────────────────────────
let actor: { uid: string; name: string } | null = null;
export const setAuditActor = (a: typeof actor) => {
  actor = a;
};

const label = (data: Record<string, unknown> | undefined) =>
  String(data?.title ?? data?.name ?? data?.topic ?? data?.text ?? data?.label ?? '').slice(0, 80);

/** Admin writes go through here so every change is recorded in the audit log. */
export const adminStore = {
  async add<K extends CollectionName>(name: K, data: NewItem<K>) {
    const id = await store.add(name, data);
    await logAudit('create', name, id, label(data as Record<string, unknown>));
    return id;
  },
  async set<K extends CollectionName>(name: K, id: string, data: Partial<Item<K>>, summary?: string) {
    await store.set(name, id, data);
    await logAudit('update', name, id, summary ?? label(data as Record<string, unknown>));
  },
  async remove(name: CollectionName, id: string, summary = '') {
    await store.remove(name, id);
    await logAudit('delete', name, id, summary);
  },
};

async function logAudit(action: 'create' | 'update' | 'delete', collection: string, docId: string, summary: string) {
  if (!actor || collection === 'audit') return;
  try {
    await store.add('audit', { uid: actor.uid, name: actor.name, action, collection, docId, summary, at: new Date().toISOString() });
  } catch {
    /* logging must never block the change itself */
  }
}

// ── React hooks ─────────────────────────────────────────────
export function useCollection<K extends CollectionName>(name: K, filter?: Filter | null) {
  const [items, setItems] = useState<Item<K>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const key = filter === null ? 'skip' : JSON.stringify(filter ?? '');
  useEffect(() => {
    if (filter === null) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return store.subscribe(
      name,
      (list) => {
        setItems(list);
        setLoading(false);
      },
      (e) => {
        setError(e);
        setLoading(false);
      },
      filter,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key]);
  return { items, loading, error };
}

export function useDoc<K extends CollectionName>(name: K, id: string | null | undefined) {
  const [item, setItem] = useState<Item<K> | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(id));
  useEffect(() => {
    if (!id) {
      setItem(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    return store.watch(
      name,
      id,
      (x) => {
        setItem(x);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [name, id]);
  return useMemo(() => ({ item, loading }), [item, loading]);
}

const defaultSettings = seed.settings[0];

export function useSettings(): Settings {
  const { items } = useCollection('settings');
  const main = items.find((s) => s.id === 'main');
  return { ...defaultSettings, ...main, serviceTimes: main?.serviceTimes?.length ? main.serviceTimes : defaultSettings.serviceTimes };
}

export { uid };
