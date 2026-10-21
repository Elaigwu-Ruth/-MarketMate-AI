# WhatsApp Marketplace

A WhatsApp-style messaging and marketplace app built from `../ORDERDESK_BLUEPRINT.md`. Buy and sell products across categories, open seller conversations, prepare editable orders, and use a clearly labelled simulated wallet for orders or direct person-to-person transfers. Marketplace browsing starts with a niche, catalogue listings use openly licensed photography with visible credit, a first-visit map explains where each area lives, and the tour can be replayed from Settings.

## Run locally

Requires Node.js 24 (the server uses built-in `node:sqlite`).

```sh
cd orderdesk
npm install
npm run dev
```

Open http://127.0.0.1:3000. For a production build, run `npm run build` followed by `npm start`. Use a Node server with a writable persistent disk; this SQLite version is not suitable for ephemeral/serverless hosting or multiple independent server replicas.

No external database account is needed. The first server request seeds five fictional shops across Electronics, Fashion, Home & Living, Groceries, and Food & Drinks. State persists in `data/orderdesk.sqlite`. To reset, stop the server, move the `data` directory aside, and restart. Existing browser messaging keys remain valid for the same seeded profile IDs.

In local development, the seeded profiles also receive sign-in credentials so the walkthrough uses the normal sign-in form: `ada@marketplace.local`, `tunde@marketplace.local`, `chidi@marketplace.local`, `amaka@marketplace.local`, `musa@marketplace.local`, `grace@marketplace.local` and `peter@marketplace.local`. The shared local password is `marketplace123`; override it with `ORDERDESK_SEED_PASSWORD`. These credentials are not created in a production server unless `ORDERDESK_SEED_ACCOUNTS=1` is explicitly set (for example, `ORDERDESK_SEED_ACCOUNTS=1 npm start` for a local production-mode walkthrough). They are walkthrough fixtures, not production accounts.

For live AI, copy `.env.example` to `.env.local`, set the server-only key, and restart. The assistant sends only the current seller's catalogue (id, name, attributes, condition and price), the editable cart and the customer's typed request to the configured OpenAI-compatible endpoint. It never receives private message history, encryption keys or wallet credentials. Proposed product IDs, quantities and duplicates are validated on the server; prices always come from the database. Provider timeouts, unreachable providers and unusable responses fall back to local catalogue matching with a visible explanation rather than a silent "AI" label. The timeout is configurable with `AI_TIMEOUT_MS` (1–60 seconds, default 12 seconds).

## Walkthrough in two sessions

1. Sign in as `ada@marketplace.local` in one browser profile and `tunde@marketplace.local` in another. Each must open WhatsApp Marketplace once to register a browser messaging key. Add a contact and exchange encrypted personal messages.
2. In Ada's session, open Marketplace → Circuit House. Add two USB-C cables, then open the order from the floating cart. The checkout sheet stays over the seller conversation.
3. Optionally open the order assistant in the seller chat, ask for “two USB-C cables under ₦6,000,” and review the editable suggestion.
4. Choose pickup or a seller delivery zone and address. Request a server quote, then explicitly confirm payment with wallet credit. Ada starts with ₦15,000 of simulated credit; add more through Wallet if needed.
5. Sign in as `chidi@marketplace.local` (Circuit House) in the other session. Open Business tools or the incoming seller conversation. Accept → preparing → ready → complete (pickup), or dispatch → complete (delivery). The customer order card updates automatically.
6. On a separate order, cancel before acceptance or reject as the seller to demonstrate one refund.
7. Any signed-in user can choose **Sell something** in the top bar, enter product details and publish. A seller profile is created automatically on the first listing; no separate seller signup is required. New seller profiles initially support pickup. Business tools still support fuller shop onboarding and product management.

The seeded profiles are shared local fixtures, not private accounts. Sign-in and email/password registration use scrypt hashes and HTTP-only session cookies. Keep the seeded workspace local; production authentication, abuse controls and operational hardening need further work.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser tests auto-detect Chromium at `/usr/bin/chromium`, `/snap/bin/chromium` or `/usr/bin/google-chrome` (override with `CHROMIUM_PATH`). They run an isolated server on port 3100 with a separate database in `/tmp`; your normal local database is not changed.

Commerce tests exercise real SQLite operations: thread uniqueness and access, seller-bound integer pricing, stale/expired quotes, insufficient funds, checkout retries, once-only chat cards, refund/accept conflicts, fulfilment permissions, delivery transitions, settlement, append-only ledger and balance reconciliation. Assistant tests cover unknown/duplicate/out-of-range model output, malformed carts, quantity parsing (including budget amounts), ambiguity, provider timeouts and an unreachable-provider fallback through the real API route. API tests cover cross-site/origin rejection, JSON-only writes, body-size limits, hardened session cookies, fail-closed password verification and session requirements. Browser tests also assert that a production server emits the CSP and security headers and that API responses are not cached. SQLite `BEGIN IMMEDIATE` serialises conflicting writes; production Postgres migrations/RLS and multi-process concurrency verification remain pending.

## Request hardening

Writes reject cross-site and mismatched-origin requests, require `application/json`, and are capped at 100 KB. Authentication routes and write/assistant endpoints are rate-limited per process. Session tokens are stored hashed, sent in `HttpOnly`/`SameSite=Strict` cookies, and marked `Secure` when the request is HTTPS. Production responses include a Content Security Policy plus `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy`; API responses are `no-store`.

These are prototype-grade controls, not a production security certification: rate limits are in-memory and reset on restart, TLS/hosting and trusted-proxy configuration are deployment decisions, and SQLite is designed for a single writable server process.

## Usernames and direct wallet transfers

Every seeded profile has a Nigerian name, a bundled fictional profile picture and a unique payment username: Ada Okafor `@ada`, Tunde Bello `@tunde`, Chidi Nwosu `@chidi`, Amaka Eze `@amaka`, Musa Adamu `@musa`, Grace Odeh `@grace`, Peter Oche `@peter`.

Open a personal chat → click the contact name → click their `@username` or **Send money**. Enter an amount and optional note, review the full name, username and amount, then confirm. Alternatively use Wallet → **Send money** → find an exact username. Wallet → **Receive money** shows your own address to copy and share. A purchase is not required.

Transfers use integer kobo, an atomic balanced ledger and a sender-scoped idempotency key. A successful transfer debits the sender and credits the recipient once, creates/reuses their direct conversation, and records a server-authored transfer receipt for both participants. Wallet histories identify the counterpart. Users cannot send to themselves, overdraft, forge the confirmed recipient ID or reuse a retry key with changed details.

Usernames are unique, case-insensitive, exact-match payment addresses backed by permanent internal user IDs. They cannot be renamed or reassigned in this build; display names are separate. Existing users are migrated without resetting messages, encryption keys, orders or balances. New optional test profiles may select an available username at creation; otherwise one is generated.

## Presentation identity and future WhatsApp integration

The app opens on a standard sign-in screen with an optional create-account path. Existing sessions reopen without a repeated login. The seeded profiles are local fixtures, not real WhatsApp sessions. Installing or opening WhatsApp cannot authenticate someone to this independent app.

After the presentation, real WhatsApp integration needs a feasibility and product review against supported Meta interfaces, authorised account linking/verification, approved entry points and an appropriate payment integration. Do not claim that a website can inject a marketplace tab into the actual WhatsApp client. Real account integration and real financial transfers are outside this demonstration.

The profile photos were generated with the built-in image-generation tool. They depict fictional people and are served from `public/avatars/`; the exact prompts are in `public/avatars/ASSETS.md`. Fonts and profile photos are bundled locally for offline presentation use.

Production builds and the developer server both use `.next/` by default. To keep them separate, set `ORDERDESK_BUILD_DIR` (for example `.next-production`) for both `npm run build` and `npm start`.

## Verification result

Production build and TypeScript validation pass. All **20 unit and API tests** and **6 Chromium browser journeys** pass, covering messaging and commerce regression, assistant input validation and fallback, request/origin hardening, production security headers and no-store API responses, phone-sized seller onboarding, profile-to-username transfers with exact decimal amounts and receipt delivery to both sessions, direct product publishing by a signed-in user without a seller signup, and sign-out/sign-in with first-visit tour replay. All seven profile-photo URLs and the twelve catalogue photos are rendered in the marketplace journey. Live WhatsApp and live AI-provider integrations are not part of this verification.

## Current scope and limits

Working: responsive Chats shell, sign-in and registration, seeded local walkthrough sessions, first-visit map and replayable tour, contact lookup, browser-encrypted signed text messages, polling, persisted conversations and unread counts, multi-category marketplace, seller onboarding, product pricing/availability controls, manual and assisted ordering, quotes, wallet top-ups, atomic checkout, order cards, seller fulfilment, settlement and eligible refunds.

**This is a foundation prototype, not full WhatsApp parity.** OpenPGP.js encrypts/signs private text on the client and stores only ciphertext on the server. Private keys currently live unencrypted in browser local storage. Device verification, secure key storage/recovery, rotation, forward secrecy and linked devices are pending. Use the same browser for a given account's encrypted history; another browser cannot recover its private key. Do not use this prototype for sensitive communications. Commerce order records and delivery addresses are intentionally readable by the application and relevant seller.

Calls, rich media, message replies/reactions/edit/delete, groups, communities, Status, channels, device sync, notifications, full privacy/account controls, backups, and a full platform-specific feature audit remain required. Their navigation leads to explicit pending screens. The Settings build-progress view reports delivered and unfinished capabilities. No live payments, bank withdrawals, stock-quantity reservation or claims of real seller verification are provided.

Implementation uses Next.js/React/TypeScript and local SQLite rather than the proposed Supabase deployment, to make the first build runnable without credentials. Services enforce session identity and membership/ownership. Financial actions are transactional with scoped idempotency keys, five-minute quotes and integer kobo amounts. An append-only balanced ledger tracks simulated funds.
