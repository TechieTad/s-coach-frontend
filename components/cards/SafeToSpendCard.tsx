"use client";
import type { SafeToSpendData } from "@/lib/types";
import { eur, eur0 } from "@/lib/format";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-[#f6f8f6] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink/45">{label}</div>
      <div className={`text-[13px] font-semibold ${tone ?? "text-ink"}`}>{value}</div>
    </div>
  );
}

export default function SafeToSpendCard({ data }: { data: SafeToSpendData }) {
  const pct =
    data.discretionaryBudget > 0
      ? Math.min(100, (data.everydaySpent / data.discretionaryBudget) * 100)
      : 0;
  const over = data.remaining < 0;
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-black/5 px-4 py-3">
        <div className="text-[13px] font-semibold text-ink">Safe to spend this week</div>
        <div className="text-[11px] text-ink/50">
          {data.monthLabel} · {data.daysLeft} days left in month
        </div>
      </div>
      <div className="px-4 py-4">
        <div className={`text-3xl font-bold tracking-tight ${over ? "text-rose-600" : "text-brand-700"}`}>
          {eur(data.safeThisWeek)}
        </div>
        <div className="mt-1 text-xs text-ink/50">
          left for everyday spending for the rest of the month, spread over the coming week
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-ink/50">
            <span>Everyday spending so far</span>
            <span>
              {eur(data.everydaySpent)} / {eur(data.discretionaryBudget)}
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/5">
            <div
              className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Monthly income" value={eur0(data.monthlyIncome)} />
          <Stat label="Mandatory & regular" value={eur0(data.mandatoryRegular)} />
          <Stat label="Mandatory & irregular" value={eur0(data.mandatoryIrregular)} />
          <Stat label="Savings goal (10%)" value={eur0(data.savingsTarget)} />
          <Stat label="This week so far" value={eur(data.weekSpent)} />
          <Stat
            label="Weekly pace"
            value={eur(data.weeklyPace)}
            tone={data.weeklyPace > data.safeThisWeek ? "text-rose-600" : "text-brand-700"}
          />
        </div>

        {data.weeklyPace > data.safeThisWeek && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 ring-1 ring-amber-200">
            At your current pace you&apos;ll spend {eur(data.weeklyPace)} this week — that&apos;s{" "}
            {eur(data.weeklyPace - data.safeThisWeek)} over the safe amount.
          </div>
        )}
        {data.projectedSave > 0 && (
          <div className="mt-2 text-[12px] text-ink/60">
            If everyday spending paused today, you could still save about{" "}
            <strong>{eur(data.projectedSave)}</strong> this month.
          </div>
        )}
      </div>
    </div>
  );
}
