import { NextResponse } from "next/server";

import { listRegisteredTrainerUsers } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนดูรายชื่อผู้ใช้เทรนเนอร์" },
      { status: 401 },
    );
  }

  if (!canManageTrainers(session.role)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับดูรายชื่อผู้ใช้เทรนเนอร์" },
      { status: 403 },
    );
  }

  try {
    const users = await listRegisteredTrainerUsers();
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("GET /api/v1/trainers/registered-users failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถโหลดรายชื่อผู้ใช้เทรนเนอร์ได้" },
      { status: 500 },
    );
  }
}