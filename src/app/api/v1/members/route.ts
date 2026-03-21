import { NextResponse } from "next/server";

import { listMembers } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await resolveSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนเข้าถึงข้อมูลสมาชิก" },
        { status: 401 },
      );
    }

    const members = await listMembers();
    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error("GET /api/v1/members failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถโหลดข้อมูลสมาชิกได้" },
      { status: 500 },
    );
  }
}
