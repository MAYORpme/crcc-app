# CRCC members’ app (website + installable app)

The app for **Christ The Renewal Christian Church**, Olode, Ibadan. It is a website that installs like an app (PWA): members open a
link, sign in, and can add it to their phone’s home screen. **Nothing is visible until a member signs in.**

## What’s inside

**Members**
- Sign in with email + password, Google, or phone number (SMS code). Forgot password. First-timers are flagged at sign-up for follow-up.
- Home: announcement bar, live/latest message, adverts, today’s devotional, birthdays this week, pledge reminders, events.
- Give: tithe, offering, thanksgiving, seed, projects, monthly giving, pay towards a pledge, bank transfer details, receipts.
- Profile: details, photo, giving history, **yearly giving statement** (print/PDF/Excel), notification settings.
- Sermons (audio player, offline downloads, YouTube), Live, Oxygen Class (lessons by quarter), Events (registration, calendar).
- Daily devotional (with archive), **Bible (KJV)** reader, **reading plans** with progress.
- Prayer wall (public or pastors-only, “I prayed”), Testimonies (reviewed before publishing), Departments (join, updates),
  House fellowships (find by area), Gallery.
- Pledges, Counselling booking, QR check-in at service, Bookshop (pay online, pick up at church), Notifications inbox + phone push.

**Admins** (`/admin`, role-based)
| Role | Can manage |
| --- | --- |
| Super admin | Everything, plus members, roles, pausing accounts, settings, audit log |
| Media | Sermons, Oxygen Class, devotionals, reading plans, gallery, going live |
| Communications | Announcements, adverts, events, notifications, departments + updates, house fellowships, going live |
| Finance | Giving, projects, pledges, bookshop products and orders |
| Pastoral | First-timers, prayer requests (incl. private), testimonies, counselling, attendance (QR) |

Every admin change is recorded in the **audit log**.

## Run it on your computer

```bash
npm install
npm run dev        # http://localhost:5173
```

With no `.env` file it runs in **demo mode** (everything saved in your browser, practice payments):

| Account | Password |
| --- | --- |
| admin@crcc.demo (super admin) | crcc2026 |
| member@crcc.demo | crcc2026 |
| Phone sign-in, any number | code 123456 |

## Going live (one-time setup)

Use a church Google account (e.g. crccmedia@gmail.com) so the church owns everything; add yourself as developer.

### 1. Firebase project
1. <https://console.firebase.google.com> → **Add project** (e.g. `crcc-live`; make a second `crcc-staging` for testing).
2. Upgrade to **Blaze** (pay-as-you-go; a church this size normally stays in the free allowance, but a card is required).
3. **Authentication → Sign-in method:** enable **Email/Password**, **Google** and **Phone**.
   Under **Settings → Authorized domains** add your domain if you use a custom one.
   Phone sign-in sends SMS, which Firebase charges per message.
4. **Firestore Database** → Create (production mode, region `europe-west1`).
5. **Storage** → Get started.
6. **Project settings → Your apps → Web (`</>`)** → copy the config into `.env` (see `.env.example`).
7. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** → `VITE_FIREBASE_VAPID_KEY`.

### 2. Deploy
```bash
npm install -g firebase-tools
firebase login
firebase use --add                                   # pick the project
cd functions && npm install && cd ..
firebase functions:secrets:set PAYSTACK_SECRET_KEY   # Paystack SECRET key (sk_test_… first)
npm run build
firebase deploy                                      # site + security rules + functions
```
Copy the printed `verifyPayment` URL into `.env` as `VITE_VERIFY_PAYMENT_URL`, then `npm run build && firebase deploy --only hosting`.

### 3. First super admin
1. Open the site and **create your account** normally.
2. Firebase console → **Authentication → Users** → copy your **UID**.
3. **Firestore → Start collection** `admins` → document ID = your UID → field `role` = `super`.
4. Refresh. You now see **Church admin** under More. Give other people roles from **Members & roles** (no console needed).
5. **Admin → Settings → Load sample content** to start from the sample pages, then edit them.

### 4. Paystack
1. Paystack dashboard → **Settings → API Keys & Webhooks**.
2. **Public** key → `VITE_PAYSTACK_PUBLIC_KEY`. The **secret** key only goes in `firebase functions:secrets:set`.
3. **Webhook URL** → the `paystackWebhook` function URL.
4. Test with test keys and Paystack’s test cards, then switch to live keys.

### 5. Offline sermon downloads
```bash
gsutil cors set storage-cors.json gs://<your-storage-bucket>
```

### 6. Custom domain (optional)
Firebase console → Hosting → **Add custom domain** (e.g. `crcc.org.ng`).

## How the important parts work
- **Login gate:** the app shows only the sign-in screen until someone signs in; the security rules also refuse every read from
  signed-out users, so data can’t be pulled from the database directly.
- **Giving:** Paystack checkout → `verifyPayment` confirms with Paystack’s API using the secret key on the server → writes
  `gifts/{reference}` once, updates project totals and pledge balances. The app can never write a gift itself.
- **Monthly giving:** the card authorization is stored server-side and charged monthly; stops after 3 failures.
- **Push notifications:** any document added to `notifications` is pushed to phones by `sendPush`. Automatic ones: new sermon,
  going live, 6am devotional, event reminders the day before, birthday/anniversary greetings, weekly pledge reminders, testimony
  approved, counselling replies, bookshop order ready. On iPhone, members must add the app to the home screen first (iOS 16.4+).
- **QR check-in:** Admin → Attendance → open check-in shows a QR code (and a 6-letter code) for the screen. Members scan it with
  their camera and are checked in. Codes can’t be listed by members, and closed services reject check-ins.
- **Birthdays:** only members who allow it appear, from a separate list holding just name, photo and dates.

## Test the security rules
Needs Java installed. Starts a local database emulator and runs `tests/rules.test.mjs`:
```bash
npm run test:rules
```

## Project layout
```
src/config.ts          church details + keys (from .env)
src/data/seed.ts       sample content            src/data/bible.ts   books of the Bible
src/lib/store.ts       data layer (browser in demo, Firestore live) + audit log
src/lib/auth.tsx       sign-in (email, Google, phone) + member profile
src/lib/push.ts        notifications inbox + push registration
src/lib/roles.ts       admin roles and what each can manage
src/lib/paystack.ts    checkout + payment verification
src/sw.ts              service worker: offline, saved sermons, push alerts
src/pages/             member pages              src/admin/          admin area
functions/index.js     payments, push, scheduled reminders
firestore.rules        who can read/write what   tests/              rules tests
```

## Still to confirm with the church
Service times, First Lady’s name and bio, project targets, bank account, phone/email/social links, YouTube channel, house
fellowship hosts and addresses, bookshop prices, department leaders, real sermon recordings, Oxygen Class lessons and devotionals.
All are edited in `/admin`; the sample values are placeholders.
