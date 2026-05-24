import { NextRequest, NextResponse } from "next/server";
import { chat, ChatMessage } from "@/lib/nvidia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  process.env.SPEAK_SYSTEM_PROMPT ??
  "You are Speak, a concise spoken assistant. Reply in 1-3 short sentences suitable for text-to-speech. No markdown, no lists.";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; text?: string };
    let messages: ChatMessage[];
    if (body.messages && body.messages.length) {
      messages = body.messages;
    } else if (body.text) {
      messages = [{ role: "user", content: body.text }];
    } else {
      return NextResponse.json({ error: "messages or text required" }, { status: 400 });
    }

    if (messages[0]?.role !== "system") {
      messages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    }

    const text = await chat(messages);
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
