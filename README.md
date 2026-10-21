# WhatsApp Marketplace

A WhatsApp-style messaging and marketplace app with personal chats, a marketplace where everyone can sell, AI-assisted ordering, and a simulated wallet for purchases and direct transfers by `@username`.

## Run the app

Requires **Node.js 24**. The application lives in `orderdesk/`.

```sh
cd orderdesk
npm ci
npm run dev
```

Open **http://127.0.0.1:3000** and sign in or create an account. Existing sessions are remembered. Local development seeds walkthrough credentials such as `ada@marketplace.local` with the password `marketplace123`; see the setup README for the full list and for production-mode options.

For production mode:

```sh
cd orderdesk
npm run build
ORDERDESK_SEED_ACCOUNTS=1 npm start
```

`ORDERDESK_SEED_ACCOUNTS=1` is only needed for a local production-mode walkthrough using the seeded accounts. Omit it for a normal production start.

## Features

- WhatsApp-style chat layout, browser-encrypted text messages and persistent conversations.
- Standard sign-in and account creation, plus seven seeded Nigerian seller profiles with bundled fictional profile photos.
- A first-visit map and a replayable tour of chats, marketplace, selling, orders, wallet, business tools and the order assistant.
- Marketplace across electronics, fashion, home goods, groceries, food and other products.
- **Sell something** lets any user publish a product; their first listing creates a seller profile automatically.
- Menu/catalogue-grounded order assistance, editable carts, server-priced quotes and checkout within seller chats.
- **Wallet → Send money**, or **contact profile → @username**, transfers wallet credit with recipient confirmation and receipts in both users' conversation.
- Seller fulfilment, settlement, eligible cancellation/refunds and an append-only balanced ledger.

**This is an independent prototype, not an official WhatsApp product or a completed WhatsApp rebuild. All wallet funds are simulated.** Real WhatsApp integration, real payments, calls, groups, Status, linked devices and other pending capabilities are tracked in the feature inventory. Private-text encryption also has documented prototype limitations.

## Documentation

- [Setup, configuration and walkthrough](orderdesk/README.md)
- [Implemented and pending features](orderdesk/FEATURE_STATUS.md)
- [Product blueprint](ORDERDESK_BLUEPRINT.md)
- [Generated fictional photo assets and prompts](orderdesk/public/avatars/ASSETS.md)

## Verification

```sh
cd orderdesk
npm test
npm run build
npm run test:e2e
```

The current build passed 20 unit and API tests and 6 Chromium browser journeys. Browser tests auto-detect Chromium at `/usr/bin/chromium`, `/snap/bin/chromium` or `/usr/bin/google-chrome`, or use `CHROMIUM_PATH` pointing to an installed Chromium browser. Test data is isolated from the local database.

SQLite data, local secrets, browser keys, dependencies and build outputs are not included in this repository. Copy `orderdesk/.env.example` to `orderdesk/.env.local` only if configuring the optional live order assistant; local catalogue matching works without a provider key.
