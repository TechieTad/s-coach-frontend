// CoachEngine: a local, deterministic stand-in for the FastAPI + LLM-router
// backend described in the MVP architecture. It classifies the user's message
// into intents and returns structured ChatPart[] that the UI renders as
// interactive cards inside the chat stream. Swap lib/api.ts to fetch()
// against a real backend without touching the UI.
import type {
 Account,
 Basket,
 Category,
 CategorySpendData,
 BasketsData,
 BenchmarkData,
 ChatPart,
 Customer,
 MultiBankData,
 Period,
 SafeToSpendData,
 Transaction,
 TransactionsData,
 WhatIfData,
} from "./types.ts";
import { CUSTOMER, MERCHANT_BY_ID, buildWorld, customerFromId, dstr, incomeForId, pad, seedFromId } from "./mockData.ts";
import { eur, round2 } from "./format.ts";

const MONTHS = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December",
];

export function periodThisMonth(now: Date): Period {
 const y = now.getUTCFullYear();
 const m = now.getUTCMonth();
 return { from: `${y}-${pad(m + 1)}-01`, to: dstr(now), label: `${MONTHS[m]} ${y}` };
}

export function periodLastMonth(now: Date): Period {
 const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
 const y = d.getUTCFullYear();
 const m = d.getUTCMonth();
 const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
 return {
 from: `${y}-${pad(m + 1)}-01`,
 to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
 label: `${MONTHS[m]} ${y}`,
 };
}

export function periodPrevMonth(now: Date): Period {
 const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
 const y = d.getUTCFullYear();
 const m = d.getUTCMonth();
 const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
 return {
 from: `${y}-${pad(m + 1)}-01`,
 to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
 label: `${MONTHS[m]} ${y}`,
 };
}

export function periodThisWeek(now: Date): Period {
 const dow = (now.getUTCDay() + 6) % 7; // Monday = 0
 const monday = new Date(now.getTime() - dow * 86400000);
 return { from: dstr(monday), to: dstr(now), label: "this week" };
}

export function periodLast7Days(now: Date): Period {
 const from = new Date(now.getTime() - 6 * 86400000);
 return { from: dstr(from), to: dstr(now), label: "last 7 days" };
}

function parsePeriod(t: string, now: Date): Period {
 if (/last week|past week|viime viikko/.test(t)) return periodLast7Days(now);
 if (/last month|viime kuu/.test(t)) return periodLastMonth(now);
 if (/this week|tämä viikko/.test(t)) return periodThisWeek(now);
 if (/this month|tämä kuu|so far/.test(t)) return periodThisMonth(now);
 if (/today|today/.test(t)) return { from: dstr(now), to: dstr(now), label: "today" };
 return periodLastMonth(now); // stable default: last full month
}

const MANDATORY_REGULAR: Category[] = [
 "Rent", "Utilities", "Telecom", "Subscriptions", "Insurance", "Loan payment",
];
const MANDATORY_IRREGULAR: Category[] = ["Healthcare", "Repairs & appliances", "Taxes & fees"];

export function basketOf(c: Category): Basket {
 if (MANDATORY_REGULAR.includes(c)) return "mandatory_regular";
 if (MANDATORY_IRREGULAR.includes(c)) return "mandatory_irregular";
 return "everyday";
}

export const CATEGORY_LABEL: Record<Category, string> = {
 Salary: "salary",
 "Transfer in": "transfers in",
 Savings: "savings",
 Rent: "rent",
 Utilities: "utilities",
 Telecom: "phone & internet",
 Subscriptions: "subscriptions",
 Insurance: "insurance",
 "Loan payment": "loan payments",
 Healthcare: "healthcare",
 "Repairs & appliances": "repairs & appliances",
 "Taxes & fees": "taxes & fees",
 Groceries: "groceries",
 Dining: "dining out",
 Cafés: "cafés & coffee",
 Taxi: "taxis",
 "Public transport": "public transport",
 Shopping: "shopping",
 Entertainment: "entertainment",
 "Personal care": "personal care",
};

const CATEGORY_KEYWORDS: Array<[RegExp, Category]> = [
 [/taxi|taks|tak\s/i, "Taxi"],
 [/grocer|supermarket|k-citymarket|s-market|prisma|lidl|ruoka/i, "Groceries"],
 [/caf[eé]|coffee|kahvi|kahvila/i, "Cafés"],
 [/dining|restaurant|eating out|lunch out|ravintola|burger|pizza/i, "Dining"],
 [/rent|vuokra/i, "Rent"],
 [/utilit|electric|heating|water bill|helen/i, "Utilities"],
 [/phone|mobile|telecom|internet|elisa|dna/i, "Telecom"],
 [/subscription|spotify|netflix|gym|kuntosali/i, "Subscriptions"],
 [/insurance|vakuutus/i, "Insurance"],
 [/loan|laina/i, "Loan payment"],
 [/health|doctor|dentist|pharmacy|apteekki|lääkäri/i, "Healthcare"],
 [/repair|appliance|washing machine|pesukone|korjaus/i, "Repairs & appliances"],
 [/tax|verot/i, "Taxes & fees"],
 [/shop|clothes|clothing|zalando|zara|h&m|vaate/i, "Shopping"],
 [/entertainment|movie|cinema|finnkino|bar|pub|concert|viihde/i, "Entertainment"],
 [/transport|hsl|bus|train|metro|liikenne/i, "Public transport"],
 [/personal care|haircut|barber|parturi|kampaamo/i, "Personal care"],
];

function matchCategory(t: string): Category | null {
 for (const [re, cat] of CATEGORY_KEYWORDS) if (re.test(t)) return cat;
 return null;
}

export interface EngineOptions {
 now?: Date;
 seed?: number;
 /** When set, the engine models this customer instead of the default demo persona. */
 customerId?: string;
}

export class CoachEngine {
 private now: Date;
 private customer: Customer;
 private txsAll: Transaction[];
 private accounts: Account[];

 constructor(opts: EngineOptions = {}) {
 this.now = opts.now ?? new Date();
 const customer = opts.customerId ? customerFromId(opts.customerId) : CUSTOMER;
 const seed = opts.seed ?? (opts.customerId ? seedFromId(opts.customerId) : 20261113);
 const income = opts.customerId ? incomeForId(opts.customerId) : 3250;
 const rent = opts.customerId ? Math.round((income * 0.29) / 10) * 10 : 950;
 const world = buildWorld(this.now, seed, customer, income, rent);
 this.customer = customer;
 this.txsAll = world.transactions;
 this.accounts = world.accounts;
 }

 getAccounts(): Account[] {
 return this.accounts.map((a) => ({...a }));
 }

 toggleAccount(id: string): Account[] {
 const a = this.accounts.find((x) => x.id === id);
 if (a) a.connected = !a.connected;
 return this.getAccounts();
 }

 mergedBalance(): number {
 return round2(this.accounts.filter((a) => a.connected).reduce((s, a) => s + a.balance, 0));
 }

 private mergedTxs(): Transaction[] {
 const ids = new Set(this.accounts.filter((a) => a.connected).map((a) => a.id));
 return this.txsAll.filter((t) => ids.has(t.bank_account_id));
 }

 private inPeriod(t: Transaction, p: Period): boolean {
 return t.tx_date >= p.from && t.tx_date <= p.to;
 }

 private debitsIn(p: Period): Transaction[] {
 return this.mergedTxs().filter((t) => t.transaction_type === "debit" && this.inPeriod(t, p));
 }

 /** Debits that represent consumption — transfers to your own savings are not "spending". */
 private spendIn(p: Period): Transaction[] {
 return this.debitsIn(p).filter((t) => t.category !== "Savings");
 }

 private sum(txs: Transaction[]): number {
 return round2(txs.reduce((s, t) => s + Math.abs(t.tx_amount_eur), 0));
 }

 private topMerchants(txs: Transaction[], n: number): { merchant: string; amount: number }[] {
 const byId = new Map<string, number>();
 for (const t of txs) byId.set(t.merchant_id, round2((byId.get(t.merchant_id) ?? 0) + Math.abs(t.tx_amount_eur)));
 return [...byId.entries()]
.map(([id, amount]) => ({ merchant: MERCHANT_BY_ID[id]?.name ?? id, amount }))
.sort((a, b) => b.amount - a.amount)
.slice(0, n);
 }

 // ---------- tools ----------

 private safeToSpend(): SafeToSpendData {
 const now = this.now;
 const month = periodThisMonth(now);
 const debits = this.spendIn(month);
 const mr = this.sum(debits.filter((t) => basketOf(t.category) === "mandatory_regular"));
 const mi = this.sum(debits.filter((t) => basketOf(t.category) === "mandatory_irregular"));
 const ev = this.sum(debits.filter((t) => basketOf(t.category) === "everyday"));

 const salaries = this.mergedTxs()
.filter((t) => t.category === "Salary" && t.transaction_type === "credit")
.sort((a, b) => b.tx_date.localeCompare(a.tx_date))
.slice(0, 3)
.map((t) => t.tx_amount_eur);
 const monthlyIncome = salaries.length
 ? round2(salaries.reduce((s, x) => s + x, 0) / salaries.length)
 : 0;

 const savingsTarget = round2(monthlyIncome * 0.1);
 const discretionaryBudget = round2(monthlyIncome - mr - mi - savingsTarget);
 const remaining = round2(discretionaryBudget - ev);

 const y = now.getUTCFullYear();
 const m = now.getUTCMonth();
 const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
 const daysLeft = daysInMonth - now.getUTCDate() + 1; // incl. today
 const safeThisWeek = Math.max(0, round2((remaining * 7) / daysLeft));

 const week = periodThisWeek(now);
 const weekSpent = this.sum(
 this.spendIn(week).filter((t) => basketOf(t.category) === "everyday"),
 );
 const daysIntoWeek = ((now.getUTCDay() + 6) % 7) + 1;
 const weeklyPace = round2((weekSpent / daysIntoWeek) * 7);

 return {
 monthLabel: month.label,
 safeThisWeek,
 weekSpent,
 weeklyPace,
 discretionaryBudget,
 everydaySpent: ev,
 remaining,
 daysLeft,
 projectedSave: Math.max(0, remaining),
 monthlyIncome,
 mandatoryRegular: mr,
 mandatoryIrregular: mi,
 savingsTarget,
 };
 }

 private basketsCard(period: Period): ChatPart[] {
 const debits = this.spendIn(period);
 const total = this.sum(debits);
 const colors: Record<Basket, string> = {
 mandatory_regular: "#0b7a4b",
 mandatory_irregular: "#d97706",
 everyday: "#e11d48",
 };
 const labels: Record<Basket, string> = {
 mandatory_regular: "Mandatory & regular",
 mandatory_irregular: "Mandatory & irregular",
 everyday: "Everyday slippage",
 };
 const slices = (["mandatory_regular", "mandatory_irregular", "everyday"] as Basket[]).map((b) => {
 const txs = debits.filter((t) => basketOf(t.category) === b);
 const amount = this.sum(txs);
 return {
 basket: b,
 label: labels[b],
 amount,
 share: total > 0 ? amount / total : 0,
 color: colors[b],
 top: this.topMerchants(txs, 4),
 };
 });
 const everyday = slices.find((s) => s.basket === "everyday");
 const persona =
 everyday && total > 0 && everyday.share > 0.45
 ? ` Most of your outflow is **everyday spending** — small, frequent purchases are where money tends to slip through your fingers.`
 : ` Your everyday basket is the smallest slice — nice. The irregular mandatory hits are the ones to keep an eye on.`;
 return [
 {
 type: "text",
 text: `In **${period.label}** you spent **${eur(total)}** in total (savings transfers not counted). Split into the three baskets:${persona}\nTap a slice of the chart to see the biggest merchants in that basket.`,
 },
 { type: "card", card: "baskets", data: { periodLabel: period.label, total, slices } satisfies BasketsData },
 ];
 }

 private categorySpendCard(cat: Category, period: Period): ChatPart[] {
 const txs = this.debitsIn(period).filter((t) => t.category === cat);
 const amount = this.sum(txs);
 const prev = periodPrevMonth(this.now);
 const prevAmount = this.sum(this.debitsIn(prev).filter((t) => t.category === cat));
 const deltaPct = prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : null;
 const top = this.topMerchants(txs, 3);
 const deltaText =
 deltaPct === null
 ? ""
 : deltaPct <= -1
 ? ` — that's **${Math.round(-deltaPct)}% less** than ${prev.label} (${eur(prevAmount)}).`
 : deltaPct >= 1
 ? ` — that's **${Math.round(deltaPct)}% more** than ${prev.label} (${eur(prevAmount)}).`
 : ` — about the same as ${prev.label}.`;
 const topText = top.length ? ` Top merchant: **${top[0].merchant}** (${eur(top[0].amount)}).` : "";
 return [
 {
 type: "text",
 text: `In **${period.label}** you spent **${eur(amount)}** on ${CATEGORY_LABEL[cat]} across ${txs.length} transaction${txs.length === 1 ? "" : "s"}.${deltaText}${topText}`,
 },
 {
 type: "card",
 card: "category-spend",
 data: {
 category: cat,
 categoryLabel: CATEGORY_LABEL[cat],
 periodLabel: period.label,
 amount,
 txCount: txs.length,
 prevAmount: prevAmount > 0 ? prevAmount : null,
 deltaPct,
 top,
 } satisfies CategorySpendData,
 },
 ];
 }

 private whatIfCard(cat: Category, pct: number): ChatPart[] {
 const last = periodLastMonth(this.now);
 const baselineMonthly = this.sum(this.debitsIn(last).filter((t) => t.category === cat));
 return [
 {
 type: "text",
 text: `Based on **${last.label}**, you spent **${eur(baselineMonthly)}** on ${CATEGORY_LABEL[cat]}. Play with the slider to see what cutting back would save:`,
 },
 {
 type: "card",
 card: "what-if",
 data: {
 category: cat,
 categoryLabel: CATEGORY_LABEL[cat],
 periodLabel: last.label,
 baselineMonthly,
 defaultPct: pct,
 maxPct: 50,
 } satisfies WhatIfData,
 },
 ];
 }

 private benchmarkCard(): ChatPart[] {
 const age = this.customer.customer_age;
 const band =
 age < 25 ? "18–24" : age < 35 ? "25–34" : age < 45 ? "35–44" : age < 55 ? "45–54" : age < 65 ? "55–64" : "65+";
 const region = this.customer.customer_postal_code.startsWith("00") ? "Helsinki" : "Finland";
 // Synthetic peer averages modelled on Statistics Finland household consumption
 // statistics — clearly labelled as demo values, not real customer data.
 const peer: Record<string, number> = { total: 2610, groceries: 430, dining: 285, transport: 120, fun: 95 };
 const last = periodLastMonth(this.now);
 const d = (cats: Category[]) => this.sum(this.spendIn(last).filter((t) => cats.includes(t.category)));
 const rows = [
 { label: "Total spending", you: this.sum(this.spendIn(last)), peer: peer.total },
 { label: "Groceries", you: d(["Groceries"]), peer: peer.groceries },
 { label: "Dining & cafés", you: d(["Dining", "Cafés"]), peer: peer.dining },
 { label: "Transport (incl. taxis)", you: d(["Taxi", "Public transport"]), peer: peer.transport },
 { label: "Entertainment", you: d(["Entertainment"]), peer: peer.fun },
 ];
 const data: BenchmarkData = {
 peerLabel: `${band}-year-olds in ${region}`,
 periodLabel: last.label,
 rows,
 note:
 "Peer group = your 'financial twins': synthetic averages for " +
 `${band}-year-olds in ${region}, modelled on Statistics Finland household consumption data. Demo values, not real customer data.`,
 };
 return [
 {
 type: "text",
 text: `Here's how **${last.label}** compares with people like you — your financial twins (${band}, ${region}):`,
 },
 { type: "card", card: "benchmark", data },
 ];
 }

 private transactionsCard(n = 8): ChatPart[] {
 const items = [...this.mergedTxs()].sort((a, b) => b.tx_timestamp.localeCompare(a.tx_timestamp)).slice(0, n);
 const data: TransactionsData = {
 accountLabel: this.accounts.filter((a) => a.connected).length > 1 ? "all connected accounts" : "S-Bank everyday account",
 items,
 };
 return [
 { type: "text", text: `Here are your **${items.length} most recent transactions**:` },
 { type: "card", card: "transactions", data },
 ];
 }

 private multiBankCard(extraText?: string): ChatPart[] {
 const data: MultiBankData = { accounts: this.getAccounts(), mergedBalance: this.mergedBalance() };
 const connected = this.accounts.filter((a) => a.connected).length;
 const text =
 extraText ??
 (connected > 1
 ? `You're viewing **${connected} accounts** merged into one stream (PSD2-style consent, simulated). Toggle accounts below.`
 : "Under PSD2 you can let S-Bank fetch data from other banks. Connect an account below — I'll merge it into your coach view (simulated OAuth2 consent).");
 return [{ type: "text", text }, { type: "card", card: "multi-bank", data }];
 }

 // ---------- intent router ----------

 answer(raw: string): ChatPart[] {
 const text = raw.trim();
 const t = text.toLowerCase();
 if (!t) return [{ type: "text", text: "Say something — I'm listening. 🙂" }];

 // greeting / help
 if (/^(hi|hey|hello|yo|moi|hei|terve)\b/.test(t) || /\b(help|what can you do|mitä osaat)\b/.test(t)) {
 return [
 {
 type: "text",
 text:
 "Hei! I'm **S-Coach**, your personal economic trainer. Ask me anything about your own money, for example:\n• How much did I spend on taxis last month?\n• What kind of spender am I?\n• What is safe for me to spend this week?\n• How much could I save if I reduced dining out by 20%?",
 },
 ];
 }

 // connect a specific secondary bank
 const connectBank = t.match(/\bconnect\b/) && t.match(/nordea|\bop\b/);
 if (connectBank) {
 const bankName = /nordea/.test(t) ? "Nordea" : "OP";
 const acc = this.accounts.find((a) => a.bank === bankName);
 if (acc && !acc.connected) {
 this.toggleAccount(acc.id);
 return this.multiBankCard(
 `**${bankName}** connected via simulated PSD2 consent — your coach now sees the merged view (total balance ${eur(this.mergedBalance())}). Ask me anything again and I'll use all connected accounts.`,
 );
 }
 return this.multiBankCard(`**${bankName}** is already connected.`);
 }

 // multi-bank / PSD2 view
 if (/\b(nordea|op|other banks?|multi-?bank|psd2|all my accounts|toinen pankki)\b/.test(t)) {
 return this.multiBankCard();
 }

 // safe-to-spend / safe-to-save
 if (/safe[- ]to[- ](spend|save)|safe for me|turvallinen|käyttövara|left to spend/.test(t)) {
 const data = this.safeToSpend();
 const saveLine =
 data.projectedSave > 0
 ? ` If you spend nothing more on everyday things this month, you could **save about ${eur(data.projectedSave)}**.`
 : "";
 return [
 {
 type: "text",
 text: `Here's your **safe-to-spend** for the rest of **${data.monthLabel}**: what's left for everyday spending after income, mandatory costs and your savings goal are covered.${saveLine}`,
 },
 { type: "card", card: "safe-to-spend", data },
 ];
 }

 // what-if (must be checked before plain spend questions)
 const cat = matchCategory(t);
 const pctMatch = t.match(/(\d{1,3})\s*%/);
 const pct = pctMatch ? Math.min(90, parseInt(pctMatch[1], 10)) : 20;
 if (cat && /(what if|\bif i\b|could i save|save if|reduc|cut down|spend less|vähennän|säästän)/.test(t)) {
 return this.whatIfCard(cat, pct);
 }

 // three baskets
 if (/spender|basket|where (does|did) my money|mihin rah|kolme|three baskets/.test(t)) {
 return this.basketsCard(periodLastMonth(this.now));
 }

 // benchmark
 if (/benchmark|compare|peer|twin|others|similar|average|keskimäärin|vertailu/.test(t)) {
 return this.benchmarkCard();
 }

 // transaction list
 if (/transaction|recent|history|show me|list|latest|viimeisimmät|tilitapahtumat/.test(t)) {
 return this.transactionsCard();
 }

 // category spend
 if (cat && /(spend|spent|how much|used|cost|paljonko|käytin|mikä|kuinka)/.test(t)) {
 return this.categorySpendCard(cat, parsePeriod(t, this.now));
 }
 if (cat) {
 return this.categorySpendCard(cat, parsePeriod(t, this.now));
 }
 if (/(spend|spent|how much|käytin|paljonko)/.test(t)) {
 return this.basketsCard(periodLastMonth(this.now));
 }

 return [
 {
 type: "text",
 text:
 "I'm not sure I understood that. Try asking about spending in a category (\"taxis last month\"), your **three baskets**, what's **safe to spend** this week, a **what-if** scenario, or a **benchmark** against similar people.",
 },
 ];
 }
}
