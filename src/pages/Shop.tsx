import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal, asset, useDocumentTitle, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { store, useCollection } from '../lib/store';
import { fmtDate, naira, safeLocal } from '../lib/format';
import { newReference, payWithPaystack, paymentsLive, serverVerifies, verifyPayment } from '../lib/paystack';
import type { Order, OrderItem, Product } from '../types';

const CART = 'crcc-cart';
const STATUS: Record<Order['status'], string> = {
  pending: 'Awaiting payment',
  paid: 'Paid · being prepared',
  ready: 'Ready for pickup',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

export default function Shop() {
  useDocumentTitle('Bookshop');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'orders' ? 'orders' : 'shop';
  const { member } = useAuth();
  const toast = useToast();
  const { items } = useCollection('products');
  const { items: orders } = useCollection('orders', member ? { field: 'uid', op: '==', value: member.id } : null);
  const [cat, setCat] = useState<'All' | Product['category']>('All');
  const [cart, setCart] = useState<OrderItem[]>(() => safeLocal.get(CART, []));
  const [view, setView] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const products = items.filter((p) => p.active && (cat === 'All' || p.category === cat));
  const save = (c: OrderItem[]) => {
    setCart(c);
    safeLocal.set(CART, c);
  };
  const add = (p: Product) => {
    const cur = cart.find((c) => c.productId === p.id);
    if ((cur?.qty ?? 0) >= p.stock) return toast('No more in stock');
    save(cur ? cart.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + 1 } : c)) : [...cart, { productId: p.id, name: p.name, price: p.price, qty: 1 }]);
    toast(`${p.name} added to cart`);
  };
  const setQty = (id: string, qty: number) => save(qty <= 0 ? cart.filter((c) => c.productId !== id) : cart.map((c) => (c.productId === id ? { ...c, qty } : c)));
  const total = cart.reduce((n, c) => n + c.price * c.qty, 0);
  const count = cart.reduce((n, c) => n + c.qty, 0);

  const pay = async () => {
    if (!member) return;
    setErr('');
    if (phone.replace(/\D/g, '').length < 10) return setErr('Enter a phone number so we can tell you when it’s ready.');
    const email = member.email || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Add an email address to your profile for the receipt.');
    setBusy(true);
    try {
      const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
      const order: Order = { id: orderId, uid: member.id, name: member.name, phone, email, items: cart, total, status: 'pending', createdAt: new Date().toISOString() };
      await store.add('orders', order);
      const req = { type: 'Shop' as const, amount: total, email, name: member.name, phone, anonymous: false, recurring: false, orderId, uid: member.id };
      let reference = newReference();
      let demo = true;
      if (paymentsLive) {
        const tx = await payWithPaystack(req, reference);
        if (!tx) {
          setBusy(false);
          return; // closed checkout; order stays "awaiting payment"
        }
        reference = tx.reference;
        demo = false;
      }
      if (!demo && serverVerifies()) await verifyPayment(reference);
      else {
        // the live server does this itself after verifying payment
        await store.set('orders', orderId, { status: 'paid', reference, demo });
        for (const c of cart) await store.atomic('products', c.productId, { op: 'increment', field: 'stock', value: -c.qty });
      }
      save([]);
      setCheckout(false);
      setParams({ tab: 'orders' });
      toast(demo ? 'Practice order placed. No money was charged.' : 'Order paid. We’ll let you know when it’s ready.');
    } catch (e) {
      setErr((e as Error).message || 'Payment could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="row gap-12 wrap" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Bookshop</h1>
          <p className="page-sub">Pay online, pick up at church.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCheckout(true)} disabled={!count}>
          <Icon name="cart" size={18} /> Cart{count ? ` · ${count}` : ''}
        </button>
      </div>
      <div className="chips" role="group" aria-label="Show" style={{ marginBottom: 20 }}>
        <button className="chip" aria-pressed={tab === 'shop'} onClick={() => setParams({})}>Shop</button>
        <button className="chip" aria-pressed={tab === 'orders'} onClick={() => setParams({ tab: 'orders' })}>My orders{orders.length ? ` (${orders.length})` : ''}</button>
      </div>

      {tab === 'orders' ? (
        orders.length ? (
          <div className="stack gap-12">
            {[...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => (
              <div key={o.id} className="card card-pad stack gap-8">
                <div className="row gap-8 wrap" style={{ justifyContent: 'space-between' }}>
                  <b>{o.id}</b>
                  <span className={`pill ${o.status === 'ready' || o.status === 'collected' ? 'on' : o.status === 'cancelled' ? 'warn' : ''}`}>{STATUS[o.status]}{o.demo ? ' (practice)' : ''}</span>
                </div>
                <span className="small muted">{fmtDate(o.createdAt)} · {o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</span>
                <b>{naira(o.total)}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">Your orders will appear here.</div>
        )
      ) : (
        <>
          <div className="chips scroll" role="group" aria-label="Category" style={{ marginBottom: 20 }}>
            {(['All', 'Books', 'Media', 'Merchandise'] as const).map((c) => (
              <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          {products.length ? (
            <div className="product-grid">
              {products.map((p) => (
                <article key={p.id} className="product">
                  <button className="product-img" onClick={() => setView(p)} aria-label={`View ${p.name}`}>
                    {p.image ? <img src={asset(p.image)} alt="" loading="lazy" /> : <Icon name={p.category === 'Books' ? 'book' : p.category === 'Media' ? 'headphones' : 'star'} size={36} />}
                  </button>
                  <div className="stack gap-4" style={{ padding: '12px 14px 14px' }}>
                    <span className="row-title" style={{ fontSize: 15 }}>{p.name}</span>
                    <span className="small muted">{p.category}</span>
                    <div className="row gap-8" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                      <b>{naira(p.price)}</b>
                      {p.stock > 0 ? (
                        <button className="round-btn" style={{ width: 40, height: 40 }} onClick={() => add(p)} aria-label={`Add ${p.name} to cart`}><Icon name="plus" size={18} /></button>
                      ) : (
                        <span className="pill">Sold out</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">No items here yet.</div>
          )}
        </>
      )}

      <Modal open={Boolean(view)} onClose={() => setView(null)} title={view?.name ?? ''}>
        {view && (
          <div className="stack gap-16">
            {view.image && <img src={asset(view.image)} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 320, objectFit: 'cover' }} />}
            <p>{view.description}</p>
            <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
              <b style={{ fontSize: 20 }}>{naira(view.price)}</b>
              <span className="small muted">{view.stock > 0 ? `${view.stock} in stock` : 'Sold out'}</span>
            </div>
            <button className="btn btn-primary" disabled={view.stock < 1} onClick={() => { add(view); setView(null); }}>Add to cart</button>
          </div>
        )}
      </Modal>

      <Modal open={checkout} onClose={() => setCheckout(false)} title="Your cart">
        <div className="stack gap-16">
          {cart.map((c) => (
            <div key={c.productId} className="row gap-12">
              <div className="grow">
                <div className="row-title" style={{ fontSize: 15 }}>{c.name}</div>
                <div className="row-meta">{naira(c.price)} each</div>
              </div>
              <div className="qty">
                <button aria-label={`One less ${c.name}`} onClick={() => setQty(c.productId, c.qty - 1)}><Icon name="minus" size={16} /></button>
                <span aria-live="polite">{c.qty}</span>
                <button aria-label={`One more ${c.name}`} onClick={() => { const p = items.find((x) => x.id === c.productId); if (!p || c.qty < p.stock) setQty(c.productId, c.qty + 1); }}><Icon name="plus" size={16} /></button>
              </div>
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <b>Total</b><b style={{ fontSize: 20 }}>{naira(total)}</b>
          </div>
          <div className="field">
            <label htmlFor="sh-phone">Phone (we’ll tell you when it’s ready)</label>
            <input id="sh-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <p className="small muted"><Icon name="pin" size={14} /> Pick up at the church office after service.</p>
          {err && <p className="error-text" role="alert">{err}</p>}
          <button className="btn btn-give btn-lg" disabled={busy || !count} onClick={pay}>{busy ? 'Opening checkout…' : `Pay ${naira(total)}`}</button>
          {!paymentsLive && <p className="tiny muted center">Practice mode: no money is charged.</p>}
        </div>
      </Modal>
    </div>
  );
}
