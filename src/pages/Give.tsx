import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal, PageHead, Progress, asset, useDocumentTitle, useToast } from '../components/ui';
import { store, useCollection, useSettings } from '../lib/store';
import { fmtDate, naira, pctLabel } from '../lib/format';
import { newReference, payWithPaystack, paymentsLive, recordGift, type GiveRequest } from '../lib/paystack';
import type { Gift, GiftType } from '../types';
import { isFirebaseConfigured } from '../config';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';

const TYPES: GiftType[] = ['Tithe', 'Offering', 'Thanksgiving', 'Seed', 'Project'];
const PRESETS = [1000, 5000, 10000, 20000];
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function Give() {
  useDocumentTitle('Give');
  const [params] = useSearchParams();
  const settings = useSettings();
  const toast = useToast();
  const { items: allProjects } = useCollection('projects');
  const projects = allProjects.filter((p) => p.active).sort((a, b) => a.order - b.order);

  const { member } = useAuth();
  const pledgeId = params.get('pledge') ?? '';
  const { items: myPledges } = useCollection('pledges', member && pledgeId ? { field: 'uid', op: '==', value: member.id } : null);
  const pledge = myPledges.find((p) => p.id === pledgeId);
  const { items: myGifts } = useCollection('gifts', member ? { field: 'uid', op: '==', value: member.id } : null);
  const mine = useMemo(() => [...myGifts].filter((g) => g.status === 'success').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [myGifts]);
  const [type, setType] = useState<GiftType>(pledgeId ? 'Pledge' : params.get('project') ? 'Project' : 'Tithe');
  const [projectId, setProjectId] = useState<string>(params.get('project') ?? '');
  const [amount, setAmount] = useState('10000');
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [pledgeAmountSet, setPledgeAmountSet] = useState(false);
  if (pledge && !pledgeAmountSet) {
    setPledgeAmountSet(true);
    setAmount(String(Math.max(100, pledge.amount - pledge.paid)));
  }
  const [anonymous, setAnonymous] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoConfirm, setDemoConfirm] = useState<GiveRequest | null>(null);
  const [receipt, setReceipt] = useState<Gift | null>(null);

  const value = Number(amount.replace(/\D/g, '')) || 0;
  const project = projects.find((p) => p.id === projectId);
  const canRecur = type === 'Tithe' || type === 'Offering' || type === 'Seed';

  const label = useMemo(() => {
    if (type === 'Pledge') return `Pay ${naira(value)} towards my pledge`;
    const what = type === 'Project' ? (project ? project.title : 'project') : type.toLowerCase();
    return `Give ${naira(value)} ${type === 'Project' ? 'to ' : ''}${what}${recurring && canRecur ? ' monthly' : ''}`;
  }, [type, project, value, recurring, canRecur]);

  const finish = async (req: GiveRequest, reference: string, demo: boolean, channel?: string) => {
    const gift = await recordGift(req, reference, { demo, channel });
    // In demo mode the browser updates totals; the live server does this itself after verifying payment.
    if (!isFirebaseConfigured) {
      if (req.projectId) await store.atomic('projects', req.projectId, { op: 'increment', field: 'raised', value: req.amount });
      if (req.pledgeId) await store.atomic('pledges', req.pledgeId, { op: 'increment', field: 'paid', value: req.amount });
    }
    setReceipt(gift);
  };

  const submit = async () => {
    setError('');
    if (value < 100) return setError('Enter an amount of at least ₦100.');
    if (type === 'Project' && !project) return setError('Choose a project to support.');
    if (type === 'Pledge' && !pledge) return setError('That pledge could not be found.');
    if (!emailOk(email)) return setError('Enter a valid email address for your receipt.');
    const pledgeProject = pledge?.projectId ? projects.find((p) => p.id === pledge.projectId) : undefined;
    const req: GiveRequest = {
      type,
      amount: value,
      email: email.trim(),
      name: name.trim(),
      phone: phone.trim(),
      anonymous,
      recurring: recurring && canRecur,
      projectId: type === 'Project' ? project?.id : type === 'Pledge' ? pledgeProject?.id : undefined,
      projectTitle: type === 'Project' ? project?.title : type === 'Pledge' ? `Pledge: ${pledge?.title}` : undefined,
      uid: member?.id,
      pledgeId: type === 'Pledge' ? pledge?.id : undefined,
    };
    if (!paymentsLive) return setDemoConfirm(req);
    setBusy(true);
    try {
      const ref = newReference();
      const tx = await payWithPaystack(req, ref);
      if (tx) await finish(req, tx.reference, false, tx.channel);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied');
    } catch {
      toast(text);
    }
  };

  return (
    <div className="container page">
      <PageHead title="Give" sub="“Every man according as he purposeth in his heart, so let him give.” 2 Corinthians 9:7" />

      <div className="give-layout">
        <div className="stack gap-24">
          {type === 'Pledge' && pledge && (
            <div className="soft card-pad stack gap-8">
              <span className="eyebrow" style={{ color: 'var(--blue)' }}>Paying towards your pledge</span>
              <b>{pledge.title}</b>
              <Progress value={(pledge.paid / pledge.amount) * 100} label="Pledge progress" />
              <span className="small muted">{naira(pledge.paid)} paid of {naira(pledge.amount)} · {naira(Math.max(0, pledge.amount - pledge.paid))} left</span>
            </div>
          )}
          <section className="stack gap-12" hidden={type === 'Pledge'}>
            <h2 className="label" style={{ fontFamily: 'var(--font)' }}>What are you giving?</h2>
            <div className="chips" role="group" aria-label="Giving type">
              {TYPES.map((t) => (
                <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          {type === 'Project' && (
            <section className="stack gap-12">
              <h2 className="label" style={{ fontFamily: 'var(--font)' }}>Choose a project</h2>
              <div className="projects-grid">
                {projects.map((p) => (
                  <button key={p.id} className="project-card" aria-pressed={projectId === p.id} onClick={() => setProjectId(p.id)}>
                    {p.image && <img src={asset(p.image)} alt="" />}
                    <div className="pc-body">
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <span className="row-title">{p.title}</span>
                        <span className="small" style={{ fontWeight: 700, color: 'var(--blue)' }}>
                          {pctLabel(p.raised, p.target)}
                        </span>
                      </div>
                      <Progress value={(p.raised / p.target) * 100} label={`${p.title} progress`} />
                      <span className="tiny muted">
                        {naira(p.raised)} raised of {naira(p.target)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="amount-box">
            <label htmlFor="amt" className="label">Amount</label>
            <div className="amount-input">
              <span>₦</span>
              <input
                id="amt"
                inputMode="numeric"
                autoComplete="off"
                value={value ? value.toLocaleString('en-NG') : ''}
                placeholder="0"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="preset" role="group" aria-label="Quick amounts">
              {PRESETS.map((p) => (
                <button key={p} aria-pressed={value === p} onClick={() => setAmount(String(p))}>
                  ₦{p / 1000}k
                </button>
              ))}
            </div>
          </section>

          {canRecur && (
            <label className="toggle-card">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 700 }}>Give this every month</span>
                <span className="tiny muted" style={{ display: 'block' }}>
                  Card payments only. We charge the same card on this date each month; contact the church office to stop.
                </span>
              </span>
            </label>
          )}

          <section className="stack gap-14" style={{ gap: 14 }}>
            <h2 className="label" style={{ fontFamily: 'var(--font)' }}>Your details</h2>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="g-name">Full name</label>
                <input id="g-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={anonymous} />
              </div>
              <div className="field">
                <label htmlFor="g-phone">Phone (optional)</label>
                <input id="g-phone" className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="g-email">Email for your receipt</label>
              <input id="g-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <label className="switch">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              Give anonymously (your name is not recorded)
            </label>
          </section>

          {error && <p className="error-text" role="alert">{error}</p>}

          <button className="btn btn-give btn-lg btn-block" onClick={submit} disabled={busy}>
            {busy ? 'Opening secure checkout…' : label}
          </button>
          <p className="row gap-8 tiny muted" style={{ justifyContent: 'center' }}>
            <Icon name="lock" size={14} /> Card, bank transfer or USSD · secured by Paystack · receipt sent to your email
          </p>
        </div>

        <aside className="give-side stack gap-16">
          {settings.accountNumber ? (
            <div className="soft card-pad stack gap-12">
              <h2 style={{ fontSize: 18 }}>Prefer a direct transfer?</h2>
              <div className="bank">
                <div className="bank-row"><span className="muted small">Bank</span><b>{settings.bankName}</b></div>
                <div className="bank-row"><span className="muted small">Account name</span><b style={{ textAlign: 'right' }}>{settings.accountName}</b></div>
                <div className="bank-row">
                  <span className="muted small">Account number</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => copy(settings.accountNumber)}>
                    <b>{settings.accountNumber}</b> <Icon name="copy" size={16} />
                  </button>
                </div>
              </div>
              <p className="tiny muted">Use your name and the giving type (e.g. “Tithe”) as the transfer narration.</p>
            </div>
          ) : (
            <div className="soft card-pad stack gap-8">
              <h2 style={{ fontSize: 18 }}>Direct bank transfer</h2>
              <p className="small muted">The church’s account details will appear here once the admin adds them.</p>
            </div>
          )}

          {mine.length > 0 && (
            <div className="card card-pad stack gap-8">
              <h2 style={{ fontSize: 18 }}>Your recent gifts</h2>
              <Link to="/profile" className="tiny">Full history and yearly statement</Link>
              {mine.slice(0, 5).map((g) => (
                <button key={g.reference} className="media-row" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '10px 0' }} onClick={() => setReceipt(g)}>
                  <div className="grow">
                    <div className="row-title" style={{ fontSize: 15 }}>{g.projectTitle || g.type}</div>
                    <div className="row-meta">{fmtDate(g.createdAt)}</div>
                  </div>
                  <b>{naira(g.amount)}</b>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      <Modal open={Boolean(demoConfirm)} onClose={() => setDemoConfirm(null)} title="Demo checkout">
        {demoConfirm && (
          <div className="stack gap-16">
            <p className="muted">
              Online payments are not switched on yet, so this is a practice run. No money will be charged. Once the church’s Paystack account is
              connected, this step opens the real secure checkout.
            </p>
            <div className="receipt">
              <div><span>Giving</span><b>{demoConfirm.projectTitle || demoConfirm.type}</b></div>
              <div><span>Amount</span><b>{naira(demoConfirm.amount)}</b></div>
              <div><span>Email</span><span>{demoConfirm.email}</span></div>
            </div>
            <button
              className="btn btn-give btn-block"
              onClick={async () => {
                const req = demoConfirm;
                setDemoConfirm(null);
                await finish(req, newReference(), true);
              }}
            >
              Complete practice gift
            </button>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Thank you">
        {receipt && (
          <div className="stack gap-16 center">
            <div className="success-ic">
              <Icon name="check" size={32} />
            </div>
            <div>
              <div className="page-title" style={{ fontSize: 28 }}>{naira(receipt.amount)}</div>
              <p className="muted">{receipt.projectTitle ? `for ${receipt.projectTitle}` : receipt.type}{receipt.recurring ? ' · monthly' : ''}</p>
            </div>
            <p>God bless you for your giving. {receipt.demo ? 'This was a practice gift; no money was charged.' : 'A receipt has been sent to your email.'}</p>
            <div className="receipt" style={{ textAlign: 'left' }}>
              <div><span>Reference</span><b style={{ fontSize: 13 }}>{receipt.reference}</b></div>
              <div><span>Date</span><span>{fmtDate(receipt.createdAt)}</span></div>
              {!receipt.anonymous && receipt.name && <div><span>Name</span><span>{receipt.name}</span></div>}
              <div><span>Status</span><span style={{ color: 'var(--ok)', fontWeight: 700 }}>{receipt.demo ? 'Practice' : 'Successful'}</span></div>
            </div>
            <div className="row gap-12">
              <button className="btn btn-ghost grow" onClick={() => window.print()}>Print</button>
              <button className="btn btn-primary grow" onClick={() => setReceipt(null)}>Done</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
