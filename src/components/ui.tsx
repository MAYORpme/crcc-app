import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Resolve /images/... paths against the app's base URL (works in sub-folder hosting too). */
export const asset = (u?: string) => (u && u.startsWith('/') && !u.startsWith('//') ? import.meta.env.BASE_URL + u.slice(1) : u ?? '');

/** Internal links use the router; anything else opens normally. */
export function SmartLink({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string; 'aria-label'?: string }) {
  if (to.startsWith('/')) return <Link to={to} className={className} {...rest}>{children}</Link>;
  return (
    <a href={to} className={className} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose(): void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="row gap-12" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite">{msg && <div className="toast">{msg}</div>}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DateBox({ date }: { date: string }) {
  const d = new Date(date + 'T12:00:00');
  return (
    <div className="date-box" aria-hidden="true">
      <span className="m">{d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
      <span className="d">{d.getDate()}</span>
    </div>
  );
}

export function PageHead({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <div className="row gap-12" style={{ marginBottom: 20, alignItems: 'flex-start' }}>
      {back && (
        <Link to={back} className="icon-btn" aria-label="Back">
          <Icon name="back" size={20} />
        </Link>
      )}
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </div>
  );
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · CRCC` : 'CRCC · Christ The Renewal Christian Church';
  }, [title]);
}
