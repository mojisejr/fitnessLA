import { NextResponse } from "next/server";

import { getAttendanceStatusForSession } from "@/features/staff/services";
import { resolveSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนตรวจสอบเวลางาน",
      },
      { status: 401 },
    );
  }

  const status = await getAttendanceStatusForSession(session, request);
  return NextResponse.json(status, { status: 200 });
}