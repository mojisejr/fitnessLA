import { NextResponse } from "next/server";

import { checkInForSession } from "@/features/staff/services";
import { resolveSessionFromRequest } from "@/lib/session";

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนลงชื่อเข้างาน",
      },
      { status: 401 },
    );
  }

  try {
    const attendance = await checkInForSession(session, request);
    return NextResponse.json(
      {
        attendance,
        warning:
          attendance.arrival_status === "LATE"
            ? {
                code: "LATE_ATTENDANCE",
                message: `มาสาย ${attendance.late_minutes} นาที`,
              }
            : null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ATTENDANCE_ROLE_NOT_ALLOWED") {
        return NextResponse.json(
          {
            code: "FORBIDDEN",
            message: "เฉพาะ admin และ cashier เท่านั้นที่ลงชื่อเข้างานได้",
          },
          { status: 403 },
        );
      }

      if (error.message === "ATTENDANCE_DEVICE_NOT_ALLOWED") {
        return NextResponse.json(
          {
            code: "ATTENDANCE_DEVICE_NOT_ALLOWED",
            message: "เครื่องนี้ยังไม่ได้รับอนุญาตจาก owner สำหรับการเข้างาน",
          },
          { status: 403 },
        );
      }

      if (error.message === "ATTENDANCE_ALREADY_CHECKED_IN") {
        return NextResponse.json(
          {
            code: "ATTENDANCE_ALREADY_CHECKED_IN",
            message: "วันนี้ลงชื่อเข้างานแล้ว",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถลงชื่อเข้างานได้",
      },
      { status: 500 },
    );
  }
}