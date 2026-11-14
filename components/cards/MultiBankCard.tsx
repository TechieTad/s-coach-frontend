"use client";
import { useState } from "react";
import type { CoachApi } from "@/lib/api";
import type { Account, MultiBankData } from "@/lib/types";
import { eur, round2 } from "@/lib/format";

const BANK_STYLE: Record<Account["bank"], string> = {
  "S-Bank": "bg-brand-600",
  Nordea: "bg-[#0000a0]",
  OP: "bg-[#ff6600]",
};

const BANK_LETTER: Record<Account["bank"], string> = {
  "S-Bank": "S",
  Nordea: "N",
  OP: "OP",
};

export default function MultiBankCard({
  data,
  api,
  onChanged,
}: {
  data: MultiBankData;
  api: CoachApi;
  onChanged: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>(data.accounts);
  const toggle = (id: string) => {
    setAccounts(api.toggleAccount(id));
    onChanged();
  };
  const merged = round2(accounts.filter((a) => a.connected).reduce((s, a) => s + a.balance, 0));
  return (
    <div className="w-full self-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-black/5 px-4 py-3">
        <div className="text-[13px] font-semibold text-ink">All your accounts (PSD2)</div>
        <div className="text-[11px] text-ink/50">merged balance across connected accounts</div>
      </div>
      <ul className="divide-y divide-black/5">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${BANK_STYLE[a.bank]}`}
            >
              {BANK_LETTER[a.bank]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{a.name}</div>
              <div className="truncate text-[11px] text-ink/45">
                {a.bank} · {a.iban}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-semibold text-ink">{eur(a.balance)}</div>
              {a.bank === "S-Bank" ? (
                <span className="text-[10px] font-medium text-emerald-600">always on</span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 transition ${
                    a.connected
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-brand-600 text-white ring-brand-600 hover:bg-brand-700"
                  }`}
                >
                  {a.connected ? "connected" : "connect"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-black/5 bg-[#f6f8f6] px-4 py-2.5">
        <span className="text-[12px] font-medium text-ink/60">Merged balance</span>
        <span className="text-[14px] font-bold text-brand-700">{eur(merged)}</span>
      </div>
    </div>
  );
}
