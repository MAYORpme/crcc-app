import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Modal, asset } from './ui';
import { safeLocal } from '../lib/format';

interface BIPEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'crcc-install-dismissed';
let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((s) => s());
  });
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Shared hook: can we show a native install prompt, and a function to trigger install help. */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => {
      subs.delete(s);
    };
  }, []);
  return {
    canPrompt: Boolean(deferred),
    ios: isIOS(),
    installed: isStandalone(),
    async prompt() {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      subs.forEach((s) => s());
      return outcome === 'accepted';
    },
  };
}

export function InstallHelp({ open, onClose }: { open: boolean; onClose(): void }) {
  const ios = isIOS();
  return (
    <Modal open={open} onClose={onClose} title="Add CRCC to your home screen">
      <div className="stack gap-16">
        <p className="muted">The CRCC site works like an app: one tap from your home screen, full screen, and saved sermons play offline.</p>
        {ios ? (
          <ol className="outline-list">
            <li>Open this site in <b>Safari</b>.</li>
            <li>
              Tap the <b>Share</b> button <Icon name="share" size={18} /> at the bottom of the screen.
            </li>
            <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
            <li>Tap <b>Add</b>.</li>
          </ol>
        ) : (
          <ol className="outline-list">
            <li>Open this site in <b>Chrome</b>.</li>
            <li>Tap the <b>⋮</b> menu at the top right.</li>
            <li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li>
          </ol>
        )}
        <button className="btn btn-primary btn-block" onClick={onClose}>
          Got it
        </button>
      </div>
    </Modal>
  );
}

export function InstallPrompt() {
  const { canPrompt, ios, installed, prompt } = useInstall();
  const [visible, setVisible] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (installed) return;
    const dismissedAt = safeLocal.get<number>(KEY, 0);
    if (Date.now() - dismissedAt < 14 * 864e5) return;
    if (!canPrompt && !ios) return;
    const t = setTimeout(() => setVisible(true), 3500);
    return () => clearTimeout(t);
  }, [canPrompt, ios, installed]);

  const dismiss = () => {
    safeLocal.set(KEY, Date.now());
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <div className="install-banner" role="dialog" aria-label="Install the CRCC app">
          <img src={asset('/icons/icon-192.png')} alt="" />
          <div className="grow">
            <div style={{ fontWeight: 700 }}>Get the CRCC app</div>
            <div className="tiny muted">Add to your home screen for quick access</div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              if (canPrompt) {
                await prompt();
                setVisible(false);
              } else setHelp(true);
            }}
          >
            {canPrompt ? 'Install' : 'How'}
          </button>
          <button className="icon-btn" style={{ border: 'none', width: 36 }} onClick={dismiss} aria-label="Dismiss">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      <InstallHelp open={help} onClose={() => { setHelp(false); dismiss(); }} />
    </>
  );
}
