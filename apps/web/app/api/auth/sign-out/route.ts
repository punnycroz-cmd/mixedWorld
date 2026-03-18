import { NextResponse } from "next/server";

import { clearSessionUserOnResponse } from "@/lib/session";

export async function POST() {
  return clearSessionUserOnResponse(NextResponse.json({ ok: true }));
}
