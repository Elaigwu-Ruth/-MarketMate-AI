# WhatsApp Marketplace

A WhatsApp-style messaging and marketplace prototype built from `../ORDERDESK_BLUEPRINT.md`. Buy and sell products across categories, open seller conversations, prepare editable orders, and use a clearly labelled demo wallet for orders or direct person-to-person transfers.

## Run locally

Requires Node.js 24 (the server uses built-in `node:sqlite`).

```sh
cd orderdesk
npm install
npm run dev
```

Open http://127.0.0.1:3000. For a production build, run `npm run build` followed by `npm start`. Use a Node server with a writable persistent disk; this SQLite version is not suitable for ephemeral/serverless hosting or multiple independent server replicas.

No external database account is needed. The first server request seeds five fictional shops across Electronics, Fashion, Home & Living, Groceries, and Food & Drinks. State persists in `data/orderdesk.sqlite`. To reset, stop the server, move the `data` directory aside, and restart. Existing browser messaging keys remain valid for the same seeded demo profile IDs.

For live AI, copy `.env.example` to `.env.local`, set the server-only key, and restart. The assistant uses the configured OpenAI-compatible endpoint, validates proposed product IDs and quantities, and falls back to local catalogue matching. It never receives private chat history or controls payments.

## Demo in two sessions

1. Sign in as **Ada Okafor** in one browser profile, **Tunde Bello** in another. Each must open WhatsApp Marketplace once to register a browser messaging key. Add a contact and exchange encrypted personal messages.
2. In Ada's session, open Marketplace → Circuit House. Add two USB-C cables, then open the order from the floating cart. The checkout sheet stays over the seller conversation.
3. Optionally open the order assistant in the seller chat, ask for “two USB-C cables under ₦6,000,” and review the editable suggestion.
4. Choose pickup or a seller delivery zone and address. Request a server quote, then explicitly confirm payment with test funds. Ada starts with ₦15,000 of test funds; add more through Wallet if needed.
5. Sign in as **Chidi Nwosu** (Circuit House) in the other session. Open Business tools or the incoming seller conversation. Accept → preparing → ready → complete (pickup), or dispatch → complete (delivery). The customer order card updates automatically.
6. On a separate order, cancel before acceptance or reject as the seller to demonstrate one refund.
7. Any demo user can choose **Sell something** in the top bar, enter product details and publish. A seller profile is created automatically on the first listing; no separate seller signup is required. New seller profiles initially support pickup. Business tools still support fuller shop onboarding and product management.

Demo profiles are public shared test identities, not private accounts. Email/password registration uses scrypt hashes and HTTP-only session cookies. Keep the seeded demo workspace local; production authentication, abuse controls and operational hardening need further work.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser tests use the installed `/usr/bin/chromium` (override with `CHROMIUM_PATH`). They run an isolated server on port 3100 with a separate database in `/tmp`; your normal demo database is not changed.

Commerce tests exercise real SQLite operations: thread uniqueness and access, seller-bound integer pricing, stale/expired quotes, insufficient funds, checkout retries, once-only chat cards, refund/accept conflicts, fulfilment permissions, delivery transitions, settlement, append-only ledger and balance reconciliation. SQLite `BEGIN IMMEDIATE` serialises conflicting writes; production Postgres migrations/RLS and multi-process concurrency verification remain pending.

## Usernames and direct wallet transfers

Every demo user has a Nigerian name, a bundled fictional profile picture and a unique payment username: Ada Okafor `@ada`, Tunde Bello `@tunde`, Chidi Nwosu `@chidi`, Amaka Eze `@amaka`, Musa Adamu `@musa`, Grace Odeh `@grace`, Peter Oche `@peter`.

Open a personal chat → click the contact name → click their `@username` or **Send money**. Enter an amount and optional note, review the full name, username and amount, then confirm. Alternatively use Wallet → **Send money** → find an exact username. Wallet → **Receive money** shows your own address to copy and share. A purchase is not required.

Transfers use integer kobo, an atomic balanced ledger and a sender-scoped idempotency key. A successful transfer debits the sender and credits the recipient once, creates/reuses their direct conversation, and records a server-authored transfer receipt for both participants. Wallet histories identify the counterpart. Users cannot send to themselves, overdraft, forge the confirmed recipient ID or reuse a retry key with changed details.

Usernames are unique, case-insensitive, exact-match payment addresses backed by permanent internal user IDs. They cannot be renamed or reassigned in this prototype; display names are separate. Existing users are migrated without resetting messages, encryption keys, orders or balances. New optional test profiles may select an available username at creation; otherwise one is generated.

## Presentation identity and future WhatsApp integration

The presentation uses a compact **choose a demo user** entry screen. Existing sessions reopen the app without a repeated login form; the create-test-profile path is optional. These identities are not real WhatsApp sessions. Installing or opening WhatsApp cannot authenticate someone to this independent app.

After the presentation, real WhatsApp integration needs a feasibility and product review against supported Meta interfaces, authorised account linking/verification, approved entry points and an appropriate payment integration. Do not claim that a website can inject a marketplace tab into the actual WhatsApp client. Real account integration and real financial transfers are outside this demonstration.

The profile photos were generated with the built-in image-generation tool. They depict fictional people and are served from `public/avatars/`; the exact prompts are in `public/avatars/ASSETS.md`. Fonts and profile photos are bundled locally for offline presentation use.

Production builds use `.next-production/` while the developer server uses `.next/`, so verification does not overwrite a running developer server's build directory.

## Verification result

Production build and TypeScript validation pass. All **10 database tests** and **4 Chromium browser journeys** pass, covering messaging and commerce regression, phone-sized seller onboarding, profile-to-username transfers with exact decimal amounts and receipt delivery to both sessions, and direct product publishing by a demo user without a seller signup. All seven profile-photo URLs are checked. Live WhatsApp and live AI-provider integrations are not part of this verification.

## Current scope and limits

Working: responsive Chats shell, registration/demo sessions, contact lookup, browser-encrypted signed text messages, polling, persisted conversations and unread counts, multi-category marketplace, seller onboarding, product pricing/availability controls, manual and assisted ordering, quotes, demo top-ups, atomic checkout, order cards, seller fulfilment, settlement and eligible refunds.

**This is a foundation prototype, not full WhatsApp parity.** OpenPGP.js encrypts/signs private text on the client and stores only ciphertext on the server. Private keys currently live unencrypted in browser local storage. Device verification, secure key storage/recovery, rotation, forward secrecy and linked devices are pending. Use the same browser for a given account's encrypted history; another browser cannot recover its private key. Do not use this prototype for sensitive communications. Commerce order records and delivery addresses are intentionally readable by the application and relevant seller.

Calls, rich media, message replies/reactions/edit/delete, groups, communities, Status, channels, device sync, notifications, full privacy/account controls, backups, and a full platform-specific feature audit remain required. Their navigation leads to explicit pending screens. The Settings build-progress view reports delivered and unfinished capabilities. No live payments, bank withdrawals, stock-quantity reservation or claims of real seller verification are provided.

Implementation uses Next.js/React/TypeScript and local SQLite rather than the proposed Supabase deployment, to make the first build runnable without credentials. Services enforce session identity and membership/ownership. Financial actions are transactional with scoped idempotency keys, five-minute quotes and integer kobo amounts. An append-only balanced ledger tracks simulated funds.
