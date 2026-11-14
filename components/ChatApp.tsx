"use client";

import { useMemo, useRef, useState } from "react";
import { createCoachApi, type CoachApi } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import SuggestionChips from "./SuggestionChips";

let nextId = 1;

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  ts: 0,
  parts: [
    {
      type: "text",
      text: "Hei! I'm **S-Coach** 👋 your personal economic trainer.\nI can see your own (synthetic demo) transaction data and answer questions about it — try the chips below, or ask in your own words.",
    },
  ],
};

export default function ChatApp() {
  const api = useMemo<CoachApi>(() => createCoachApi(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [, setTick] = useState(0); // re-render after multi-bank account toggles
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
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
    // simulate the LLM round-trip latency of the real backend
    window.setTimeout(() => {
      const parts = api.answer(text);
      setMessages((m) => [...m, { id: `m${nextId++}`, role: "assistant", ts: Date.now(), parts }]);
      setTyping(false);
      scrollToBottom();
    }, 450 + Math.min(600, text.length * 8));
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-sm">
          S
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-ink">S-Coach</div>
          <div className="text-xs text-ink/50">personal economic trainer · demo data</div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
          online
        </span>
      </header>

      {/* messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex w-full max-w-phone flex-col gap-3">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              api={api}
              onAccountsChanged={() => setTick((t) => t + 1)}
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
    </div>
  );
}
