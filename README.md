# WhatsApp Marketplace

A WhatsApp-style prototype with personal chats, a marketplace where everyone can sell, AI-assisted ordering, and a demo wallet for purchases and direct transfers by `@username`.

## Run the app

Requires **Node.js 24**. The application lives in `orderdesk/`.

```sh
cd orderdesk
npm ci
npm run dev
```

Open **http://127.0.0.1:3000** and choose a fictional demo user. Existing sessions are remembered; demo users do not need to register.

For production mode:

```sh
cd orderdesk
npm run build
npm start
```

## Presentation features

- WhatsApp-style chat layout, browser-encrypted text messages and persistent conversations.
- Seven Nigerian demo identities with bundled fictional profile photos.
- Marketplace across electronics, fashion, home goods, groceries, food and other products.
- **Sell something** lets any user publish a product; their first listing creates a seller profile automatically.
- Menu/catalogue-grounded order assistance, editable carts, server-priced quotes and checkout within seller chats.
- **Wallet → Send money**, or **contact profile → @username**, transfers test funds with recipient confirmation and receipts in both users' conversation.
- Seller fulfilment, demo settlement, eligible cancellation/refunds and an append-only balanced ledger.

**This is an independent prototype, not an official WhatsApp product or a completed WhatsApp rebuild. All wallet funds are simulated.** Real WhatsApp integration, real payments, calls, groups, Status, linked devices and other pending capabilities are tracked in the feature inventory. Private-text encryption also has documented prototype limitations.

## Documentation

- [Setup, configuration and demo walkthrough](orderdesk/README.md)
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

The current build passed 10 database tests and 4 Chromium browser journeys. Browser tests expect `/usr/bin/chromium`, or `CHROMIUM_PATH` pointing to an installed Chromium browser. Test data is isolated from the demo database.

SQLite data, local secrets, browser keys, dependencies and build outputs are not included in this repository. Copy `orderdesk/.env.example` to `orderdesk/.env.local` only if configuring the optional live order assistant; local catalogue matching works without a provider key.
