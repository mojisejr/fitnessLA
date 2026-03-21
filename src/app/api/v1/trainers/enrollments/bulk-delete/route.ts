import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteTrainingEnrollments } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const bulkDeleteTrainingEnrollmentsSchema = z.object({
  enrollment_ids: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(request: Request) {
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

  const parseResult = bulkDeleteTrainingEnrollmentsSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ข้อมูลการลบลูกเทรนไม่ถูกต้อง", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteTrainingEnrollments(parseResult.data.enrollment_ids);
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINING_ENROLLMENT_IDS_REQUIRED") {
      return NextResponse.json(
        { code: "TRAINING_ENROLLMENT_IDS_REQUIRED", message: "ต้องเลือกรายการลูกเทรนอย่างน้อย 1 รายการ" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "TRAINING_ENROLLMENT_NOT_FOUND") {
      return NextResponse.json(
        { code: "TRAINING_ENROLLMENT_NOT_FOUND", message: "ไม่พบรายการลูกเทรนที่ต้องการลบบางรายการ" },
        { status: 404 },
      );
    }

    console.error("POST /api/v1/trainers/enrollments/bulk-delete failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถลบข้อมูลลูกเทรนได้" },
      { status: 500 },
    );
  }
}
