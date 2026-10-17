import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal, asset, useToast } from '../components/ui';
import { adminStore, store, useCollection } from '../lib/store';
import { isDemo } from '../config';
import type { CollectionName } from '../types';

export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'bool' | 'select' | 'image' | 'images' | 'file' | 'list' | 'url' | 'ref';
  /** for type 'ref': which collection to pick from, and which field to show */
  ref?: { collection: CollectionName; label: string };
  options?: string[];
  hint?: string;
  required?: boolean;
  accept?: string;
  half?: boolean;
};

type Rec = Record<string, unknown> & { id?: string };

export interface Resource {
  name: CollectionName;
  area: string; // permission area (see lib/roles)
  title: string;
  single: string;
  icon: string;
  fields: Field[];
  defaults: () => Rec;
  heading: (r: Rec) => string;
  meta: (r: Rec) => string;
  image?: (r: Rec) => string | undefined;
  active?: (r: Rec) => boolean | undefined;
  sort: (a: Rec, b: Rec) => number;
}

function FieldInput({ f, value, onChange, folder }: { f: Field; value: unknown; onChange(v: unknown): void; folder: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const id = `f-${f.key}`;
  const str = (value ?? '') as string;

  if (f.type === 'bool')
    return (
      <label className="switch">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {f.label}
      </label>
    );

  const control = (() => {
    switch (f.type) {
      case 'textarea':
        return <textarea id={id} className="textarea" value={str} onChange={(e) => onChange(e.target.value)} />;
      case 'select':
        return (
          <select id={id} className="select" value={str} onChange={(e) => onChange(e.target.value)}>
            {f.options!.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        );
      case 'ref':
        return <RefSelect id={id} f={f} value={str} onChange={onChange} />;
      case 'images': {
        const list = (value as string[]) ?? [];
        return (
          <div className="stack gap-8">
            <div className="thumb-grid">
              {list.map((u, i) => (
                <div key={u + i} className="thumb-item">
                  <img src={asset(u)} alt="" />
                  <button type="button" aria-label="Remove photo" onClick={() => onChange(list.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
                </div>
              ))}
            </div>
            <label className="btn btn-ghost btn-sm" style={{ justifySelf: 'start', alignSelf: 'flex-start' }}>
              <Icon name="image" size={16} /> {busy ? 'Uploading…' : 'Add photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={busy}
                onChange={async (e) => {
                  const files = [...(e.target.files ?? [])];
                  if (!files.length) return;
                  setBusy(true);
                  try {
                    const urls: string[] = [];
                    for (const file of files) urls.push(await store.upload(file, folder));
                    onChange([...list, ...urls]);
                  } catch {
                    toast('Some photos failed to upload. Try again.');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          </div>
        );
      }
      case 'number':
        return <input id={id} className="input" type="number" inputMode="numeric" value={(value as number) ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
      case 'date':
        return <input id={id} className="input" type="date" value={str} onChange={(e) => onChange(e.target.value)} />;
      case 'list': {
        const list = (value as string[]) ?? [];
        return (
          <div className="list-editor">
            {list.map((item, i) => (
              <div key={i} className="row gap-8">
                <input
                  className="input"
                  aria-label={`${f.label} ${i + 1}`}
                  value={item}
                  onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <button type="button" className="icon-btn" aria-label="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))}>
                  <Icon name="close" size={18} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => onChange([...list, ''])}>
              <Icon name="plus" size={16} /> Add
            </button>
          </div>
        );
      }
      case 'image':
      case 'file':
        return (
          <div className="stack gap-8">
            {f.type === 'image' && str && <img src={asset(str)} alt="" style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 10 }} />}
            <div className="row gap-8 wrap">
              <label className="btn btn-ghost btn-sm">
                <Icon name={f.type === 'image' ? 'image' : 'file'} size={16} /> {busy ? 'Uploading…' : str ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept={f.accept ?? (f.type === 'image' ? 'image/*' : undefined)}
                  className="sr-only"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setBusy(true);
                    try {
                      onChange(await store.upload(file, folder));
                    } catch {
                      toast('Upload failed. Try again.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              {str && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
                  Remove
                </button>
              )}
            </div>
            <input
              id={id}
              className="input"
              placeholder="…or paste a link"
              value={str.startsWith('data:') ? '(uploaded image)' : str}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );
      default:
        return <input id={id} className="input" type={f.type === 'url' ? 'url' : 'text'} value={str} onChange={(e) => onChange(e.target.value)} />;
    }
  })();

  return (
    <div className="field" style={f.half ? undefined : { gridColumn: '1 / -1' }}>
      <label htmlFor={id}>
        {f.label}
        {f.required && ' *'}
      </label>
      {control}
      {f.hint && <span className="hint">{f.hint}</span>}
    </div>
  );
}

function RefSelect({ id, f, value, onChange }: { id: string; f: Field; value: string; onChange(v: unknown): void }) {
  const { items } = useCollection(f.ref!.collection);
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {(items as unknown as Record<string, string>[]).map((x) => (
        <option key={x.id} value={x.id}>{x[f.ref!.label]}</option>
      ))}
    </select>
  );
}

export function EditorModal({ res, record, onClose }: { res: Resource; record: Rec | null; onClose(): void }) {
  const [draft, setDraft] = useState<Rec>(() => record ?? res.defaults());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();
  const isNew = !record?.id;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = res.fields.find((f) => f.required && (draft[f.key] === '' || draft[f.key] == null));
    if (missing) return setErr(`${missing.label} is required.`);
    setBusy(true);
    setErr('');
    try {
      const clean = Object.fromEntries(
        Object.entries(draft).map(([k, v]) => [k, Array.isArray(v) ? v.filter((x) => String(x).trim()) : v]),
      );
      if (isNew) {
        const id = await adminStore.add(res.name, clean as never);
        // Live, the server sends this automatically when a sermon is added.
        if (isDemo && res.name === 'sermons')
          await store.add('notifications', { title: 'New sermon', body: `${clean.title} · ${clean.preacher}`, link: `/sermons/${id}`, audience: 'all', createdAt: new Date().toISOString(), auto: true });
      }
      else await adminStore.set(res.name, record!.id!, clean as never);
      toast(`${res.single} saved`);
      onClose();
    } catch (e2) {
      setErr('Could not save. ' + ((e2 as Error).message || ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${isNew ? 'Add' : 'Edit'} ${res.single.toLowerCase()}`}>
      <form onSubmit={save} className="form-grid two" noValidate>
        {res.fields.map((f) => (
          <FieldInput key={f.key} f={f} value={draft[f.key]} folder={res.name} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
        ))}
        {err && <p className="error-text" style={{ gridColumn: '1 / -1' }} role="alert">{err}</p>}
        <div className="row gap-8" style={{ gridColumn: '1 / -1', justifyContent: 'space-between', marginTop: 8 }}>
          {!isNew ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={async () => {
                if (!confirmDelete) return setConfirmDelete(true);
                await adminStore.remove(res.name, record!.id!, res.heading(record!));
                toast('Deleted');
                onClose();
              }}
            >
              <Icon name="trash" size={16} /> {confirmDelete ? 'Tap again to delete' : 'Delete'}
            </button>
          ) : (
            <span />
          )}
          <div className="row gap-8">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
