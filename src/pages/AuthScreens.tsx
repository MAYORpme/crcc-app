import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { asset, useDocumentTitle } from '../components/ui';
import { church, isDemo } from '../config';
import { useAuth, type NewProfile } from '../lib/auth';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Month + day picker stored as MM-DD (no year, for privacy). */
export function MonthDay({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange(v: string): void; hint?: string }) {
  const [m, d] = value ? value.split('-') : ['', ''];
  const days = m ? new Date(2024, Number(m), 0).getDate() : 31;
  const set = (mm: string, dd: string) => onChange(mm && dd ? `${mm}-${dd}` : mm ? `${mm}-01` : '');
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label" style={{ padding: 0, marginBottom: 6 }}>{label}</legend>
      <div className="row gap-8">
        <select id={`${id}-m`} aria-label={`${label} month`} className="select" value={m} onChange={(e) => set(e.target.value, d || '01')}>
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
          ))}
        </select>
        <select id={`${id}-d`} aria-label={`${label} day`} className="select" style={{ maxWidth: 110 }} value={d} disabled={!m} onChange={(e) => set(m, e.target.value)}>
          <option value="">Day</option>
          {Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0')).map((x) => (
            <option key={x} value={x}>{Number(x)}</option>
          ))}
        </select>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </fieldset>
  );
}

function Shell({ children, title }: { children: ReactNode; title: string }) {
  useDocumentTitle(title);
  return (
    <div className="auth">
      <aside className="auth-side">
        <img src={asset('/images/logo-white.png')} alt="CRCC — Transforming Lives" className="auth-logo" />
        <div className="auth-side-copy">
          <p className="eyebrow" style={{ opacity: 0.8 }}>Members’ app</p>
          <h1>{church.name}</h1>
          <p style={{ opacity: 0.88 }}>Give, listen to sermons, read the daily devotional and stay connected with the church family.</p>
        </div>
        <p className="tiny" style={{ opacity: 0.7 }}>{church.address}</p>
      </aside>
      <main className="auth-main">
        <img src={asset('/images/logo.png')} alt="CRCC — Transforming Lives" className="auth-logo-sm" />
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}

function DemoHint() {
  if (!isDemo) return null;
  return (
    <div className="demo-ribbon" style={{ borderRadius: 12, textAlign: 'left', padding: '10px 14px' }}>
      <b>Demo accounts</b> (password <b>crcc2026</b>): <br />
      admin@crcc.demo (church admin) · member@crcc.demo
      <br />
      Phone sign-in code: <b>123456</b>
    </div>
  );
}

function ProfileFields({ p, set, askEmail, askPhone }: { p: NewProfile; set: (patch: Partial<NewProfile>) => void; askEmail?: boolean; askPhone?: boolean }) {
  return (
    <>
      <div className="field">
        <label htmlFor="pf-name">Full name</label>
        <input id="pf-name" className="input" autoComplete="name" value={p.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      {askPhone && (
        <div className="field">
          <label htmlFor="pf-phone">Phone number</label>
          <input id="pf-phone" className="input" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={p.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
        </div>
      )}
      {askEmail && (
        <div className="field">
          <label htmlFor="pf-email">Email (for receipts)</label>
          <input id="pf-email" className="input" type="email" autoComplete="email" value={p.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </div>
      )}
      <div className="form-grid two">
        <MonthDay id="pf-bday" label="Birthday (optional)" value={p.birthday ?? ''} onChange={(v) => set({ birthday: v })} />
        <div className="field">
          <label htmlFor="pf-area">Area you live in</label>
          <input id="pf-area" className="input" placeholder="e.g. Olode" value={p.area ?? ''} onChange={(e) => set({ area: e.target.value })} />
        </div>
      </div>
      <label className="switch">
        <input type="checkbox" checked={Boolean(p.firstTimer)} onChange={(e) => set({ firstTimer: e.target.checked })} />
        This is my first time at CRCC
      </label>
      {p.firstTimer && (
        <div className="field">
          <label htmlFor="pf-how">How did you hear about us?</label>
          <select id="pf-how" className="select" value={p.howHeard ?? ''} onChange={(e) => set({ howHeard: e.target.value })}>
            <option value="">Choose one</option>
            <option>Friend or family</option>
            <option>Social media</option>
            <option>Passed by the church</option>
            <option>Event or outreach</option>
            <option>Other</option>
          </select>
        </div>
      )}
    </>
  );
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function AuthScreens() {
  const auth = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'phone'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<NewProfile>({ name: '', celebrate: true });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<((c: string) => Promise<void>) | null>(null);

  useEffect(() => {
    setErr('');
    setInfo('');
  }, [mode]);

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = (
    <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => run(auth.signInGoogle)}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </button>
  );
  const phoneBtn = (
    <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => setMode('phone')}>
      <Icon name="phone" size={18} /> Continue with phone number
    </button>
  );
  const divider = (
    <div className="row gap-12 tiny muted" style={{ margin: '4px 0' }}>
      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} /> or <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );

  if (mode === 'phone')
    return (
      <Shell title="Sign in with phone">
        <h2 className="auth-title">Sign in with your phone</h2>
        {!confirm ? (
          <form
            className="stack gap-16"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const c = await auth.sendPhoneCode(phone, 'recaptcha-box');
                setConfirm(() => c);
                setInfo(isDemo ? 'Demo mode: use the code 123456.' : 'We sent a 6-digit code by SMS.');
              });
            }}
          >
            <p className="muted">We’ll text you a code. New here? An account is created for you.</p>
            <div className="field">
              <label htmlFor="ph">Phone number</label>
              <input id="ph" className="input" type="tel" autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {err && <p className="error-text" role="alert">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || phone.replace(/\D/g, '').length < 10}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form
            className="stack gap-16"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => confirm(code));
            }}
          >
            {info && <p className="small" style={{ color: 'var(--ok)' }}>{info}</p>}
            <div className="field">
              <label htmlFor="code">6-digit code</label>
              <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ letterSpacing: '0.4em', fontSize: 22, textAlign: 'center' }} />
            </div>
            {err && <p className="error-text" role="alert">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify and continue'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setConfirm(null); setCode(''); }}>Use a different number</button>
          </form>
        )}
        <div id="recaptcha-box" />
        <button type="button" className="linkish" onClick={() => setMode('signin')}>← Other ways to sign in</button>
      </Shell>
    );

  if (mode === 'forgot')
    return (
      <Shell title="Reset password">
        <h2 className="auth-title">Reset your password</h2>
        {info ? (
          <div className="stack gap-16">
            <p>{info}</p>
            <button className="btn btn-primary" onClick={() => setMode('signin')}>Back to sign in</button>
          </div>
        ) : (
          <form
            className="stack gap-16"
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailOk(email)) return setErr('Enter the email you signed up with.');
              run(async () => {
                await auth.resetPassword(email);
                setInfo(isDemo ? 'Demo mode: no email is sent. Use the demo password crcc2026.' : `If an account uses ${email}, a reset link is on its way. Check your inbox and spam folder.`);
              });
            }}
          >
            <p className="muted">Enter your email and we’ll send you a link to choose a new password.</p>
            <div className="field">
              <label htmlFor="fe">Email</label>
              <input id="fe" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <p className="error-text" role="alert">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
        <button type="button" className="linkish" onClick={() => setMode('signin')}>← Back to sign in</button>
      </Shell>
    );

  if (mode === 'signup')
    return (
      <Shell title="Create account">
        <h2 className="auth-title">Create your account</h2>
        <form
          className="stack gap-16"
          onSubmit={(e) => {
            e.preventDefault();
            if (profile.name.trim().length < 2) return setErr('Enter your full name.');
            if (!emailOk(email)) return setErr('Enter a valid email address.');
            if (password.length < 6) return setErr('Use a password of at least 6 characters.');
            run(() => auth.signUpEmail(email, password, profile));
          }}
          noValidate
        >
          <ProfileFields p={profile} set={(x) => setProfile({ ...profile, ...x })} askPhone />
          <div className="field">
            <label htmlFor="su-email">Email</label>
            <input id="su-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="su-pass">Password</label>
            <div className="row gap-8">
              <input id="su-pass" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            </div>
            <span className="hint">At least 6 characters.</span>
          </div>
          {err && <p className="error-text" role="alert">{err}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          {divider}
          {google}
          {phoneBtn}
        </form>
        <p className="center small">
          Already a member? <button type="button" className="linkish" onClick={() => setMode('signin')}>Sign in</button>
        </p>
      </Shell>
    );

  return (
    <Shell title="Sign in">
      <h2 className="auth-title">Welcome back</h2>
      <p className="muted" style={{ marginTop: -8 }}>Sign in to continue to the CRCC app.</p>
      <form
        className="stack gap-16"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => auth.signInEmail(email, password));
        }}
      >
        <div className="field">
          <label htmlFor="si-email">Email</label>
          <input id="si-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label htmlFor="si-pass">Password</label>
            <button type="button" className="linkish small" onClick={() => setMode('forgot')}>Forgot password?</button>
          </div>
          <div className="row gap-8">
            <input id="si-pass" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        {err && <p className="error-text" role="alert">{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      {divider}
      <div className="stack gap-8">
        {google}
        {phoneBtn}
      </div>
      <p className="center small">
        New to CRCC? <button type="button" className="linkish" onClick={() => setMode('signup')}>Create an account</button>
      </p>
      <DemoHint />
    </Shell>
  );
}

/** After Google or phone sign-in, new members fill in their details once. */
export function CompleteProfile() {
  const auth = useAuth();
  const [p, setP] = useState<NewProfile>({
    name: auth.user?.displayName ?? '',
    email: auth.user?.email ?? '',
    phone: auth.user?.phone ?? '',
    celebrate: true,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Complete your profile">
      <h2 className="auth-title">One more step</h2>
      <p className="muted" style={{ marginTop: -8 }}>Tell us a little about you so the church can stay in touch.</p>
      <form
        className="stack gap-16"
        onSubmit={async (e) => {
          e.preventDefault();
          if (p.name.trim().length < 2) return setErr('Enter your full name.');
          setBusy(true);
          setErr('');
          try {
            await auth.createProfile(p);
          } catch (x) {
            setErr((x as Error).message || 'Could not save. Try again.');
          } finally {
            setBusy(false);
          }
        }}
        noValidate
      >
        <ProfileFields p={p} set={(x) => setP({ ...p, ...x })} askEmail={!auth.user?.email} askPhone={!auth.user?.phone} />
        {err && <p className="error-text" role="alert">{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
        <button type="button" className="linkish" onClick={auth.signOut}>Sign out</button>
      </form>
    </Shell>
  );
}

export function Blocked() {
  const auth = useAuth();
  return (
    <Shell title="Account paused">
      <h2 className="auth-title">Your account is paused</h2>
      <p className="muted">Please contact the church office if you think this is a mistake.</p>
      <button className="btn btn-ghost" onClick={auth.signOut}>Sign out</button>
    </Shell>
  );
}

export function Splash() {
  return (
    <div className="splash" aria-busy="true" aria-label="Loading">
      <img src={asset('/images/logo.png')} alt="CRCC" />
    </div>
  );
}
