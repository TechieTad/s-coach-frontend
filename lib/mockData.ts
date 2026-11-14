// Deterministic synthetic transaction data for the demo persona.
// Shapes follow the challenge repo schemas exactly:
// tx_junction_transactions.csv columns are preserved 1:1 on Transaction.
// The demo customer is a REAL row from tx_customers_junction.csv:
// CUST00003, age 30, postal 00530 (central Helsinki).
import type { Account, Category, Customer, Transaction } from "./types.ts";
import { round2 } from "./format.ts";

export const CUSTOMER: Customer = {
 customer_id: "CUST00003",
 customer_age: 30,
 customer_postal_code: "00530",
};

export const SB_ACCOUNT_ID = "FI21 1234 5600 0007 85";
export const NORDEA_ACCOUNT_ID = "FI66 1006 0420 0123 45";
export const OP_ACCOUNT_ID = "FI55 1001 0020 0397 45";

export interface MerchantDef {
 id: string;
 name: string;
 category: Category;
 mcc: string;
}

function def(id: string, name: string, category: Category, mcc: string): MerchantDef {
 return { id, name, category, mcc };
}

export const MERCHANTS = {
 SALARY: def("MER001", "Työnantaja Oy", "Salary", "0000"),
 LANDLORD: def("MER002", "Vuokranantaja Asunto Oy", "Rent", "6513"),
 HSL: def("MER003", "HSL Helsingin seudun liikenne", "Public transport", "4111"),
 ELIXIA: def("MER004", "Elixia kuntosali", "Subscriptions", "7997"),
 ELISA: def("MER005", "Elisa Oyj", "Telecom", "4814"),
 HELEN: def("MER006", "Helen Oy", "Utilities", "4900"),
 TAPIOLA: def("MER007", "LähiTapiola", "Insurance", "6300"),
 SPOTIFY: def("MER008", "Spotify AB", "Subscriptions", "4899"),
 NETFLIX: def("MER009", "Netflix International", "Subscriptions", "4899"),
 SLOAN: def("MER010", "S-Bank laina", "Loan payment", "6012"),
 OP_SAVINGS_OUT: def("MER011", "Siirto OP-tilille", "Savings", "0000"),

 KCITY: def("MER101", "K-Citymarket", "Groceries", "5411"),
 SMARKET: def("MER102", "S-Market", "Groceries", "5411"),
 PRISMA: def("MER103", "Prisma", "Groceries", "5411"),
 LIDL: def("MER104", "Lidl Suomi", "Groceries", "5411"),
 RKIOSKI: def("MER105", "R-kioski", "Groceries", "5499"),

 ROBERTS: def("MER201", "Robert's Coffee", "Cafés", "5814"),
 FAZER: def("MER202", "Fazer Café", "Cafés", "5814"),
 EKBERG: def("MER203", "Café Ekberg", "Cafés", "5814"),

 HESBURGER: def("MER301", "Hesburger", "Dining", "5812"),
 KUURNA: def("MER302", "Ravintola Kuurna", "Dining", "5812"),
 PIPPURI: def("MER303", "Ravintola Pippuri", "Dining", "5812"),
 TORNI: def("MER304", "Ravintola Tornin", "Dining", "5812"),

 TAXI_HEL: def("MER401", "Taxi Helsinki", "Taxi", "4121"),
 TAKSI_01: def("MER402", "01 Taksi", "Taxi", "4121"),

 ZALANDO: def("MER501", "Zalando SE", "Shopping", "5651"),
 HM: def("MER502", "H&M Hennes & Mauritz", "Shopping", "5651"),
 CLAS: def("MER503", "Clas Ohlson Oy", "Shopping", "5946"),

 FINNKINO: def("MER601", "Finnkino Oy", "Entertainment", "7832"),
 BRYNOLF: def("MER602", "Pub Brynolf", "Entertainment", "5813"),

 BARBER: def("MER701", "Parturi Kampaamo Kutomo", "Personal care", "7230"),
 PHARMACY: def("MER702", "Yliopiston Apteekki", "Healthcare", "5912"),
 DENTIST: def("MER703", "Hammaslääkäri Dentist Oy", "Healthcare", "8011"),
 CARFIX: def("MER704", "Autoklinikka Oy", "Repairs & appliances", "5531"),
 WASHER: def("MER705", "Clas Ohlson Oy (kodinkone)", "Repairs & appliances", "5722"),

 FRIEND: def("MER801", "Matti M.", "Transfer in", "0000"),
 NORDEA_BONUS: def("MER802", "Nordea Oyj (bonus)", "Salary", "0000"),
 OP_INTEREST: def("MER803", "OP Käteistili (korko)", "Transfer in", "0000"),
};

const GROCERS = [MERCHANTS.KCITY, MERCHANTS.SMARKET, MERCHANTS.PRISMA, MERCHANTS.LIDL];
const KIOSKS = [MERCHANTS.RKIOSKI];
const CAFES = [MERCHANTS.ROBERTS, MERCHANTS.FAZER, MERCHANTS.EKBERG];
const LUNCH = [MERCHANTS.HESBURGER, MERCHANTS.KUURNA];
const RESTAURANTS = [MERCHANTS.KUURNA, MERCHANTS.PIPPURI, MERCHANTS.TORNI];
const TAXIS = [MERCHANTS.TAXI_HEL, MERCHANTS.TAKSI_01];
const SHOPS = [MERCHANTS.ZALANDO, MERCHANTS.HM, MERCHANTS.CLAS];
const FUN = [MERCHANTS.FINNKINO, MERCHANTS.BRYNOLF];

export const MERCHANT_BY_ID: Record<string, MerchantDef> = Object.fromEntries(
 Object.values(MERCHANTS).map((m) => [m.id, m]),
);

// ---- deterministic RNG ----
export function mulberry32(seed: number): () => number {
 let a = seed >>> 0;
 return () => {
 a |= 0;
 a = (a + 0x6d2b79f5) | 0;
 let t = Math.imul(a ^ (a >>> 15), 1 | a);
 t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
 return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

const DAY = 86400000;

export function pad(n: number): string {
 return String(n).padStart(2, "0");
}

/** UTC calendar date of d as YYYY-MM-DD */
export function dstr(d: Date): string {
 return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export interface World {
 customer: Customer;
 accounts: Account[];
 transactions: Transaction[];
}

interface Ev {
 day: string;
 hour: number;
 merchant: MerchantDef;
 amount: number;
 account: string;
}

// ---- per-customer persona, derived deterministically from the customer id ----
const POSTAL_CODES = ["00530", "00100", "02150", "33100", "90100", "20100", "00700"];

/** FNV-1a hash of the id string → a stable 32-bit seed for that customer. */
export function seedFromId(id: string): number {
 let h = 2166136261 >>> 0;
 for (let i = 0; i < id.length; i++) {
 h ^= id.charCodeAt(i);
 h = Math.imul(h, 16777619) >>> 0;
 }
 return h >>> 0;
}

/** A stable persona (age + postal code) for any customer id, so answers differ per user. */
export function customerFromId(id: string): Customer {
 const rnd = mulberry32(seedFromId(id));
 const age = 18 + Math.floor(rnd() * 53); // 18..70
 const postal = POSTAL_CODES[Math.floor(rnd() * POSTAL_CODES.length)];
 return { customer_id: id, customer_age: age, customer_postal_code: postal };
}

/** Net monthly salary (2200–5000 €, 50 € steps) derived from the customer id. */
export function incomeForId(id: string): number {
 const rnd = mulberry32((seedFromId(id) ^ 0x9e3779b9) >>> 0);
 return Math.round((2200 + rnd() * 2800) / 50) * 50;
}

export function buildWorld(now: Date, seed = 20261113, customer: Customer = CUSTOMER, income = 3250, rent = 950): World {
 const rnd = mulberry32(seed);
 const range = (min: number, max: number) => min + rnd() * (max - min);
 const int = (min: number, max: number) => Math.floor(range(min, max + 1));
 function pick<T>(arr: T[]): T {
 return arr[Math.floor(rnd() * arr.length)];
 }

 const events: Ev[] = [];
 const ev = (day: string, hour: number, merchant: MerchantDef, amount: number, account = SB_ACCOUNT_ID) =>
 events.push({ day, hour, merchant, amount, account });

 // daily life, Aug 1 2026.. now
 for (let d = new Date(Date.UTC(2026, 7, 1)); d.getTime() <= now.getTime(); d = new Date(d.getTime() + DAY)) {
 const day = dstr(d);
 const dom = d.getUTCDate();
 const dow = d.getUTCDay();

 if (dom === 1) {
 ev(day, 9, MERCHANTS.LANDLORD, -rent);
 ev(day, 10, MERCHANTS.HSL, -47.7);
 }
 if (dom === 3) ev(day, 9, MERCHANTS.ELIXIA, -39.9);
 if (dom === 5) ev(day, 12, MERCHANTS.ELISA, -19.9);
 if (dom === 10) ev(day, 15, MERCHANTS.HELEN, -round2(range(32, 62)));
 if (dom === 12) ev(day, 9, MERCHANTS.TAPIOLA, -24.9);
 if (dom === 15) ev(day, 8, MERCHANTS.SPOTIFY, -11.99);
 if (dom === 18) ev(day, 8, MERCHANTS.NETFLIX, -15.99);
 if (dom === 25) ev(day, 8, MERCHANTS.SALARY, income); // Aug/Sep/Oct 25 (Nov 25 is in the future)
 if (dom === 26) {
 ev(day, 20, MERCHANTS.SLOAN, -185.5);
 ev(day, 21, MERCHANTS.OP_SAVINGS_OUT, -300);
 }

 if (rnd() < 0.5) ev(day, int(10, 20), pick(GROCERS), -round2(range(12, 85)));
 if (rnd() < 0.15) ev(day, int(8, 18), pick(KIOSKS), -round2(range(3, 12)));
 if (rnd() < 0.55) ev(day, int(7, 16), pick(CAFES), -round2(range(3.2, 6.8)));
 if (rnd() < 0.22) ev(day, int(11, 14), pick(LUNCH), -round2(range(10.5, 16.5)));
 if (rnd() < 0.12) ev(day, int(17, 21), pick(RESTAURANTS), -round2(range(18, 68)));
 if (rnd() < 0.08) ev(day, int(18, 23), pick(TAXIS), -round2(range(8.5, 27)));
 if (rnd() < 0.06) ev(day, int(12, 20), pick(SHOPS), -round2(range(15, 130)));
 if (rnd() < 0.05) ev(day, int(19, 22), pick(FUN), -round2(range(9, 45)));
 if (rnd() < 0.03) ev(day, int(10, 18), MERCHANTS.BARBER, -25);
 if (rnd() < 0.015) ev(day, int(9, 17), MERCHANTS.PHARMACY, -round2(range(6, 48)));
 if (rnd() < 0.004) ev(day, int(9, 16), MERCHANTS.FRIEND, 40);
 if (dow === 6 && rnd() < 0.4) ev(day, 9, MERCHANTS.BARBER, -25); // weekend haircut sometimes
 }

 // forced events so the demo questions have interesting answers
 ev("2026-08-14", 14, MERCHANTS.CARFIX, -210); // car repair -> mandatory irregular
 ev("2026-09-21", 11, MERCHANTS.DENTIST, -120); // healthcare -> mandatory irregular
 ev("2026-10-17", 16, MERCHANTS.WASHER, -349); // washing machine -> mandatory irregular
 ev("2026-10-05", 22, MERCHANTS.TAXI_HEL, -18.4); // taxis in October (last full month)
 ev("2026-10-24", 23, MERCHANTS.TAKSI_01, -24.9);
 ev("2026-11-06", 21, MERCHANTS.TAXI_HEL, -14.2); // a taxi this week

 // secondary banks (PSD2 bonus)
 ev("2026-09-08", 19, MERCHANTS.KUURNA, -42.5, NORDEA_ACCOUNT_ID);
 ev("2026-10-02", 12, MERCHANTS.KCITY, -54.2, NORDEA_ACCOUNT_ID);
 ev("2026-10-19", 20, MERCHANTS.PIPPURI, -36.8, NORDEA_ACCOUNT_ID);
 ev("2026-10-25", 9, MERCHANTS.NORDEA_BONUS, 400, NORDEA_ACCOUNT_ID);
 ev("2026-09-30", 6, MERCHANTS.OP_INTEREST, 6.42, OP_ACCOUNT_ID);

 events.sort((a, b) => `${a.day}${pad(a.hour)}`.localeCompare(`${b.day}${pad(b.hour)}`));

 const balances: Record<string, number> = {
 [SB_ACCOUNT_ID]: 4200,
 [NORDEA_ACCOUNT_ID]: 1180.3,
 [OP_ACCOUNT_ID]: 3193.58,
 };

 const transactions: Transaction[] = events.map((e) => {
 const minute = Math.floor(rnd() * 60);
 const amt = round2(e.amount);
 balances[e.account] = round2(balances[e.account] + amt);
 return {
 customer_id: customer.customer_id,
 bank_account_id: e.account,
 tx_date: e.day,
 tx_timestamp: `${e.day}T${pad(e.hour)}:${pad(minute)}:00+02:00`,
 category: e.merchant.category,
 tx_amount_eur: amt,
 balance_after_eur: balances[e.account],
 transaction_type: amt < 0 ? "debit" : "credit",
 merchant_id: e.merchant.id,
 mcc_code: e.merchant.mcc,
 };
 });

 const accounts: Account[] = [
 {
 id: SB_ACCOUNT_ID,
 bank: "S-Bank",
 name: "Everyday account",
 iban: SB_ACCOUNT_ID,
 balance: balances[SB_ACCOUNT_ID],
 connected: true,
 kind: "checking",
 },
 {
 id: NORDEA_ACCOUNT_ID,
 bank: "Nordea",
 name: "Nordea current account",
 iban: NORDEA_ACCOUNT_ID,
 balance: balances[NORDEA_ACCOUNT_ID],
 connected: false,
 kind: "checking",
 },
 {
 id: OP_ACCOUNT_ID,
 bank: "OP",
 name: "OP savings account",
 iban: OP_ACCOUNT_ID,
 balance: balances[OP_ACCOUNT_ID],
 connected: false,
 kind: "savings",
 },
 ];

 return { customer, accounts, transactions };
}
