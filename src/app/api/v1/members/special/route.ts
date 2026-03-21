import { NextResponse } from "next/server";
import { z } from "zod";

import { createSpecialMember } from "@/features/operations/services";
import { canManageMembers, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const createSpecialMemberSchema = z.object({
  full_name: z.string().trim().min(1, "ต้องระบุชื่อสมาชิก"),
  phone: z.string().trim().optional(),
  membership_name: z.string().trim().min(1, "ต้องระบุชื่อแพ็กเกจ"),
  membership_period: z.enum(["DAILY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "YEARLY"]),
  started_at: z.string().min(1, "ต้องระบุวันเริ่มต้น"),
  expires_at: z.string().min(1, "ต้องระบุวันหมดอายุ"),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนเพิ่มสมาชิกพิเศษ" },
      { status: 401 },
    );
  }

  if (!canManageMembers(requesterRole)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับการเพิ่มสมาชิกพิเศษ" },
      { status: 403 },
    );
  }

  const parseResult = createSpecialMemberSchema.safeParse(await request.json());
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
    const member = await createSpecialMember(parseResult.data);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NAME_REQUIRED") {
      return NextResponse.json(
        { code: "MEMBER_NAME_REQUIRED", message: "ต้องระบุชื่อสมาชิก" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json(
        { code: "INVALID_DATE", message: "รูปแบบวันที่ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "EXPIRES_BEFORE_START") {
      return NextResponse.json(
        { code: "EXPIRES_BEFORE_START", message: "วันหมดอายุต้องมาหลังวันเริ่มต้น" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถเพิ่มสมาชิกพิเศษได้" },
      { status: 500 },
    );
  }
}
