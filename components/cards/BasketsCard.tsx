"use client";
import { useState } from "react";
import type { BasketsData, Basket } from "@/lib/types";
import { eur } from "@/lib/format";

const R = 52;
const C = 2 * Math.PI * R;

export default function BasketsCard({ data }: { data: BasketsData }) {
  const [sel, setSel] = useState<Basket | null>(null);
  let acc = 0;
  const active = sel ? data.slices.find((s) => s.basket === sel) : undefined;
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-black/5 px-4 py-3">
        <div className="text-[13px] font-semibold text-ink">The three baskets</div>
        <div className="text-[11px] text-ink/50">
          {data.periodLabel} · total {eur(data.total)}
        </div>
      </div>
      <div className="px-4 py-4">
        <svg viewBox="0 0 140 140" className="mx-auto block h-44 w-44">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#eef1ee" strokeWidth="18" />
          {data.slices.map((s) => {
            const frac = s.share;
            const offset = acc;
            acc += frac;
            const dash = Math.max(0, frac * C - 1.5);
            return (
              <circle
                key={s.basket}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={sel && sel !== s.basket ? 10 : 18}
                strokeDasharray={`${dash} ${C}`}
                strokeDashoffset={-offset * C}
                transform="rotate(-90 70 70)"
                className="cursor-pointer transition-all duration-200"
                opacity={sel && sel !== s.basket ? 0.35 : 1}
                onClick={() => setSel(sel === s.basket ? null : s.basket)}
              >
                <title>
                  {s.label}: {eur(s.amount)}
                </title>
              </circle>
            );
          })}
          <text x="70" y="67" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-ink">
            {active ? eur(active.amount) : eur(data.total)}
          </text>
          <text x="70" y="82" textAnchor="middle" fontSize="8" className="fill-ink/50">
            {active ? active.label : "total spent"}
          </text>
        </svg>

        <div className="mt-3 flex flex-col gap-1.5">
          {data.slices.map((s) => (
            <button
              key={s.basket}
              type="button"
              onClick={() => setSel(sel === s.basket ? null : s.basket)}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] ring-1 transition ${
                sel === s.basket
                  ? "bg-brand-50 ring-brand-300"
                  : "bg-[#f6f8f6] ring-black/5 hover:bg-brand-50/50"
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 truncate font-medium text-ink">{s.label}</span>
              <span className="text-ink/60">{eur(s.amount)}</span>
              <span className="w-9 text-right text-ink/40">{Math.round(s.share * 100)}%</span>
            </button>
          ))}
        </div>

        {active && (
          <div className="mt-3 border-t border-black/5 pt-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/45">
              Biggest in: {active.label}
            </div>
            {active.top.length === 0 && <div className="text-[12px] text-ink/50">Nothing here this period.</div>}
            {active.top.map((t) => (
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
