import { NextResponse } from "next/server";
import { z } from "zod";

import { createTrainer, listTrainers } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const createTrainerSchema = z.object({
  full_name: z.string().trim().min(1),
  nickname: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
});

export async function GET(request: Request) {
  try {
    const session = await resolveSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนเข้าถึงข้อมูลเทรนเนอร์" },
        { status: 401 },
      );
    }

    const trainers = await listTrainers();
    return NextResponse.json(trainers, { status: 200 });
  } catch (error) {
    console.error("GET /api/v1/trainers failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถโหลดข้อมูลเทรนเนอร์ได้" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนเพิ่มเทรนเนอร์" },
      { status: 401 },
    );
  }

  if (!canManageTrainers(session.role)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับเพิ่มเทรนเนอร์" },
      { status: 403 },
    );
  }

  const parseResult = createTrainerSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ข้อมูลเทรนเนอร์ไม่ถูกต้อง", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const trainer = await createTrainer(parseResult.data);
    return NextResponse.json(trainer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINER_NAME_REQUIRED") {
      return NextResponse.json(
        { code: "TRAINER_NAME_REQUIRED", message: "กรุณาระบุชื่อเทรนเนอร์" },
        { status: 400 },
      );
    }

    console.error("POST /api/v1/trainers failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถเพิ่มเทรนเนอร์ได้" },
      { status: 500 },
    );
  }
}
