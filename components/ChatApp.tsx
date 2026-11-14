"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createCoachApi, type CoachApi } from "@/lib/api";
import type { ChatMessage, PartText, WireTurn } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import SuggestionChips from "./SuggestionChips";
import TaimiMascot, { type TaimiMood } from "./TaimiMascot";

let nextId = 1;

const STORAGE_KEY = "scoach.customer_id";
const DEMO_IDS = ["CUST00003", "CUST00007", "CUST00042", "CUST00123"];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  ts: 0,
  parts: [
    {
      type: "text",
      text: "Hei! I'm **S-Coach** 👋 your personal economic trainer (with **Taimi** 🌱).\nI can see your own (synthetic demo) transaction data and answer questions about it — try the chips below, click Taimi for a tip, or ask in your own words.",
    },
  ],
};

/** Accept "CUST00042", "00042" or "42" → "CUST00042"; reject anything outside the demo range. */
function normalizeCustomerId(raw: string): string | null {
  let s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d{1,5}$/.test(s)) s = "CUST" + s.padStart(5, "0");
  if (!/^CUST\d{5}$/.test(s)) return null;
  const n = parseInt(s.slice(4), 10);
  if (n < 1 || n > 5100) return null;
  return s;
}

function readSavedCustomer(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function ChatApp() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [, setTick] = useState(0); // re-render after multi-bank account toggles
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate the saved login after mount (avoids SSR/localStorage mismatch).
  useEffect(() => {
    setCustomerId(readSavedCustomer());
    setReady(true);
  }, []);

  // Sleep after 30s of no activity
  useEffect(() => {
    setIsSleeping(false);
    const idleTimer = window.setTimeout(() => setIsSleeping(true), 30000);
    return () => window.clearTimeout(idleTimer);
  }, [input, typing, isSpeaking, isHappy, messages.length]);

  // Trigger a brief happy celebration
  const triggerHappy = () => {
    setIsHappy(true);
    window.setTimeout(() => setIsHappy(false), 2400);
  };

  // Determine mascot mood automatically from chat lifecycle
  let mascotMood: TaimiMood = "idle";
  if (typing) mascotMood = "thinking";
  else if (isSpeaking) mascotMood = "speaking";
  else if (isHappy) mascotMood = "happy";
  else if (input.trim().length > 0) mascotMood = "listening";
  else if (isSleeping) mascotMood = "sleeping";

  const statusSubtitle = typing
    ? "Taimi pohtii vastausta..."
    : isSpeaking
    ? "Taimi vastaa..."
    : input.trim().length > 0
    ? "Taimi kuuntelee..."
    : isSleeping
    ? "Taimi torkkuu · klikkaa herättääksesi"
    : customerId
    ? `Paikalla auttamassa · ${customerId}`
    : "Paikalla auttamassa · demo data";

  // The chosen customer id drives both the local engine and remote requests.
  const api = useMemo<CoachApi>(() => createCoachApi(customerId ?? undefined), [customerId]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  const startFresh = (id: string | null) => {
    setCustomerId(id);
    setMessages([WELCOME]);
    setInput("");
    setTyping(false);
    setShowLogin(false);
  };

  const login = (id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable — still works for this session */
    }
    startFresh(id);
    triggerHappy();
  };

  const logout = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    startFresh(null);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    const userMsg: ChatMessage = {
      id: `m${nextId++}`,
      role: "user",
      ts: Date.now(),
      parts: [{ type: "text", text }],
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    scrollToBottom();
    // The real backend is stateless, so send the recent transcript along.
    const history: WireTurn[] = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as PartText).text)
          .join(" "),
      }));
    const started = Date.now();
    void (async () => {
      try {
        const parts = await api.answer(text, history);
        // keep the typing indicator visible for at least a beat (the local engine is instant)
        const elapsed = Date.now() - started;
        if (elapsed < 400) await new Promise((r) => window.setTimeout(r, 400 - elapsed));
        setMessages((m) => [...m, { id: `m${nextId++}`, role: "assistant", ts: Date.now(), parts }]);
        setIsSpeaking(true);
        window.setTimeout(() => setIsSpeaking(false), 1800);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: `m${nextId++}`,
            role: "assistant",
            ts: Date.now(),
            parts: [{ type: "text", text: "⚠️ Could not reach the coach backend — check NEXT_PUBLIC_API_URL." }],
          },
        ]);
      } finally {
        setTyping(false);
        scrollToBottom();
      }
    })();
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* header with Taimi mascot — docked outside the scroll area so it never hides messages */}
      <header className="relative z-10 flex items-center gap-3 border-b border-black/5 bg-white/95 px-4 py-2.5 backdrop-blur">
        <TaimiMascot mood={mascotMood} size={52} bubblePlacement="right" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-ink">S-Coach</span>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200/60">
              Taimi
            </span>
          </div>
          <div className="truncate text-xs text-ink/55">
            {statusSubtitle}
          </div>
        </div>
        {ready &&
          (customerId ? (
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
            >
              Log out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="shrink-0 rounded-full bg-brand-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Log in
            </button>
          ))}
      </header>

      {/* messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex w-full max-w-phone flex-col gap-3">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              api={api}
              onAccountsChanged={() => {
                setTick((t) => t + 1);
                triggerHappy();
              }}
            />
          ))}
          {typing && (
            <div className="pop-in self-start rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
              <span className="typing-dot mr-1 inline-block h-2 w-2 rounded-full bg-ink/40" />
              <span className="typing-dot mr-1 inline-block h-2 w-2 rounded-full bg-ink/40" />
              <span className="typing-dot inline-block h-2 w-2 rounded-full bg-ink/40" />
            </div>
          )}
        </div>
      </div>

      <SuggestionChips onPick={send} disabled={typing} />

      {/* composer */}
      <form
        className="border-t border-black/5 bg-white/95 px-3 py-2.5 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your money…"
            enterKeyHint="send"
            className="h-11 flex-1 rounded-full bg-[#f0f2f0] px-4 text-[15px] text-ink outline-none ring-brand-500 placeholder:text-ink/35 focus:ring-2"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition enabled:hover:bg-brand-700 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>
          </button>
        </div>
      </form>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} onLogin={login} />}
    </div>
  );
}
