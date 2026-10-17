// ─────────────────────────────────────────────────────────────
// CRCC site configuration
// Fill these in when the church's Firebase project and Paystack
// account are ready. While they are empty the site runs in DEMO
// MODE: content is saved in the browser and no money is charged.
// Values can also come from a .env file (see .env.example).
// ─────────────────────────────────────────────────────────────

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

/** Firebase console → Project settings → Cloud Messaging → Web Push certificates (key pair). */
export const vapidKey: string = env.VITE_FIREBASE_VAPID_KEY ?? '';

export const paystackPublicKey: string = env.VITE_PAYSTACK_PUBLIC_KEY ?? '';

/** URL of the deployed Cloud Function that verifies Paystack payments. */
export const verifyPaymentUrl: string = env.VITE_VERIFY_PAYMENT_URL ?? '';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const isPaystackConfigured = Boolean(paystackPublicKey);
export const isDemo = !isFirebaseConfigured;

export const church = {
  name: 'Christ The Renewal Christian Church',
  shortName: 'CRCC',
  tagline: 'Transforming Lives',
  scripture: 'Romans 12:2',
  founded: '1 December 2013',
  founder: 'Pastor Moses Ayodele Egbeniyi',
  address: 'Atofarati Quarters, beside Coca-Cola, Olode, Ibadan',
  mapsQuery: 'Atofarati Quarters Olode Ibadan',
};
