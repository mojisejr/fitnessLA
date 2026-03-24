import { NextResponse } from "next/server";

import { toggleTrainerActive } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    trainerId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนปรับสถานะเทรนเนอร์",
      },
      { status: 401 },
    );
  }

  if (!canManageTrainers(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับปรับสถานะเทรนเนอร์",
      },
      { status: 403 },
    );
  }

  const { trainerId } = await context.params;
  if (!trainerId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสเทรนเนอร์ที่ต้องการปรับสถานะ",
      },
      { status: 400 },
    );
  }

  try {
    const trainer = await toggleTrainerActive(trainerId);
    return NextResponse.json(trainer, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "TRAINER_NOT_FOUND",
          message: "ไม่พบเทรนเนอร์ที่ต้องการปรับสถานะ",
        },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "TRAINER_HAS_ACTIVE_ASSIGNMENTS") {
      return NextResponse.json(
        {
          code: "TRAINER_HAS_ACTIVE_ASSIGNMENTS",
          message: "ยังมีลูกเทรนที่ใช้งานอยู่ จึงยังปิดใช้งานเทรนเนอร์ไม่ได้",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถปรับสถานะเทรนเนอร์ได้",
      },
      { status: 500 },
    );
  }
}