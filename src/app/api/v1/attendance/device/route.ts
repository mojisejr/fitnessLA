import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ATTENDANCE_DEVICE_COOKIE,
  ATTENDANCE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/attendance-device";
import {
  getAttendanceDeviceStatus,
  registerAttendanceDevice,
} from "@/features/staff/services";
import { resolveSessionFromRequest } from "@/lib/session";

const registerAttendanceDeviceSchema = z.object({
  label: z.string().trim().min(3).max(120).optional(),
});

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนตรวจสอบเครื่องลงเวลา",
      },
      { status: 401 },
    );
  }

  const status = await getAttendanceDeviceStatus(request);
  return NextResponse.json(status, { status: 200 });
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนอนุมัติเครื่องลงเวลา",
      },
      { status: 401 },
    );
  }

  const parseResult = registerAttendanceDeviceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลชื่อเครื่องไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await registerAttendanceDevice(session, request, parseResult.data.label);
    const response = NextResponse.json({ device: result.device }, { status: 201 });
    response.cookies.set({
      name: ATTENDANCE_DEVICE_COOKIE,
      value: result.rawToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ATTENDANCE_DEVICE_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "ATTENDANCE_DEVICE_FORBIDDEN") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "เฉพาะ owner เท่านั้นที่อนุมัติเครื่องลงเวลาได้",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถอนุมัติเครื่องลงเวลาได้",
      },
      { status: 500 },
    );
  }
}