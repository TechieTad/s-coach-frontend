"use client";
import { useState } from "react";
import type { WhatIfData } from "@/lib/types";
import { eur, round2 } from "@/lib/format";

export default function WhatIfCard({ data }: { data: WhatIfData }) {
  const [pct, setPct] = useState(data.defaultPct);
  const saved = round2((data.baselineMonthly * pct) / 100);
  const rest = round2(data.baselineMonthly - saved);
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-black/5 px-4 py-3">
        <div className="text-[13px] font-semibold text-ink">
          What if… you spent less on {data.categoryLabel}?
        </div>
        <div className="text-[11px] text-ink/50">
          baseline: {eur(data.baselineMonthly)}/month in {data.periodLabel}
        </div>
      </div>
      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-brand-700">{eur(saved)}</div>
          <div className="text-xs text-ink/50">
            saved / month ≈ <strong>{eur(round2(saved * 12))}</strong>/year
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={data.maxPct}
          step={5}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="s-coach-range mt-3"
          aria-label={`Cut ${data.categoryLabel} spending by a percentage`}
        />
        <div className="mt-1 flex justify-between text-[11px] text-ink/50">
          <span>0%</span>
          <span className="font-semibold text-brand-700">−{pct}%</span>
          <span>{data.maxPct}%</span>
        </div>
        <div className="mt-3 rounded-xl bg-[#f6f8f6] px-3 py-2 text-[12px] text-ink/70">
          You&apos;d still spend <strong>{eur(rest)}</strong>/month on {data.categoryLabel} — and bank{" "}
          <strong>{eur(saved)}</strong> instead.
        </div>
      </div>
    </div>
  );
}
