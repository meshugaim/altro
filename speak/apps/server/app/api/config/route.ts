import { NextResponse } from "next/server";
import { getConfig } from "@/lib/personaplex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getConfig());
}
