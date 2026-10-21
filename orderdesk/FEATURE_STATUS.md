# WhatsApp Marketplace capability inventory — first build

The full WhatsApp baseline remains required under the blueprint. This is a family-level starting inventory; the platform/release-specific per-behaviour audit is pending. Entries below do not certify parity.

| Capability | State | Evidence / remaining work |
| --- | --- | --- |
| Chats-first responsive shell | Implemented | Browser smoke checks cover desktop and phone navigation |
| Account identity | Implemented locally | Standard sign-in and account creation; local walkthrough profiles are seeded with credentials outside production; Nigerian names and bundled fictional profile pictures; no live WhatsApp identity integration |
| First-visit orientation | Implemented | Dismissible map card after the first sign-in and a seven-step tour covering chats, marketplace, selling, orders, wallet, business tools and the assistant; replay available in Settings |
| Contacts and direct-thread uniqueness | Implemented | SQLite tests and two-session browser messaging |
| Signed encrypted personal/business text | Prototype | OpenPGP.js client envelopes; server rejects plaintext submissions |
| Key lifecycle, device verification, forward secrecy | Pending | Local keys, no recovery, linking or rotation; security review needed |
| Delivery, read state and presence | Partial | Polling and unread markers work; bubble delivery/read receipts, presence and push pending |
| Media, voice/video notes, location, polls | Pending | No decorative functional claims |
| Replies, forwarding, reactions, edit/delete, starred/expiring/view-once | Pending | Requires individual acceptance criteria |
| Search, archive, pin and lock | Partial | Conversation-name search; remaining behaviours pending |
| Calling | Pending | Voice/video/group calls, history, links, controls, screen sharing and transport |
| Groups and communities | Pending | Membership/admin/invites/announcements |
| Status and channels | Pending | Publication, audiences, expiry, following and interactions |
| Settings and account lifecycle | Partial | Profile summary/sign-out; privacy, blocking/reporting, account protection and settings pending |
| Device sync, backups, restoration/transfer | Pending | Requires platform design |
| Existing assistant/personalisation baseline | Pending | Reference platform inventory needed |
| General marketplace | Implemented | Products across categories; seller/product/city search and category filter |
| Guided marketplace discovery | Implemented | Niche cards narrow the catalogue to a themed suggestion set; search and category filters clear the niche and remain independent |
| Catalogue photography | Implemented | Twelve seeded listings use openly licensed Wikimedia Commons photos with author, licence and source stored per product and credited in the detail dialog; user listings keep the emoji fallback |
| Direct personal selling | Implemented | Sell something → product form → automatic seller profile on first listing; no separate seller signup |
| Seller onboarding | Implemented | Full shop onboarding remains available in Business tools; default pickup |
| Seller configuration | Partial | Product creation, price and availability; profile editing and delivery-zone management pending |
| Contextual ordering assistant | Implemented with limits | Server-validated catalogue IDs, quantities and duplicates; only catalogue/cart/typed request sent to the provider; configurable timeout; local fallback is labelled with its reason; manual ordering works independently |
| Request hardening and security headers | Implemented (prototype) | Cross-site/origin rejection, JSON-only writes, 100 KB cap, rate limits, hashed session tokens, HttpOnly SameSite cookies, production CSP and standard headers, no-store APIs; in-memory limits and TLS/proxy setup remain deployment work |
| Quotes and checkout in seller chat | Implemented | Integer pricing, ownership, expiry and idempotency tests |
| Username payment addresses and person-to-person transfers | Implemented | Unique immutable usernames, exact recipient confirmation, atomic once-only debit/credit, shared chat receipt and counterpart history; simulated wallet credit only |
| Simulated wallet and ledger | Implemented | Balanced entries, append-only ledger, top-up/retry and reconciliation tests |
| Order fulfilment, refund and settlement | Implemented | Seller permissions, allowed transitions, once-only terminal effects |
| Supabase/Postgres deployment, RLS | Pending | First implementation uses local SQLite; migrations and hosted deployment remain required work |

## Presentation decision — 21 October 2026

Remain an independent prototype through the presentation. Real WhatsApp integration follows a feasibility review after the event; it is not represented as implemented. WhatsApp-style layout, direct personal selling and username-addressed peer transfers extend the presentation scope.
