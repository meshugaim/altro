import { NextRequest, NextResponse } from "next/server";
import { synthesize } from "@/lib/nvidia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text, voice, language } = (await req.json()) as {
      text?: string;
      voice?: string;
      language?: string;
    };
    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    const audio = await synthesize(text, voice, language);
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
