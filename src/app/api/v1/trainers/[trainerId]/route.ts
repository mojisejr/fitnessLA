import { NextResponse } from "next/server";

import { deleteTrainer } from "@/features/operations/services";
import { canManageTrainers } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    trainerId: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนลบเทรนเนอร์",
      },
      { status: 401 },
    );
  }

  if (!canManageTrainers(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับลบเทรนเนอร์",
      },
      { status: 403 },
    );
  }

  const { trainerId } = await context.params;
  if (!trainerId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสเทรนเนอร์ที่ต้องการลบ",
      },
      { status: 400 },
    );
  }

  try {
    const result = await deleteTrainer(trainerId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "TRAINER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "TRAINER_NOT_FOUND",
          message: "ไม่พบเทรนเนอร์ที่ต้องการลบ",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถลบเทรนเนอร์ได้",
      },
      { status: 500 },
    );
  }
}