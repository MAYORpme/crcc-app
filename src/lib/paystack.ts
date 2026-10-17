// Paystack checkout. Payments are only trusted after the server (the
// verifyPayment Cloud Function) confirms them with Paystack's API.
import { isFirebaseConfigured, isPaystackConfigured, paystackPublicKey, verifyPaymentUrl } from '../config';
import { store } from './store';
import type { Gift, GiftType } from '../types';

declare global {
  interface Window {
    PaystackPop?: new () => {
      newTransaction(opts: Record<string, unknown>): void;
    };
  }
}

export interface GiveRequest {
  type: GiftType;
  amount: number; // naira
  email: string;
  name?: string;
  phone?: string;
  anonymous: boolean;
  recurring: boolean;
  projectId?: string;
  projectTitle?: string;
  uid?: string;
  pledgeId?: string;
  orderId?: string;
}

export const newReference = () => `CRCC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

let scriptPromise: Promise<void> | null = null;
function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v2/inline.js';
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not reach Paystack. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Opens Paystack checkout. Resolves with the reference on success, null if the giver closes it. */
export async function payWithPaystack(req: GiveRequest, reference: string): Promise<{ reference: string; channel?: string } | null> {
  await loadPaystack();
  return new Promise((resolve, reject) => {
    try {
      new window.PaystackPop!().newTransaction({
        key: paystackPublicKey,
        email: req.email,
        amount: Math.round(req.amount * 100), // kobo
        currency: 'NGN',
        reference,
        channels: ['card', 'bank_transfer', 'ussd', 'bank'],
        metadata: {
          kind: req.orderId ? 'order' : 'gift',
          uid: req.uid ?? '',
          pledge_id: req.pledgeId ?? '',
          order_id: req.orderId ?? '',
          gift_type: req.type,
          project_id: req.projectId ?? '',
          project_title: req.projectTitle ?? '',
          recurring: req.recurring,
          anonymous: req.anonymous,
          giver_name: req.anonymous ? '' : req.name ?? '',
          phone: req.phone ?? '',
          custom_fields: [
            { display_name: 'Giving type', variable_name: 'gift_type', value: req.projectTitle ? `Project: ${req.projectTitle}` : req.type },
            { display_name: 'Monthly', variable_name: 'recurring', value: req.recurring ? 'Yes' : 'No' },
          ],
        },
        onSuccess: (tx: { reference: string; channel?: string }) => resolve(tx),
        onCancel: () => resolve(null),
        onError: (e: { message?: string }) => reject(new Error(e?.message || 'Payment could not start.')),
      });
    } catch (e) {
      reject(e);
    }
  });
}

/** Asks the server to confirm a payment with Paystack and record it (gift, pledge payment or shop order). */
export async function verifyPayment(reference: string): Promise<{ gift?: Gift; order?: unknown }> {
  const res = await fetch(verifyPaymentUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'We could not confirm this payment yet. Keep your reference: ' + reference);
  return body;
}

export const serverVerifies = () => isFirebaseConfigured && Boolean(verifyPaymentUrl);

/** Records a gift after payment. With the backend live, the server verifies and records it. */
export async function recordGift(req: GiveRequest, reference: string, opts: { demo: boolean; channel?: string }): Promise<Gift> {
  if (!opts.demo && serverVerifies()) {
    const body = await verifyPayment(reference);
    return body.gift as Gift;
  }
  // Demo mode (or Paystack without backend): record in the local store.
  const gift: Gift = {
    id: reference,
    uid: req.uid,
    pledgeId: req.pledgeId,
    reference,
    type: req.type,
    projectId: req.projectId,
    projectTitle: req.projectTitle,
    amount: req.amount,
    name: req.anonymous ? '' : req.name,
    email: req.email,
    phone: req.phone,
    anonymous: req.anonymous,
    recurring: req.recurring,
    status: 'success',
    channel: opts.channel ?? (opts.demo ? 'demo' : 'paystack'),
    createdAt: new Date().toISOString(),
    demo: opts.demo,
  };
  // With Firebase live, only the server may write gifts, so practice gifts stay on this device.
  if (!(opts.demo && isFirebaseConfigured)) await store.add('gifts', gift);
  return gift;
}

export const paymentsLive = isPaystackConfigured;
