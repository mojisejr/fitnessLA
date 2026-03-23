import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteTrainingEnrollment, updateTrainingEnrollment } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const trainingScheduleEntrySchema = z.object({
  day_of_week: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "เวลาเริ่มต้นไม่ถูกต้อง"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "เวลาสิ้นสุดไม่ถูกต้อง"),
  note: z.string().trim().max(120).nullable().optional(),
});

const updateTrainingEnrollmentSchema = z.object({
  sessions_remaining: z.number().int().min(0).nullable().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "UNASSIGNED", "CLOSED"]).optional(),
  close_reason: z.string().trim().nullable().optional(),
  schedule_entries: z.array(trainingScheduleEntrySchema).max(14).optional(),
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

  if (!canManageTrainers(session.role) && session.role !== "TRAINER") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับแก้ไขลูกเทรน" },
      { status: 403 },
    );
  }

  if (session.role === "TRAINER" && !session.trainer_id) {
    return NextResponse.json(
      { code: "TRAINER_PROFILE_REQUIRED", message: "บัญชีเทรนเนอร์นี้ยังไม่ได้ผูกกับโปรไฟล์เทรนเนอร์" },
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

  const normalizedInput = {
    ...parseResult.data,
    schedule_entries: parseResult.data.schedule_entries?.map((entry) => ({
      ...entry,
      note: entry.note ?? null,
    })),
  };

  try {
    const updated = await updateTrainingEnrollment(enrollmentId, normalizedInput, {
      actor_role: session.role,
      actor_trainer_id: session.trainer_id ? String(session.trainer_id) : null,
    });
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

    if (
      error instanceof Error &&
      (error.message === "INVALID_TRAINING_SCHEDULE" || error.message === "DUPLICATE_TRAINING_SCHEDULE_ENTRY")
    ) {
      return NextResponse.json(
        { code: error.message, message: "ข้อมูลสเกดูลไม่ถูกต้อง หรือมีรายการวันเวลาซ้ำ" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "TRAINER_PROFILE_REQUIRED") {
      return NextResponse.json(
        { code: "TRAINER_PROFILE_REQUIRED", message: "บัญชีเทรนเนอร์นี้ยังไม่ได้ผูกกับโปรไฟล์เทรนเนอร์" },
        { status: 403 },
      );
    }

    if (error instanceof Error && error.message === "TRAINER_CAN_ONLY_UPDATE_SCHEDULE") {
      return NextResponse.json(
        { code: "TRAINER_CAN_ONLY_UPDATE_SCHEDULE", message: "เทรนเนอร์แก้ไขได้เฉพาะสเกดูลของลูกเทรนตัวเอง" },
        { status: 403 },
      );
    }

    if (error instanceof Error && error.message === "TRAINER_CANNOT_EDIT_OTHER_ENROLLMENTS") {
      return NextResponse.json(
        { code: "TRAINER_CANNOT_EDIT_OTHER_ENROLLMENTS", message: "เทรนเนอร์แก้ไขสเกดูลได้เฉพาะลูกเทรนของตัวเอง" },
        { status: 403 },
      );
    }

    console.error("PATCH /api/v1/trainers/enrollments failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถแก้ไขข้อมูลลูกเทรนได้" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนลบลูกเทรน" },
      { status: 401 },
    );
  }

  if (!canManageTrainers(session.role)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับลบลูกเทรน" },
      { status: 403 },
    );
  }

  const { enrollmentId } = await context.params;
  if (!enrollmentId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ไม่พบรายการลูกเทรนที่ต้องการลบ" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteTrainingEnrollment(enrollmentId);
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINING_ENROLLMENT_NOT_FOUND") {
      return NextResponse.json(
        { code: "TRAINING_ENROLLMENT_NOT_FOUND", message: "ไม่พบรายการลูกเทรนที่ต้องการลบ" },
        { status: 404 },
      );
    }

    console.error("DELETE /api/v1/trainers/enrollments failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถลบข้อมูลลูกเทรนได้" },
      { status: 500 },
    );
  }
}