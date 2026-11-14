"use client";
import type { BenchmarkData } from "@/lib/types";
import { eur0 } from "@/lib/format";

export default function BenchmarkCard({ data }: { data: BenchmarkData }) {
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-black/5 px-4 py-3">
        <div className="text-[13px] font-semibold text-ink">You vs. your financial twins</div>
        <div className="text-[11px] text-ink/50">
          {data.peerLabel} · {data.periodLabel}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {data.rows.map((r) => {
          const max = Math.max(r.you, r.peer, 1);
          const over = r.you > r.peer;
          return (
            <div key={r.label}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="font-medium text-ink">{r.label}</span>
                <span className="text-ink/50">
                  you <strong className={over ? "text-rose-600" : "text-brand-700"}>{eur0(r.you)}</strong> ·
                  twins {eur0(r.peer)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-2 overflow-hidden rounded-full bg-black/5">
                  <div
                    className={`h-full rounded-full ${over ? "bg-rose-400" : "bg-brand-500"}`}
                    style={{ width: `${(r.you / max) * 100}%` }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/5">
                  <div className="h-full rounded-full bg-ink/25" style={{ width: `${(r.peer / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
        <div className="text-[11px] leading-snug text-ink/45">{data.note}</div>
      </div>
    </div>
  );
}
