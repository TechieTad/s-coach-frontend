// CoachApi is the single seam between the UI and the "backend".
// Default: a local deterministic engine (works offline, perfect for a demo).
// To wire the real FastAPI + LLM-router backend later, replace chat() with:
//
//   const res = await fetch("/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ message }),
//   });
//   const data = await res.json();
//   return data.parts as ChatPart[];
//
// A demo route that runs the same engine server-side already exists at
// app/api/chat/route.ts, so `fetch("/api/chat", ...)` works out of the box.
import type { Account, ChatPart } from "./types.ts";
import { CoachEngine } from "./engine.ts";

export interface CoachApi {
  answer(message: string): ChatPart[];
  getAccounts(): Account[];
  toggleAccount(id: string): Account[];
}

export function createCoachApi(): CoachApi {
  const engine = new CoachEngine();
  return {
    answer: (m) => engine.answer(m),
    getAccounts: () => engine.getAccounts(),
    toggleAccount: (id) => engine.toggleAccount(id),
  };
}
