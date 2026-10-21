# WhatsApp Marketplace capability inventory — first build

The full WhatsApp baseline remains required under the blueprint. This is a family-level starting inventory; the platform/release-specific per-behaviour audit is pending. Entries below do not certify parity.

| Capability | State | Evidence / remaining work |
| --- | --- | --- |
| Chats-first responsive shell | Implemented | Browser smoke checks cover desktop and phone navigation |
| Registered/demo identity | Implemented locally | Remembered demo-user selection, Nigerian names and bundled fictional profile pictures; optional test registration; no live WhatsApp identity integration |
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
| Direct personal selling | Implemented | Sell something → product form → automatic seller profile on first listing; no separate seller signup |
| Seller onboarding | Implemented | Full shop onboarding remains available in Business tools; default pickup |
| Seller configuration | Partial | Product creation, price and availability; profile editing and delivery-zone management pending |
| Contextual ordering assistant | Implemented with limits | Local matching; optional live AI; only explicitly typed context shared; manual ordering works independently |
| Quotes and checkout in seller chat | Implemented | Integer pricing, ownership, expiry and idempotency tests |
| Username payment addresses and person-to-person transfers | Implemented | Unique immutable usernames, exact recipient confirmation, atomic once-only debit/credit, shared chat receipt and counterpart history; test funds only |
| Demo wallet and ledger | Implemented | Balanced entries, append-only ledger, top-up/retry and reconciliation tests |
| Order fulfilment, refund and settlement | Implemented | Seller permissions, allowed transitions, once-only terminal effects |
| Supabase/Postgres deployment, RLS | Pending | First implementation uses local SQLite; migrations and hosted deployment remain required work |

## Presentation decision — 21 October 2026

Remain an independent prototype through the presentation. Real WhatsApp integration follows a feasibility review after the event; it is not represented as implemented. WhatsApp-style layout, direct personal selling and username-addressed peer transfers extend the presentation scope.
