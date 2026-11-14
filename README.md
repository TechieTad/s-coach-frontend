# S-Coach — chat with your money (Junction 2026 × S-Bank, frontend)

**S-Coach** is a mobile-first Progressive Web App that lets a bank customer *talk to
their own transaction data*: "How much did I spend on taxis last month?", "What kind
of spender am I?", "What is safe for me to spend this week?", "How much could I save
if I cut dining out by 20%?" — and the answers arrive **inline in the chat stream as
interactive cards** (progress bars, a clickable donut, sliders, peer bars), not as
walls of text.

This repository is the **frontend only**, as requested. The backend (FastAPI + LLM
router + PSD2 gateway + scikit-learn KNN + SQLite) is represented by a single seam —
see `lib/api.ts`.

- Challenge source: [hackjunction/Junction-2026-S-pankki](https://github.com/hackjunction/Junction-2026-S-pankki)
- Event verified live: [2026.hackjunction.com](https://2026.hackjunction.com) — Junction 2026, 13–15 Nov 2026, Hype Areena, Kivenlahti, Espoo.

## Quick start (on a machine with network access)

```bash
npm install        # installs next 16.4.6, react 19, tailwind 3, typescript (see package.json)
npm run dev        # http://localhost:3000  (mobile-first; desktop shows a 430px phone frame)
npm test           # node --test test/engine.test.ts  (no dependencies needed — Node >= 22.6 runs the TS directly)
npm run build && npm start   # production PWA
```

**Requirements:** Node.js **≥ 20.9.0** — Next.js 16 requires it (check with `node -v`; the Node 22 or 24 LTS line is recommended). `npm test` runs the TS tests directly on Node ≥ 22.6. After `npm install`, `npm audit` should report **0 vulnerabilities**.

Open the URL on a phone (or device toolbar in devtools) and "Add to Home screen":
`public/manifest.webmanifest` + `public/sw.js` make it installable and offline-capable
after first load. To embed in the S-mobiili app, point a WebView at the deployed URL —
the app is a standalone-display PWA with its own service worker.

## How it works

```
user message ──▶ lib/api.ts CoachApi.answer() ──▶ ChatPart[]  (text | card)
                       │                              │
              demo: lib/engine.ts            app/page.tsx → components/ChatApp.tsx
              (deterministic intent          └─ MessageBubble.tsx renders each part;
               router + math, seeded            PartView switches on card kind and
               mock data)                       mounts the matching card component
                       │                              ▲
   production: swap to fetch("/api/chat") ──────────────┘
              (app/api/chat/route.ts already exposes the demo engine at POST /api/chat)
```

Every assistant reply is a list of **parts**: plain text (light markdown: `**bold**`,
newlines) and **card parts** carrying structured `data`. `components/MessageBubble.tsx`
dispatches on `part.card` to one of seven interactive components in
`components/cards/`:

| Card | Challenge requirement it serves |
|---|---|
| `SafeToSpendCard` | safe-to-spend progress bar + stat tiles (income, baskets, 10% savings target, week spend, weekly pace vs. safe amount) |
| `BasketsCard` | pedagogical **three baskets** donut — mandatory regular / mandatory irregular / everyday slippage; clickable slices reveal top merchants |
| `CategorySpendCard` | "how much did I spend on X last month?" with month-over-month delta badge |
| `WhatIfCard` | interactive slider: "what if I cut dining out by X%?" → monthly + yearly savings |
| `BenchmarkCard` | peer benchmark bars (you vs. financial twin) from Statistics-Finland-style population stats |
| `TransactionsCard` | raw transaction list with merchant, category, MCC, date, signed amount |
| `MultiBankCard` | **PSD2 bonus**: S-Bank + Nordea + OP accounts with connect toggles and merged balance |

## The API seam (where the real backend plugs in)

`lib/api.ts` exports `createCoachApi(): CoachApi` with `answer(message): Promise<ChatPart[]>`,
`getAccounts()`, `toggleAccount(id)`. Today it wraps the local demo engine. For the real
system, replace the body of `answer()` with:

```ts
async answer(message: string): Promise<ChatPart[]> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, customer_id: "CUST00003" }),
  });
  return (await res.json()).parts;   // FastAPI + LLM router returns the same ChatPart[]
}
```

The contract is exactly the MVP architecture: the LLM router classifies intent into tool
calls (`calculate_savings`, `benchmark_spending`, `fetch_transactions`, …) and returns
structured parts; the UI never parses free text for data. `app/api/chat/route.ts` shows
the wire format (`{ parts: ChatPart[] }`) using the demo engine.

## Demo data

The real dataset (`tx_junction_transactions.csv`, ~346 MB via Git LFS) is not bundled.
Instead `lib/mockData.ts` synthesizes a deterministic world (seeded PRNG, seed
`20261113`) that **mirrors the real CSV schema 1:1** — the test suite asserts the exact
column set: `customer_id, bank_account_id, tx_date, tx_timestamp, category,
tx_amount_eur, balance_after_eur, transaction_type, merchant_id, mcc_code`. The demo
persona is the real customer row `CUST00003` (age 30, postal 00530, Helsinki). Forced
events make the demo land: rent 950 € on the 1st, salary 3 250 € on the 25th, car repair
(14 Aug), dentist (21 Sep), washing machine (349 €, 17 Oct), taxis in Oct/Nov, a monthly
300 € transfer to an OP savings account, and Nordea/OP accounts with their own
transactions.

**Spending semantics:** savings transfers are *not* spending — the engine's `spendIn()`
excludes the `Savings` category so baskets, benchmarks and safe-to-spend never overstate
outflows (covered by a dedicated test).

## Design rationale (mapped to the challenge brief)

- **Conversational, not statement-based** — messaging-app chat; the AI answers in plain
  language and renders rich components inline, MyData-style: the user picks the question
  (suggestion chips or free text), no fixed bank-chosen charts.
- **Pedagogical three baskets** — every spending visual labels which basket it belongs
  to; the donut card is the centerpiece for "where does my money really go".
- **Safe-to-spend / safe-to-save** — `safeThisWeek = remaining discretionary budget ×
  7/daysLeft`, with a 10% auto-save target and a weekly-pace warning.
- **What-if simulation** — slider-driven savings scenarios on any category.
- **Benchmarks** — "financial twin" peer group (age band + region from postal code) vs.
  Statistics-Finland-style open population data, clearly labelled as synthetic stand-ins.
- **PSD2 multi-bank (bonus)** — connect Nordea/OP accounts in-chat; balances and
  transactions merge into one stream.
- **Mobile-first PWA** — 430 px phone frame on desktop, installable manifest, offline
  service worker, embeddable via WebView.

## Verification performed in this workspace

- `node --test test/engine.test.ts` — **13/13 passing** (period math, basket split with
  savings exclusion, safe-to-spend recomputed independently, what-if routing order,
  benchmark peer group, multi-bank toggle/merge, transaction ordering, determinism,
  CSV schema mirror).
- `package.json` / `tsconfig.json` / `manifest.webmanifest` parse as valid JSON; every
  relative import in `app/ components/ lib/ test/` resolves to a real file.
- `npm install`/`next build` could not run here (sandbox has no registry access), so the
  app is delivered as source; run `npm install && npm run dev` on a networked machine.
- **Security pin (2026-11-13):** dependencies moved to a supported line — `next@16.4.6` (Active LTS, released 2026-11-09), `react`/`react-dom@19.3.1`, `@types/react(-dom)@19.3.0`, `typescript@5.9.3`, `postcss@8.5.33` (latest; fixes the `<=8.5.22` sourceMappingURL/XSS advisories GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849), `engines.node >= 20.9.0`. The old pin `next@14.2.15` sits on the 14.x line whose security support **ended 2025-10-26** (last 14.x release 14.2.35, 2025-12-11) and which got **no fixes** in the 2026-11-03 Next.js security release (patched lines were 16.4.5+ and 15.5.29+ only). Sources: [endoflife.date/nextjs](https://endoflife.date/nextjs), [Nov 2026 security release](https://nextjs.org/blog/november-2026-security-release), [Dec 2025 security update](https://nextjs.org/blog/security-update-2025-12-11), [npm registry: postcss](https://www.npmjs.com/package/postcss). A fresh `npm install` + `npm audit` on this pin set reports **0 vulnerabilities** — no `--force` needed. Engine tests re-run after the bump: 13/13.

## File tree

```
s-coach/
├─ app/                    Next.js App Router shell
│  ├─ layout.tsx           metadata, manifest link, themeColor, 430px phone frame, SW registration
│  ├─ page.tsx             <ChatApp/>
│  ├─ globals.css          Tailwind + chat/card styling
│  └─ api/chat/route.ts    POST /api/chat → { parts } (demo engine; swap for FastAPI)
├─ components/
│  ├─ ChatApp.tsx          chat state, simulated latency, typing indicator, auto-scroll
│  ├─ MessageBubble.tsx    text markdown + PartView dispatcher
│  ├─ SuggestionChips.tsx  six example questions
│  ├─ RegisterSW.tsx       service-worker registration
│  └─ cards/               SafeToSpend, Baskets, CategorySpend, WhatIf, Benchmark, Transactions, MultiBank
├─ lib/
│  ├─ types.ts             Transaction (CSV schema 1:1), ChatPart, card data types
│  ├─ format.ts            eur/pct/date helpers
│  ├─ mockData.ts          seeded synthetic world (schema-mirroring)
│  ├─ engine.ts            deterministic intent router + all card math (demo backend)
│  └─ api.ts               CoachApi seam — swap answer() for fetch("/api/chat")
├─ public/                 manifest.webmanifest, sw.js, icon.svg, icon-192.png, icon-512.png
├─ test/engine.test.ts    13 node:test tests (dependency-free)
└─ package.json / tsconfig.json / tailwind.config.ts / next.config.mjs / postcss.config.json
```
