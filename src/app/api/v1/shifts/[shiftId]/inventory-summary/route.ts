import { NextResponse } from "next/server";

import { getShiftInventorySummaryByShiftId } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

type Params = {
  params: Promise<{
    shiftId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนดูสรุปสินค้าในกะ",
      },
      { status: 401 },
    );
  }

  const { shiftId } = await params;

  try {
    const rows = await getShiftInventorySummaryByShiftId(
      session.user_id,
      session.role,
      shiftId,
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "SHIFT_NOT_FOUND",
          message: "ไม่พบกะที่ระบุ",
        },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "SHIFT_OWNER_MISMATCH") {
      return NextResponse.json(
        {
          code: "SHIFT_OWNER_MISMATCH",
          message: "ไม่มีสิทธิ์เข้าถึงสรุปสินค้าในกะนี้",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถดึงสรุปสินค้าในกะได้",
      },
      { status: 500 },
    );
  }
}
