"use client";

const CHIPS = [
  "How much did I spend on taxis last month?",
  "What kind of spender am I?",
  "What is safe for me to spend this week?",
  "How much could I save if I cut dining out by 20%?",
  "Compare me to similar people",
  "Show all my accounts (Nordea & OP)",
];

export default function SuggestionChips({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="chat-scroll flex gap-2 overflow-x-auto px-3 py-2">
      {CHIPS.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c)}
          className="shrink-0 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-ink/80 shadow-sm ring-1 ring-black/5 transition enabled:hover:bg-brand-50 enabled:hover:text-brand-700 disabled:opacity-50"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
