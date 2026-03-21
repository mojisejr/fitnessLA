import { NextResponse } from "next/server";

import { restartMember } from "@/features/operations/services";
import { canManageMembers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนเริ่มรอบสมาชิกใหม่",
      },
      { status: 401 },
    );
  }

  if (!canManageMembers(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับเริ่มรอบสมาชิกใหม่",
      },
      { status: 403 },
    );
  }

  const { memberId } = await context.params;
  if (!memberId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสสมาชิกที่ต้องการเริ่มรอบใหม่",
      },
      { status: 400 },
    );
  }

  try {
    const member = await restartMember(memberId);
    return NextResponse.json(member, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "MEMBER_NOT_FOUND",
          message: "ไม่พบสมาชิกที่ต้องการเริ่มรอบใหม่",
        },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "MEMBER_INACTIVE") {
      return NextResponse.json(
        {
          code: "MEMBER_INACTIVE",
          message: "สมาชิกที่ปิดใช้งานไม่สามารถเริ่มรอบใหม่ได้",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถเริ่มรอบสมาชิกใหม่ได้",
      },
      { status: 500 },
    );
  }
}