// CoachApi is the single seam between the UI and the "backend".
//
// Two modes, chosen at runtime via the NEXT_PUBLIC_API_URL env var:
//
//   • REMOTE — when NEXT_PUBLIC_API_URL is set (e.g. http://127.0.0.1:8000 locally,
//     or https://<your-service>.onrender.com in production), answer() POSTs to
//     `${NEXT_PUBLIC_API_URL}/chat` using the real backend's contract:
//       request : { customer_id: string, message: string }
//       response: { reply: string,
//                   data_context: { "Mandatory Regular": number,
//                                   "Mandatory Irregular": number,
//                                   "Everyday": number },
//                   benchmark: string }
//     The backend is stateless, so the recent transcript is folded into `message`.
//   • LOCAL (default, works offline) — a deterministic in-process engine
//     (lib/engine.ts) answering from the synthetic demo dataset. Perfect for the
//     demo/jury when no backend is running.
import type { Account, Basket, BasketSlice, BasketsData, ChatPart, WireTurn } from "./types.ts";
import { CoachEngine } from "./engine.ts";
import { CUSTOMER } from "./mockData.ts";

export interface CoachApi {
  answer(message: string, history?: WireTurn[]): Promise<ChatPart[]>;
  getAccounts(): Account[];
  toggleAccount(id: string): Account[];
}

// ---- wire format of the FastAPI backend (POST /chat, see s-bank-coach main.py) ----

export interface ChatResponse {
  reply: string;
  data_context: Record<string, number>;
  benchmark: string;
}

const BASKET_KEYS: Record<string, { basket: Basket; label: string; color: string }> = {
  "Mandatory Regular": { basket: "mandatory_regular", label: "Mandatory & regular", color: "#0b7a4b" },
  "Mandatory Irregular": { basket: "mandatory_irregular", label: "Mandatory & irregular", color: "#d97706" },
  Everyday: { basket: "everyday", label: "Everyday slippage", color: "#e11d48" },
};

// Map the backend's { reply, data_context, benchmark } onto the chat parts the UI renders.
export function backendToParts(d: ChatResponse): ChatPart[] {
  const entries = Object.entries(d.data_context ?? {}).filter(([, v]) => typeof v === "number");
  const total = entries.reduce((s, [, v]) => s + (v as number), 0);
  const slices: BasketSlice[] = entries.map(([key, amount]) => {
    const meta = BASKET_KEYS[key] ?? { basket: "everyday" as Basket, label: key, color: "#64748b" };
    return { ...meta, amount, share: total > 0 ? amount / total : 0, top: [] };
  });
  const parts: ChatPart[] = [{ type: "text", text: d.reply ?? "" }];
  if (slices.length > 0) {
    const data: BasketsData = { periodLabel: "all time", total, slices };
    parts.push({ type: "card", card: "baskets", data });
  }
  if (d.benchmark) parts.push({ type: "text", text: `📊 ${d.benchmark}` });
  return parts;
}

function apiBase(): string | null {
  const v = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
  const t = v?.trim();
  return t ? t.replace(/\/+$/, "") : null;
}

export function createCoachApi(): CoachApi {
  const engine = new CoachEngine();
  const base = apiBase();

 const answerRemote = async (message: string, history?: WireTurn[]): Promise<ChatPart[]> => {
  // 1. Map the frontend history directly into the array the backend expects
  const conversationArray = (history ?? []).map((t) => ({
    role: t.role === "user" ? "user" : "assistant",
    content: t.content
  }));
  
  // 2. Append the user's newest message
  conversationArray.push({ role: "user", content: message });
  
  try {
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 3. Send the 'conversation' array instead of the 'message' string
      body: JSON.stringify({ 
        customer_id: CUSTOMER.customer_id, 
        conversation: conversationArray 
      }),
    });
    if (!res.ok) {
      const hint = res.status === 404 ? `unknown customer_id "${CUSTOMER.customer_id}"` : `HTTP ${res.status}`;
      return [{ type: "text", text: `⚠️ Coach backend answered with an error (${hint}) at ${base}.` }];
    }
    return backendToParts((await res.json()) as ChatResponse);
  } catch {
    return [
      {
        type: "text",
        text: `⚠️ Could not reach the coach backend at ${base} — check NEXT_PUBLIC_API_URL.`,
      },
    ];
  }
};



  return {
    answer: (m, h) => (base ? answerRemote(m, h) : Promise.resolve(engine.answer(m))),
    getAccounts: () => engine.getAccounts(),
    toggleAccount: (id) => engine.toggleAccount(id),
  };
}
