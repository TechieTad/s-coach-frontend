// Engine tests — run with: node --test test/engine.test.ts
// Node >= 22.6 runs TypeScript natively (type stripping), so these tests need
// no build step and no node_modules: they exercise the dependency-free lib/ layer.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CoachEngine,
  basketOf,
  periodLastMonth,
  periodPrevMonth,
  periodThisMonth,
  periodThisWeek,
} from "../lib/engine.ts";
import { buildWorld, NORDEA_ACCOUNT_ID, OP_ACCOUNT_ID, SB_ACCOUNT_ID } from "../lib/mockData.ts";
import { round2 } from "../lib/format.ts";
import type {
  Account,
  BasketsData,
  BenchmarkData,
  CardKind,
  Category,
  ChatPart,
  MultiBankData,
  SafeToSpendData,
  CategorySpendData,
  TransactionsData,
  WhatIfData,
  Transaction,
} from "../lib/types.ts";

// Fixed "now": Fri 2026-11-13 20:06 UTC (the hackathon demo moment).
const NOW = new Date("2026-11-13T20:06:12Z");
const SEED = 20261113;

function makeEngine() {
  return new CoachEngine({ now: NOW, seed: SEED });
}

function cardOf<T>(parts: ChatPart[], kind: CardKind): T {
  const p = parts.find((x) => x.type === "card" && x.card === kind);
  assert.ok(p, `expected a "${kind}" card in the response, got: ${JSON.stringify(parts.map((x) => x.type === "card" ? x.card : x.type))}`);
  return (p as { data: T }).data;
}

// ---- independent recomputation from the same seeded world ----
const world = buildWorld(NOW, SEED);
const connectedIds = () => new Set(world.accounts.filter((a: Account) => a.connected).map((a) => a.id));
const merged = () => world.transactions.filter((t) => connectedIds().has(t.bank_account_id));
const inRange = (t: Transaction, from: string, to: string) => t.tx_date >= from && t.tx_date <= to;
const debits = (from: string, to: string) =>
  merged().filter((t) => t.transaction_type === "debit" && inRange(t, from, to));
const spend = (from: string, to: string) => debits(from, to).filter((t) => t.category !== "Savings");
const sum = (ts: Transaction[]) => round2(ts.reduce((s, t) => s + Math.abs(t.tx_amount_eur), 0));

// October 2026 = last full month; September 2026 = previous month.
const OCT = { from: "2026-10-01", to: "2026-10-31" };
const SEP = { from: "2026-09-01", to: "2026-09-30" };

test("period helpers are correct for 2026-11-13", () => {
  assert.deepEqual(periodThisMonth(NOW), { from: "2026-11-01", to: "2026-11-13", label: "November 2026" });
  assert.deepEqual(periodLastMonth(NOW), { from: "2026-10-01", to: "2026-10-31", label: "October 2026" });
  assert.deepEqual(periodPrevMonth(NOW), { from: "2026-09-01", to: "2026-09-30", label: "September 2026" });
  // Friday -> week starts Monday 2026-11-09
  assert.deepEqual(periodThisWeek(NOW), { from: "2026-11-09", to: "2026-11-13", label: "this week" });
});

test("basketOf maps categories into the three pedagogical baskets", () => {
  assert.equal(basketOf("Rent"), "mandatory_regular");
  assert.equal(basketOf("Utilities"), "mandatory_regular");
  assert.equal(basketOf("Loan payment"), "mandatory_regular");
  assert.equal(basketOf("Healthcare"), "mandatory_irregular");
  assert.equal(basketOf("Repairs & appliances"), "mandatory_irregular");
  assert.equal(basketOf("Cafés"), "everyday");
  assert.equal(basketOf("Taxi"), "everyday");
  assert.equal(basketOf("Groceries"), "everyday");
});

test("taxi question last month routes to category-spend with exact math", () => {
  const engine = makeEngine();
  const parts = engine.answer("How much did I spend on taxis last month?");
  const data = cardOf<CategorySpendData>(parts, "category-spend");
  const expectedTxs = debits(OCT.from, OCT.to).filter((t) => t.category === "Taxi");
  assert.ok(expectedTxs.length >= 2, "mock data should contain forced October taxis");
  assert.equal(data.category, "Taxi");
  assert.equal(data.periodLabel, "October 2026");
  assert.equal(data.amount, sum(expectedTxs));
  assert.ok(data.amount >= 43.3, "forced October taxis (18.40 + 24.90) are included on top of random ones");
  assert.equal(data.txCount, expectedTxs.length);
  assert.ok(data.top.length > 0 && data.top[0].amount > 0);
  // delta vs previous month (September has no forced taxis but may have random ones)
  const sepTaxi = sum(debits(SEP.from, SEP.to).filter((t) => t.category === "Taxi"));
  if (sepTaxi > 0) assert.ok(Math.abs(data.deltaPct! - ((data.amount - sepTaxi) / sepTaxi) * 100) < 0.01);
});

test("period parsing: 'this month' uses the current partial month", () => {
  const engine = makeEngine();
  const data = cardOf<CategorySpendData>(engine.answer("How much did I spend on taxis this month?"), "category-spend");
  assert.equal(data.periodLabel, "November 2026");
  const expected = sum(debits("2026-11-01", "2026-11-13").filter((t) => t.category === "Taxi"));
  assert.equal(data.amount, expected);
  assert.ok(data.amount >= 14.2, "forced 2026-11-06 taxi is included on top of random ones");
});

test("three baskets card: slices, shares and savings exclusion", () => {
  const engine = makeEngine();
  const parts = engine.answer("What kind of spender am I?");
  const data = cardOf<BasketsData>(parts, "baskets");
  assert.equal(data.periodLabel, "October 2026");
  assert.equal(data.slices.length, 3);
  assert.deepEqual(data.slices.map((s) => s.basket).sort(), ["everyday", "mandatory_irregular", "mandatory_regular"]);

  const octSpend = spend(OCT.from, OCT.to);
  const octAllDebits = debits(OCT.from, OCT.to);
  const savingsInOct = octAllDebits.filter((t) => t.category === "Savings");
  assert.ok(savingsInOct.length > 0, "mock data should contain a monthly savings transfer in October");
  // Savings transfers are NOT spending: total excludes them
  assert.equal(data.total, sum(octSpend));
  assert.ok(data.total < sum(octAllDebits), "total must be lower than raw debits because savings transfers are excluded");

  const byBasket = Object.fromEntries(data.slices.map((s) => [s.basket, s.amount]));
  for (const s of data.slices) {
    const expected = sum(octSpend.filter((t) => basketOf(t.category) === s.basket));
    assert.equal(s.amount, expected, `slice ${s.basket}`);
    assert.ok(Math.abs(s.share - (data.total > 0 ? s.amount / data.total : 0)) < 1e-9);
  }
  assert.ok(Math.abs(data.slices.reduce((s, x) => s + x.share, 0) - 1) < 1e-9, "shares sum to 1");
  // October has the forced washing machine (349) -> mandatory irregular must be positive
  assert.ok(byBasket.mandatory_irregular >= 349);
  // rent 950 on Oct 1 -> mandatory regular at least 950
  assert.ok(byBasket.mandatory_regular >= 950);
  assert.ok(parts.some((p) => p.type === "text" && p.text.includes("three baskets") || p.type === "text"));
});

test("safe-to-spend card matches an independent recomputation", () => {
  const engine = makeEngine();
  const parts = engine.answer("What is safe for me to spend this week?");
  const data = cardOf<SafeToSpendData>(parts, "safe-to-spend");
  assert.equal(data.monthLabel, "November 2026");

  const month = { from: "2026-11-01", to: "2026-11-13" };
  const mSpend = spend(month.from, month.to);
  const mr = sum(mSpend.filter((t) => basketOf(t.category) === "mandatory_regular"));
  const mi = sum(mSpend.filter((t) => basketOf(t.category) === "mandatory_irregular"));
  const ev = sum(mSpend.filter((t) => basketOf(t.category) === "everyday"));
  const salaries = merged()
    .filter((t) => t.category === "Salary" && t.transaction_type === "credit")
    .sort((a, b) => b.tx_date.localeCompare(a.tx_date))
    .slice(0, 3)
    .map((t) => t.tx_amount_eur);
  assert.equal(salaries.length, 3); // Aug/Sep/Oct 25
  const monthlyIncome = round2(salaries.reduce((s, x) => s + x, 0) / salaries.length);
  const savingsTarget = round2(monthlyIncome * 0.1);
  const discretionaryBudget = round2(monthlyIncome - mr - mi - savingsTarget);
  const remaining = round2(discretionaryBudget - ev);
  const daysLeft = 30 - 13 + 1; // November has 30 days, today is the 13th
  const safeThisWeek = Math.max(0, round2((remaining * 7) / daysLeft));
  const weekSpent = sum(spend("2026-11-09", "2026-11-13").filter((t) => basketOf(t.category) === "everyday"));
  const weeklyPace = round2((weekSpent / 5) * 7); // Friday = 5th day of the week

  assert.equal(data.monthlyIncome, monthlyIncome);
  assert.equal(data.monthlyIncome, 3250);
  assert.equal(data.savingsTarget, savingsTarget);
  assert.equal(data.mandatoryRegular, mr);
  assert.equal(data.mandatoryIrregular, mi);
  assert.equal(data.everydaySpent, ev);
  assert.equal(data.discretionaryBudget, discretionaryBudget);
  assert.equal(data.remaining, remaining);
  assert.equal(data.daysLeft, daysLeft);
  assert.equal(data.safeThisWeek, safeThisWeek);
  assert.equal(data.weekSpent, weekSpent);
  assert.equal(data.weeklyPace, weeklyPace);
  assert.equal(data.projectedSave, Math.max(0, remaining));
  assert.ok(data.safeThisWeek >= 0);
});

test("what-if card is routed before plain spend questions and uses last-month baseline", () => {
  const engine = makeEngine();
  const parts = engine.answer("How much could I save if I reduced dining out by 20%?");
  const data = cardOf<WhatIfData>(parts, "what-if");
  assert.equal(data.category, "Dining");
  assert.equal(data.defaultPct, 20);
  assert.equal(data.maxPct, 50);
  assert.equal(data.periodLabel, "October 2026");
  const baseline = sum(debits(OCT.from, OCT.to).filter((t) => t.category === "Dining"));
  assert.equal(data.baselineMonthly, baseline);
  assert.ok(baseline > 0, "October should contain dining spend");

  // without an explicit percentage the default is 20%
  const noPct = cardOf<WhatIfData>(engine.answer("What if I spend less on cafés?"), "what-if");
  assert.equal(noPct.category, "Cafés");
  assert.equal(noPct.defaultPct, 20);
});

test("benchmark card: financial-twin peer group from age + postal code", () => {
  const engine = makeEngine();
  const parts = engine.answer("Compare me to similar people");
  const data = cardOf<BenchmarkData>(parts, "benchmark");
  assert.equal(data.rows.length, 5);
  assert.ok(data.peerLabel.includes("25–34"), data.peerLabel); // age 30
  assert.ok(data.peerLabel.includes("Helsinki"), data.peerLabel); // postal 00530
  assert.equal(data.periodLabel, "October 2026");
  assert.equal(data.rows[0].label, "Total spending");
  assert.equal(data.rows[0].you, sum(spend(OCT.from, OCT.to)));
  assert.equal(data.rows[0].peer, 2610);
  assert.ok(data.note.toLowerCase().includes("statistics finland"));
});

test("multi-bank / PSD2: default view, toggle, and connect-by-asking", () => {
  const engine = makeEngine();
  let data = cardOf<MultiBankData>(engine.answer("Show all my accounts (Nordea & OP)"), "multi-bank");
  assert.equal(data.accounts.length, 3);
  const sb = data.accounts.find((a) => a.id === SB_ACCOUNT_ID)!;
  const nordea = data.accounts.find((a) => a.id === NORDEA_ACCOUNT_ID)!;
  const op = data.accounts.find((a) => a.id === OP_ACCOUNT_ID)!;
  assert.equal(sb.connected, true);
  assert.equal(nordea.connected, false);
  assert.equal(op.connected, false);
  assert.equal(data.mergedBalance, round2(sb.balance)); // only S-Bank connected

  // toggle via API (what the card switch calls)
  engine.toggleAccount(NORDEA_ACCOUNT_ID);
  data = cardOf<MultiBankData>(engine.answer("Show all my accounts"), "multi-bank");
  assert.equal(data.accounts.find((a) => a.id === NORDEA_ACCOUNT_ID)!.connected, true);
  assert.equal(data.mergedBalance, round2(sb.balance + nordea.balance));

  // fresh engine: ask the coach to connect OP
  const engine2 = makeEngine();
  const parts2 = engine2.answer("connect OP");
  const data2 = cardOf<MultiBankData>(parts2, "multi-bank");
  assert.equal(data2.accounts.find((a) => a.id === OP_ACCOUNT_ID)!.connected, true);
  const opBal = data2.accounts.find((a) => a.id === OP_ACCOUNT_ID)!.balance;
  const sbBal = data2.accounts.find((a) => a.id === SB_ACCOUNT_ID)!.balance;
  assert.equal(data2.mergedBalance, round2(sbBal + opBal));
  assert.ok(parts2.some((p) => p.type === "text" && p.text.includes("PSD2")));
});

test("transactions card: newest first, capped at 8, merged accounts only", () => {
  const engine = makeEngine();
  const data = cardOf<TransactionsData>(engine.answer("show my recent transactions"), "transactions");
  assert.ok(data.items.length <= 8 && data.items.length > 0);
  assert.equal(data.accountLabel, "S-Bank everyday account");
  for (let i = 1; i < data.items.length; i++) {
    assert.ok(data.items[i - 1].tx_timestamp >= data.items[i].tx_timestamp, "sorted newest first");
  }
  // all items belong to connected accounts (S-Bank only by default)
  assert.ok(data.items.every((t) => t.bank_account_id === SB_ACCOUNT_ID));
  // after connecting Nordea, label changes and Nordea txs appear
  engine.toggleAccount(NORDEA_ACCOUNT_ID);
  const data2 = cardOf<TransactionsData>(engine.answer("recent transactions"), "transactions");
  assert.equal(data2.accountLabel, "all connected accounts");
});

test("greeting, empty and fallback messages are plain text parts", () => {
  const engine = makeEngine();
  const greet = engine.answer("hei");
  assert.equal(greet.length, 1);
  assert.ok(greet[0].type === "text" && greet[0].text.includes("S-Coach"));
  const empty = engine.answer("   ");
  assert.equal(empty.length, 1);
  assert.ok(empty[0].type === "text");
  const fb = engine.answer("zqxjkw v Prüfungsangst");
  assert.equal(fb.length, 1);
  assert.ok(fb[0].type === "text" && fb[0].text.toLowerCase().includes("not sure"));
});

test("engine is deterministic for a fixed seed", () => {
  const a = makeEngine().answer("How much did I spend on taxis last month?");
  const b = makeEngine().answer("How much did I spend on taxis last month?");
  assert.deepEqual(a, b);
});

test("mock world mirrors the real CSV transaction schema", () => {
  const t = world.transactions[0];
  const keys = Object.keys(t).sort();
  assert.deepEqual(keys, [
    "balance_after_eur",
    "bank_account_id",
    "category",
    "customer_id",
    "mcc_code",
    "merchant_id",
    "transaction_type",
    "tx_amount_eur",
    "tx_date",
    "tx_timestamp",
  ]);
  assert.equal(t.customer_id, "CUST00003");
  assert.match(t.tx_timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+02:00$/);
  assert.ok(["debit", "credit"].includes(t.transaction_type));
});
