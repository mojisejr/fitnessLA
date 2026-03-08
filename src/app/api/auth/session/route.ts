import { NextResponse } from "next/server";

import { resolveSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ไม่พบ session ผู้ใช้งาน",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(session, { status: 200 });
}
