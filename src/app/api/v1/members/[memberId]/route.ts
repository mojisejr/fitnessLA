import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteMember, updateMemberDates } from "@/features/operations/services";
import { canManageMembers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

const updateMemberSchema = z.object({
  started_at: z.string().min(1, "ต้องระบุวันเริ่มต้น"),
  expires_at: z.string().min(1, "ต้องระบุวันหมดอายุ"),
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนแก้ไขข้อมูลสมาชิก",
      },
      { status: 401 },
    );
  }

  if (!canManageMembers(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับแก้ไขข้อมูลสมาชิก",
      },
      { status: 403 },
    );
  }

  const { memberId } = await context.params;
  if (!memberId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสสมาชิกที่ต้องการแก้ไข",
      },
      { status: 400 },
    );
  }

  const parseResult = updateMemberSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลสมาชิกไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const member = await updateMemberDates(memberId, parseResult.data);
    return NextResponse.json(member, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "MEMBER_NOT_FOUND",
          message: "ไม่พบสมาชิกที่ต้องการแก้ไข",
        },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json(
        {
          code: "INVALID_DATE",
          message: "รูปแบบวันที่ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "EXPIRES_BEFORE_START") {
      return NextResponse.json(
        {
          code: "EXPIRES_BEFORE_START",
          message: "วันหมดอายุต้องมาหลังวันเริ่มต้น",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถแก้ไขข้อมูลสมาชิกได้",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนลบสมาชิก",
      },
      { status: 401 },
    );
  }

  if (!canManageMembers(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับลบสมาชิก",
      },
      { status: 403 },
    );
  }

  const { memberId } = await context.params;
  if (!memberId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสสมาชิกที่ต้องการลบ",
      },
      { status: 400 },
    );
  }

  try {
    const result = await deleteMember(memberId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "MEMBER_NOT_FOUND",
          message: "ไม่พบสมาชิกที่ต้องการลบ",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถลบสมาชิกได้",
      },
      { status: 500 },
    );
  }
}