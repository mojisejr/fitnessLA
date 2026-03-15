import { NextResponse } from "next/server";

import { getShiftSummaryByDate } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

function isValidDateInput(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนดูรายงาน",
      },
      { status: 401 },
    );
  }

  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "ไม่มีสิทธิ์เข้าถึงสรุปกะ",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const responsibleName = searchParams.get("responsible_name")?.trim();

  if (!isValidDateInput(date)) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD",
      },
      { status: 400 },
    );
  }

  if (responsibleName !== undefined && responsibleName.length === 0) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "responsible_name ต้องไม่เป็นค่าว่าง",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getShiftSummaryByDate(date, responsibleName);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json(
        {
          code: "INVALID_DATE",
          message: "วันที่ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถดึงรายงานสรุปกะได้",
      },
      { status: 500 },
    );
  }
}
