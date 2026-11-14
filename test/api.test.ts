// API-seam tests: local fallback, remote response mapper, unreachable-backend path.
// Run with: npm test  (node --test — Node >= 22.6 strips types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCoachApi, backendToParts } from "../lib/api.ts";
import type { BasketsData } from "../lib/types.ts";

test("local fallback answers without NEXT_PUBLIC_API_URL (offline demo)", async () => {
  delete process.env.NEXT_PUBLIC_API_URL;
  const api = createCoachApi();
  const parts = await api.answer("How much did I spend on taxis last month?");
  assert.ok(parts.length > 0);
  assert.ok(parts.some((p) => p.type === "text"));
});

test("backendToParts maps {reply, data_context, benchmark} onto chat parts", () => {
  const parts = backendToParts({
    reply: "Here is your split.",
    data_context: { "Mandatory Regular": 75546.35, "Mandatory Irregular": 11155.49, Everyday: 26631.53 },
    benchmark: "The user spends 0.7% LESS than their 5 closest demographic twins.",
  });
  assert.equal(parts[0].type, "text");
  assert.equal((parts[0] as { text: string }).text, "Here is your split.");

  const card = parts.find((p) => p.type === "card");
  assert.ok(card && card.type === "card" && card.card === "baskets");
  const data = card.data as BasketsData;
  const expected = 75546.35 + 11155.49 + 26631.53;
  assert.ok(Math.abs(data.total - expected) < 1e-6);
  const shareSum = data.slices.map((s) => s.share).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(shareSum - 1) < 1e-9);
  assert.deepEqual(
    data.slices.map((s) => s.color),
    ["#0b7a4b", "#d97706", "#e11d48"],
  );

  const bench = parts.find((p) => p.type === "text" && (p as { text: string }).text.includes("📊"));
  assert.ok(bench, "benchmark line is rendered as a text part");
});

test("remote mode degrades to a text notice when the backend is unreachable", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:9"; // discard port → connection refused
  try {
    const api = createCoachApi();
    const parts = await api.answer("hello");
    assert.equal(parts.length, 1);
    assert.equal(parts[0].type, "text");
    assert.match((parts[0] as { text: string }).text, /backend/i);
  } finally {
    delete process.env.NEXT_PUBLIC_API_URL;
  }
});
