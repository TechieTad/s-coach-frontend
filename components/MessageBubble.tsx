"use client";

import type { CoachApi } from "@/lib/api";
import type { ChatMessage, ChatPart, SafeToSpendData, BasketsData, CategorySpendData, WhatIfData, BenchmarkData, TransactionsData, MultiBankData } from "@/lib/types";
import { timeStr } from "@/lib/format";
import SafeToSpendCard from "./cards/SafeToSpendCard";
import BasketsCard from "./cards/BasketsCard";
import CategorySpendCard from "./cards/CategorySpendCard";
import WhatIfCard from "./cards/WhatIfCard";
import BenchmarkCard from "./cards/BenchmarkCard";
import TransactionsCard from "./cards/TransactionsCard";
import MultiBankCard from "./cards/MultiBankCard";

/** minimal markdown: **bold** and newlines */
export function renderText(text: string) {
  const chunks = text.split(/(\*\*[^*]+\*\*)/g);
  return chunks.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return p.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

function PartView({
  part,
  api,
  onAccountsChanged,
}: {
  part: ChatPart;
  api: CoachApi;
  onAccountsChanged: () => void;
}) {
  if (part.type === "text") {
    return (
      <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-[15px] leading-snug text-ink shadow-sm ring-1 ring-black/5">
        {renderText(part.text)}
      </div>
    );
  }
  switch (part.card) {
    case "safe-to-spend":
      return <SafeToSpendCard data={part.data as SafeToSpendData} />;
    case "baskets":
      return <BasketsCard data={part.data as BasketsData} />;
    case "category-spend":
      return <CategorySpendCard data={part.data as CategorySpendData} />;
    case "what-if":
      return <WhatIfCard data={part.data as WhatIfData} />;
    case "benchmark":
      return <BenchmarkCard data={part.data as BenchmarkData} />;
    case "transactions":
      return <TransactionsCard data={part.data as TransactionsData} />;
    case "multi-bank":
      return <MultiBankCard data={part.data as MultiBankData} api={api} onChanged={onAccountsChanged} />;
    default:
      return null;
  }
}

export default function MessageBubble({
  message,
  api,
  onAccountsChanged,
}: {
  message: ChatMessage;
  api: CoachApi;
  onAccountsChanged: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`pop-in flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? "max-w-[85%]" : "flex w-full max-w-full flex-col"}>
        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[15px] leading-snug text-white shadow-sm">
            {message.parts.map((p, i) => (
              <span key={i}>{p.type === "text" ? renderText(p.text) : null}</span>
            ))}
          </div>
        ) : (
          message.parts.map((p, i) => (
            <PartView key={i} part={p} api={api} onAccountsChanged={onAccountsChanged} />
          ))
        )}
        {message.ts > 0 && (
          <div className={`mt-1 text-[10px] ${isUser ? "text-right text-ink/40" : "text-ink/40"}`}>
            {timeStr(message.ts)}
          </div>
        )}
      </div>
    </div>
  );
}
