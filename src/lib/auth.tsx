// Member accounts. Everyone must sign in to use the site.
// Firebase mode: Firebase Authentication (email/password, Google, phone SMS).
// Demo mode: accounts kept in this browser so the whole flow can be tried.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isFirebaseConfigured } from '../config';
import { getFirebaseApp, setAuditActor, store } from './store';
import { safeLocal } from './format';
import type { AdminRole, Member, Role } from '../types';

export interface AuthUser {
  uid: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  provider: 'password' | 'google' | 'phone';
}

export interface NewProfile {
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  anniversary?: string;
  gender?: Member['gender'];
  area?: string;
  celebrate?: boolean;
  firstTimer?: boolean;
  howHeard?: string;
}

interface AuthState {
  loading: boolean;
  user: AuthUser | null;
  member: Member | null;
  role: Role | null;
  isAdmin: boolean;
  needsProfile: boolean;
  signUpEmail(email: string, password: string, profile: NewProfile): Promise<void>;
  signInEmail(email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>;
  sendPhoneCode(phone: string, recaptchaContainerId: string): Promise<(code: string) => Promise<void>>;
  resetPassword(email: string): Promise<void>;
  createProfile(profile: NewProfile): Promise<void>;
  saveProfile(patch: Partial<Member>): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** Nigerian numbers: 0803… → +234803… */
export function normalizePhone(p: string) {
  const d = p.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (d.startsWith('234')) return '+' + d;
  if (d.startsWith('0')) return '+234' + d.slice(1);
  return '+234' + d;
}

const friendly = (code: string) =>
  ({
    'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/weak-password': 'Use a password of at least 6 characters.',
    'auth/invalid-credential': 'Email or password is not correct.',
    'auth/wrong-password': 'Email or password is not correct.',
    'auth/user-not-found': 'No account uses this email. Create one instead.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/invalid-phone-number': 'Enter a valid phone number, e.g. 0803 123 4567.',
    'auth/invalid-verification-code': 'That code is not correct. Check the SMS and try again.',
    'auth/code-expired': 'That code has expired. Request a new one.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/network-request-failed': 'No internet connection. Check your data and try again.',
  })[code] ?? 'Something went wrong. Please try again.';

// ── Demo accounts (browser only) ────────────────────────────
const DEMO_ACCOUNTS = 'crcc-demo-accounts';
const DEMO_SESSION = 'crcc-demo-auth';
type DemoAccount = { uid: string; hash?: string; email?: string; phone?: string; provider: AuthUser['provider'] };

async function sha(text: string) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('crcc:' + text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'plain:' + text; // non-secure context fallback (demo only)
  }
}

async function demoAccounts(): Promise<Record<string, DemoAccount>> {
  const saved = safeLocal.get<Record<string, DemoAccount> | null>(DEMO_ACCOUNTS, null);
  if (saved) return saved;
  const pw = await sha('crcc2026');
  const seeded: Record<string, DemoAccount> = {
    'admin@crcc.demo': { uid: 'demo-admin', hash: pw, email: 'admin@crcc.demo', provider: 'password' },
    'member@crcc.demo': { uid: 'demo-member', hash: pw, email: 'member@crcc.demo', provider: 'password' },
  };
  safeLocal.set(DEMO_ACCOUNTS, seeded);
  return seeded;
}
const saveDemoAccounts = (a: Record<string, DemoAccount>) => safeLocal.set(DEMO_ACCOUNTS, a);
const toUser = (a: DemoAccount): AuthUser => ({ uid: a.uid, email: a.email, phone: a.phone, provider: a.provider });

/** Keep the public birthday list in step with the member's choice. */
export async function syncCelebrant(m: Pick<Member, 'id' | 'name' | 'photo' | 'birthday' | 'anniversary' | 'celebrate'>) {
  try {
    if (m.celebrate && (m.birthday || m.anniversary))
      await store.set('celebrants', m.id, { name: m.name, photo: m.photo ?? '', birthday: m.birthday ?? '', anniversary: m.anniversary ?? '' });
    else await store.remove('celebrants', m.id);
  } catch {
    /* not critical */
  }
}

function memberFrom(uid: string, p: NewProfile, user: Partial<AuthUser>): Member {
  return {
    id: uid,
    name: p.name.trim(),
    email: (p.email || user.email || '').trim(),
    phone: (p.phone || user.phone || '').trim(),
    birthday: p.birthday || '',
    anniversary: p.anniversary || '',
    gender: p.gender || '',
    area: p.area || '',
    celebrate: p.celebrate ?? true,
    departments: [],
    firstTimer: Boolean(p.firstTimer),
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [memberReady, setMemberReady] = useState(false);
  const [admin, setAdmin] = useState<AdminRole | null>(null);

  // 1. who is signed in
  useEffect(() => {
    if (!isFirebaseConfigured) {
      (async () => {
        const uid = safeLocal.get<string | null>(DEMO_SESSION, null);
        const accounts = await demoAccounts();
        const acc = Object.values(accounts).find((a) => a.uid === uid);
        setUser(acc ? toUser(acc) : null);
        setAuthReady(true);
      })();
      return;
    }
    let unsub = () => {};
    (async () => {
      const app = await getFirebaseApp();
      const { getAuth, onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
      const auth = getAuth(app!);
      getRedirectResult(auth).catch(() => {});
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(
          u
            ? {
                uid: u.uid,
                email: u.email,
                phone: u.phoneNumber,
                displayName: u.displayName,
                provider: (u.providerData[0]?.providerId === 'google.com' ? 'google' : u.phoneNumber ? 'phone' : 'password') as AuthUser['provider'],
              }
            : null,
        );
        setAuthReady(true);
      });
    })();
    return () => unsub();
  }, []);

  // 2. their member profile and admin role
  useEffect(() => {
    if (!user) {
      setMember(null);
      setAdmin(null);
      setMemberReady(true);
      return;
    }
    setMemberReady(false);
    const u1 = store.watch(
      'members',
      user.uid,
      (m) => {
        setMember(m ?? null);
        setMemberReady(true);
      },
      () => setMemberReady(true),
    );
    const u2 = store.watch('admins', user.uid, (a) => setAdmin(a ?? null), () => setAdmin(null));
    return () => {
      u1();
      u2();
    };
  }, [user]);

  // 3. audit actor + last seen
  useEffect(() => {
    setAuditActor(admin && member ? { uid: member.id, name: member.name } : null);
  }, [admin, member]);
  useEffect(() => {
    if (!member) return;
    const today = new Date().toISOString().slice(0, 10);
    if (member.lastSeenAt?.slice(0, 10) !== today) store.set('members', member.id, { lastSeenAt: new Date().toISOString() }).catch(() => {});
  }, [member]);

  const auth = useCallback(async () => {
    const app = await getFirebaseApp();
    const mod = await import('firebase/auth');
    return { mod, auth: mod.getAuth(app!) };
  }, []);

  const createProfile = useCallback(
    async (p: NewProfile) => {
      if (!user) throw new Error('Sign in first.');
      const m = memberFrom(user.uid, p, user);
      await store.set('members', user.uid, m);
      await syncCelebrant(m);
      if (p.firstTimer)
        await store.add('firstTimers', { uid: user.uid, name: m.name, phone: m.phone || '', email: m.email, area: m.area, howHeard: p.howHeard || '', createdAt: m.createdAt }).catch(() => {});
    },
    [user],
  );

  const value = useMemo<AuthState>(() => {
    const role = admin?.role ?? null;
    return {
      loading: !authReady || (Boolean(user) && !memberReady),
      user,
      member,
      role,
      isAdmin: Boolean(role),
      needsProfile: Boolean(user) && memberReady && !member,
      createProfile,

      async signUpEmail(email, password, profile) {
        email = email.trim().toLowerCase();
        if (!isFirebaseConfigured) {
          const accounts = await demoAccounts();
          if (accounts[email]) throw new Error(friendly('auth/email-already-in-use'));
          if (password.length < 6) throw new Error(friendly('auth/weak-password'));
          const acc: DemoAccount = { uid: 'u-' + Math.random().toString(36).slice(2, 10), hash: await sha(password), email, provider: 'password' };
          saveDemoAccounts({ ...accounts, [email]: acc });
          const m = memberFrom(acc.uid, { ...profile, email }, acc);
          await store.set('members', acc.uid, m);
          await syncCelebrant(m);
          if (profile.firstTimer)
            await store.add('firstTimers', { uid: acc.uid, name: m.name, phone: m.phone || '', email, area: m.area, howHeard: profile.howHeard || '', createdAt: m.createdAt });
          safeLocal.set(DEMO_SESSION, acc.uid);
          setUser(toUser(acc));
          return;
        }
        const { mod, auth: a } = await auth();
        try {
          const cred = await mod.createUserWithEmailAndPassword(a, email, password);
          await mod.updateProfile(cred.user, { displayName: profile.name });
          const m = memberFrom(cred.user.uid, { ...profile, email }, { email });
          await store.set('members', cred.user.uid, m);
          await syncCelebrant(m);
          if (profile.firstTimer)
            await store.add('firstTimers', { uid: cred.user.uid, name: m.name, phone: m.phone || '', email, area: m.area, howHeard: profile.howHeard || '', createdAt: m.createdAt });
        } catch (e) {
          throw new Error(friendly((e as { code?: string }).code ?? ''));
        }
      },

      async signInEmail(email, password) {
        email = email.trim().toLowerCase();
        if (!isFirebaseConfigured) {
          const acc = (await demoAccounts())[email];
          if (!acc || acc.hash !== (await sha(password))) throw new Error(friendly('auth/invalid-credential'));
          safeLocal.set(DEMO_SESSION, acc.uid);
          setUser(toUser(acc));
          return;
        }
        const { mod, auth: a } = await auth();
        try {
          await mod.signInWithEmailAndPassword(a, email, password);
        } catch (e) {
          throw new Error(friendly((e as { code?: string }).code ?? ''));
        }
      },

      async signInGoogle() {
        if (!isFirebaseConfigured) {
          const accounts = await demoAccounts();
          const email = 'demo.google@gmail.com';
          const acc = accounts[email] ?? { uid: 'u-google-demo', email, provider: 'google' as const };
          saveDemoAccounts({ ...accounts, [email]: acc });
          safeLocal.set(DEMO_SESSION, acc.uid);
          setUser(toUser(acc));
          return;
        }
        const { mod, auth: a } = await auth();
        const provider = new mod.GoogleAuthProvider();
        const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
        try {
          if (standalone) await mod.signInWithRedirect(a, provider);
          else await mod.signInWithPopup(a, provider);
        } catch (e) {
          throw new Error(friendly((e as { code?: string }).code ?? ''));
        }
      },

      async sendPhoneCode(phoneRaw, containerId) {
        const phone = normalizePhone(phoneRaw);
        if (!/^\+\d{10,15}$/.test(phone)) throw new Error(friendly('auth/invalid-phone-number'));
        if (!isFirebaseConfigured) {
          return async (code: string) => {
            if (code.trim() !== '123456') throw new Error(friendly('auth/invalid-verification-code'));
            const accounts = await demoAccounts();
            const acc = accounts[phone] ?? { uid: 'u-' + phone.replace(/\D/g, ''), phone, provider: 'phone' as const };
            saveDemoAccounts({ ...accounts, [phone]: acc });
            safeLocal.set(DEMO_SESSION, acc.uid);
            setUser(toUser(acc));
          };
        }
        const { mod, auth: a } = await auth();
        try {
          const w = window as unknown as { __crccRecaptcha?: import('firebase/auth').RecaptchaVerifier };
          w.__crccRecaptcha?.clear();
          w.__crccRecaptcha = new mod.RecaptchaVerifier(a, containerId, { size: 'invisible' });
          const result = await mod.signInWithPhoneNumber(a, phone, w.__crccRecaptcha);
          return async (code: string) => {
            try {
              await result.confirm(code.trim());
            } catch (e) {
              throw new Error(friendly((e as { code?: string }).code ?? ''));
            }
          };
        } catch (e) {
          throw new Error(friendly((e as { code?: string }).code ?? ''));
        }
      },

      async resetPassword(email) {
        if (!isFirebaseConfigured) return; // demo: nothing to send
        const { mod, auth: a } = await auth();
        try {
          await mod.sendPasswordResetEmail(a, email.trim());
        } catch (e) {
          const code = (e as { code?: string }).code ?? '';
          if (code !== 'auth/user-not-found') throw new Error(friendly(code));
        }
      },

      async saveProfile(patch) {
        if (!user) return;
        const { id: _drop, blocked: _b, ...rest } = patch;
        void _drop;
        void _b;
        await store.set('members', user.uid, rest);
        if (member && ['name', 'photo', 'birthday', 'anniversary', 'celebrate'].some((k) => k in rest)) await syncCelebrant({ ...member, ...rest });
      },

      async signOut() {
        if (!isFirebaseConfigured) {
          safeLocal.set(DEMO_SESSION, null);
          setUser(null);
          return;
        }
        const { mod, auth: a } = await auth();
        await mod.signOut(a);
      },
    };
  }, [authReady, user, member, memberReady, admin, auth, createProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx)!;
