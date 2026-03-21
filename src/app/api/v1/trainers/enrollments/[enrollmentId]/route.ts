import { NextResponse } from "next/server";
import { z } from "zod";

import { updateTrainingEnrollment } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const updateTrainingEnrollmentSchema = z.object({
  sessions_remaining: z.number().int().min(0).nullable().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "UNASSIGNED", "CLOSED"]).optional(),
  close_reason: z.string().trim().nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    enrollmentId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนแก้ไขลูกเทรน" },
      { status: 401 },
    );
  }

  if (!canManageTrainers(session.role)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับแก้ไขลูกเทรน" },
      { status: 403 },
    );
  }

  const { enrollmentId } = await context.params;
  if (!enrollmentId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ไม่พบรายการลูกเทรนที่ต้องการแก้ไข" },
      { status: 400 },
    );
  }

  const parseResult = updateTrainingEnrollmentSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ข้อมูลการแก้ไขลูกเทรนไม่ถูกต้อง", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updateTrainingEnrollment(enrollmentId, parseResult.data);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINING_ENROLLMENT_NOT_FOUND") {
      return NextResponse.json(
        { code: "TRAINING_ENROLLMENT_NOT_FOUND", message: "ไม่พบรายการลูกเทรนที่ต้องการแก้ไข" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_SESSIONS_REMAINING") {
      return NextResponse.json(
        { code: "INVALID_SESSIONS_REMAINING", message: "จำนวนครั้งคงเหลือไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    console.error("PATCH /api/v1/trainers/enrollments failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถแก้ไขข้อมูลลูกเทรนได้" },
      { status: 500 },
    );
  }
}