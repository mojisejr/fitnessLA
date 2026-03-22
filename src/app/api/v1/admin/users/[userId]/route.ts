import { NextResponse } from "next/server";
import { z } from "zod";

import { updateManagedUserSettings } from "@/features/staff/services";
import { resolveSessionFromRequest } from "@/lib/session";

const updateManagedUserSchema = z.object({
  scheduled_start_time: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  scheduled_end_time: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  allowed_machine_ip: z.string().trim().min(3).max(64).nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนแก้ไขข้อมูลพนักงาน",
      },
      { status: 401 },
    );
  }

  if (session.role !== "OWNER") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับการแก้ไขข้อมูลพนักงาน",
      },
      { status: 403 },
    );
  }

  const parseResult = updateManagedUserSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลเวลางานหรือ IP ไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { userId } = await context.params;
  const updatedUser = await updateManagedUserSettings(userId, parseResult.data);
  return NextResponse.json(updatedUser, { status: 200 });
}