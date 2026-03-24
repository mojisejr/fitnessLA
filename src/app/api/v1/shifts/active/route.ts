import { NextResponse } from "next/server";

import { getActiveShiftByStaff } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนตรวจสอบกะ",
      },
      { status: 401 },
    );
  }

  const activeShift = await getActiveShiftByStaff(session.user_id);
  if (!activeShift) {
    return NextResponse.json(
      {
        code: "SHIFT_NOT_FOUND",
        message: "ยังไม่มีกะเปิดในระบบ",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(activeShift, { status: 200 });
}
