"use client";
import type { CategorySpendData } from "@/lib/types";
import { eur, pctStr } from "@/lib/format";

export default function CategorySpendCard({ data }: { data: CategorySpendData }) {
  const up = (data.deltaPct ?? 0) > 0;
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold capitalize text-ink">{data.categoryLabel}</div>
          <div className="text-[11px] text-ink/50">{data.periodLabel}</div>
        </div>
        {data.deltaPct !== null && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
              up
                ? "bg-rose-50 text-rose-600 ring-rose-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {pctStr(data.deltaPct)} vs prev. month
          </span>
        )}
      </div>
      <div className="px-4 py-4">
        <div className="text-3xl font-bold tracking-tight text-ink">{eur(data.amount)}</div>
        <div className="mt-0.5 text-xs text-ink/50">
          {data.txCount} transaction{data.txCount === 1 ? "" : "s"}
        </div>
        {data.top.length > 0 && (
          <div className="mt-3 border-t border-black/5 pt-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/45">Top merchants</div>
            {data.top.map((t) => (
              <div key={t.merchant} className="flex justify-between py-0.5 text-[12px]">
                <span className="truncate text-ink/80">{t.merchant}</span>
                <span className="font-medium text-ink">{eur(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
