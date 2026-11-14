"use client";
import type { TransactionsData } from "@/lib/types";
import { MERCHANT_BY_ID } from "@/lib/mockData";
import { CATEGORY_LABEL } from "@/lib/engine";
import { eur } from "@/lib/format";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS_SHORT[m - 1]}`;
}

export default function TransactionsCard({ data }: { data: TransactionsData }) {
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-black/5 px-4 py-3">
        <div className="text-[13px] font-semibold text-ink">Recent transactions</div>
        <div className="text-[11px] text-ink/50">{data.accountLabel}</div>
      </div>
      <ul className="divide-y divide-black/5">
        {data.items.map((t, i) => {
          const name = MERCHANT_BY_ID[t.merchant_id]?.name ?? t.merchant_id;
          const debit = t.transaction_type === "debit";
          return (
            <li key={`${t.tx_timestamp}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  debit ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{name}</div>
                <div className="text-[11px] text-ink/45">
                  {CATEGORY_LABEL[t.category]} · {fmtDate(t.tx_date)} · MCC {t.mcc_code}
                </div>
              </div>
              <div className={`text-[13px] font-semibold ${debit ? "text-ink" : "text-emerald-600"}`}>
                {debit ? "−" : "+"}
                {eur(Math.abs(t.tx_amount_eur))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
