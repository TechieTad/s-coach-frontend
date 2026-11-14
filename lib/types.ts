// Shared types for the S-Coach frontend.
// The Transaction shape mirrors the challenge CSV schema exactly:
// customer_id, bank_account_id, tx_date, tx_timestamp, category,
// tx_amount_eur, balance_after_eur, transaction_type, merchant_id, mcc_code

export type Category =
  | "Salary"
  | "Transfer in"
  | "Savings"
  | "Rent"
  | "Utilities"
  | "Telecom"
  | "Subscriptions"
  | "Insurance"
  | "Loan payment"
  | "Healthcare"
  | "Repairs & appliances"
  | "Taxes & fees"
  | "Groceries"
  | "Dining"
  | "Cafés"
  | "Taxi"
  | "Public transport"
  | "Shopping"
  | "Entertainment"
  | "Personal care";

export type Basket = "mandatory_regular" | "mandatory_irregular" | "everyday";

export interface Transaction {
  customer_id: string;
  bank_account_id: string;
  tx_date: string; // YYYY-MM-DD
  tx_timestamp: string; // ISO 8601
  category: Category;
  tx_amount_eur: number; // negative = debit (money out), positive = credit
  balance_after_eur: number;
  transaction_type: "debit" | "credit";
  merchant_id: string;
  mcc_code: string;
}

export interface Account {
  id: string;
  bank: "S-Bank" | "Nordea" | "OP";
  name: string;
  iban: string;
  balance: number;
  connected: boolean;
  kind: "checking" | "savings";
}

export interface Customer {
  customer_id: string;
  customer_age: number;
  customer_postal_code: string;
}

export interface Period {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  label: string;
}

// ---- chat protocol: assistant messages are a list of parts ----

export type CardKind =
  | "safe-to-spend"
  | "baskets"
  | "category-spend"
  | "what-if"
  | "benchmark"
  | "transactions"
  | "multi-bank";

export interface PartText {
  type: "text";
  text: string; // minimal markdown: **bold**
}
export interface PartCard {
  type: "card";
  card: CardKind;
  data: unknown;
}
export type ChatPart = PartText | PartCard;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
  ts: number; // epoch ms; 0 = hide clock
}

// ---- card payloads ----

export interface SafeToSpendData {
  monthLabel: string;
  safeThisWeek: number;
  weekSpent: number;
  weeklyPace: number;
  discretionaryBudget: number;
  everydaySpent: number;
  remaining: number;
  daysLeft: number;
  projectedSave: number;
  monthlyIncome: number;
  mandatoryRegular: number;
  mandatoryIrregular: number;
  savingsTarget: number;
}

export interface BasketSlice {
  basket: Basket;
  label: string;
  amount: number;
  share: number;
  color: string;
  top: { merchant: string; amount: number }[];
}
export interface BasketsData {
  periodLabel: string;
  total: number;
  slices: BasketSlice[];
}

export interface CategorySpendData {
  category: Category;
  categoryLabel: string;
  periodLabel: string;
  amount: number;
  txCount: number;
  prevAmount: number | null;
  deltaPct: number | null;
  top: { merchant: string; amount: number }[];
}

export interface WhatIfData {
  category: Category;
  categoryLabel: string;
  periodLabel: string;
  baselineMonthly: number;
  defaultPct: number;
  maxPct: number;
}

export interface BenchmarkRow {
  label: string;
  you: number;
  peer: number;
}
export interface BenchmarkData {
  peerLabel: string;
  periodLabel: string;
  rows: BenchmarkRow[];
  note: string;
}

export interface TransactionsData {
  accountLabel: string;
  items: Transaction[];
}

export interface MultiBankData {
  accounts: Account[];
  mergedBalance: number;
}
