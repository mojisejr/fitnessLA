import { NextResponse } from "next/server";

import { checkOutForSession } from "@/features/staff/services";
import { resolveSessionFromRequest } from "@/lib/session";

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนลงชื่อออกงาน",
      },
      { status: 401 },
    );
  }

  try {
    const attendance = await checkOutForSession(session);
    return NextResponse.json({ attendance }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ATTENDANCE_ROLE_NOT_ALLOWED") {
        return NextResponse.json(
          {
            code: "FORBIDDEN",
            message: "เฉพาะ admin และ cashier เท่านั้นที่ลงชื่อออกงานได้",
          },
          { status: 403 },
        );
      }

      if (error.message === "SHIFT_STILL_OPEN") {
        return NextResponse.json(
          {
            code: "SHIFT_STILL_OPEN",
            message: "ต้องปิดกะก่อนจึงจะลงชื่อออกงานได้",
          },
          { status: 409 },
        );
      }

      if (error.message === "ATTENDANCE_NOT_CHECKED_IN") {
        return NextResponse.json(
          {
            code: "ATTENDANCE_NOT_CHECKED_IN",
            message: "วันนี้ยังไม่ได้ลงชื่อเข้างาน",
          },
          { status: 409 },
        );
      }

      if (error.message === "ATTENDANCE_ALREADY_CHECKED_OUT") {
        return NextResponse.json(
          {
            code: "ATTENDANCE_ALREADY_CHECKED_OUT",
            message: "วันนี้ลงชื่อออกงานแล้ว",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถลงชื่อออกงานได้",
      },
      { status: 500 },
    );
  }
}