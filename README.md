# MarketMate AI

A mobile-friendly shopping discovery prototype: describe what you need, browse real catalogue records, ask product questions, compare up to three listings, and contact a seller when a valid WhatsApp link is configured.

## Run

Requires Python 3.10+. No packages or build step required.

```sh
python3 server.py
```

Open http://localhost:8000. Set `PORT` to change the port. The server binds to localhost.

```sh
python3 -m unittest discover -s tests -v
```

## What works

- SQLite catalogue, seeded once with eight explicitly fictional listings.
- Keyword and natural-language discovery: category, budget (`400k`, `₦400,000`), condition; minimum/maximum price and sorting.
- Product details, missing-information answers, two/three product comparison.
- Shared demo seller studio: create, edit, delete, change availability, persist across restarts.
- Validated optional WhatsApp click-to-chat links; no fake contacts in seeded listings.
- Responsive interface with original CSS/SVG product illustrations.

## Assistant modes

Default: a deterministic, grounded demo assistant. It extracts common shopping constraints and answers supported questions from saved listing fields. It is **not a live language model** and does not understand arbitrary requests.

Optional live product Q&A: export `AI_API_KEY`, optionally `AI_MODEL` and `AI_BASE_URL`, before starting. See `.env.example` for names; `.env` is not loaded automatically. The server sends selected product records to an OpenAI-compatible chat-completions endpoint. Provider failure falls back to the grounded assistant. Live generated text is labelled and is not independently fact-validated; test it before a public demo. Natural-language search remains deterministic in both modes. No API key is exposed to the browser.

## Architecture and limitations

`server.py` provides same-origin JSON endpoints and static hosting using Python's standard library. SQLite is in `data/marketmate.db` (ignored by Git); override with `MARKETMATE_DB`. `public/` contains HTML, CSS, and vanilla JavaScript. Tests cover hard constraints, missing facts, malicious description handling in demo mode, unavailable listings, URL/price validation, and seed idempotence.

This is a local hackathon prototype, not a production deployment. Seller mode is shared and has no authentication or ownership enforcement. Do not expose the server publicly with real seller data. No payments, inventory integrations, live WhatsApp API, message ingestion, or verification. Contact links open WhatsApp and do not record a purchase. Images are illustrative, not photos of actual products. Google Fonts is optional; system fonts work offline. Browser-based interaction and live-provider verification must be completed on the presenting machine.

## Two-minute demo

1. Search “Laptop for programming under ₦400,000”. Show price and category constraints.
2. Open StudioBook 14. Ask “What is the battery health?” Show missing information.
3. Select two laptops and compare known fields.
4. Open Seller studio, create a fictional listing, edit its price, mark it unavailable.
5. Return to Discover: unavailable listings are excluded. Seller contact is unavailable unless explicitly configured.

Product specification: `MarketMate_AI_Hackathon_Master_Brief.md`.
