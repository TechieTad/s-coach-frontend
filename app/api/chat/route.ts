import { NextRequest, NextResponse } from "next/server";
import { CoachEngine } from "@/lib/engine";

export const dynamic = "force-dynamic";

// Server-side instance of the same deterministic engine the client uses locally.
// In the full MVP this route is replaced by FastAPI + LLM router; the response
// shape ({ parts: ChatPart[] }) stays identical, so the UI does not change.
const engine = new CoachEngine();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message : "";
    return NextResponse.json({ parts: engine.answer(message) });
  } catch {
    return NextResponse.json(
      { parts: [{ type: "text", text: "Something went wrong parsing that." }] },
      { status: 400 },
    );
  }
}
