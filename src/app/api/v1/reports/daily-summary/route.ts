import { NextResponse } from "next/server";

import { getDailySummaryByDate } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

function isValidDateInput(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const VALID_PERIODS = ["DAY", "WEEK", "MONTH", "CUSTOM"] as const;

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
        message: "ไม่มีสิทธิ์เข้าถึงรายงานรายวัน",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "DAY";
  const date = searchParams.get("date");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "period ต้องเป็น DAY, WEEK, MONTH หรือ CUSTOM" },
      { status: 400 },
    );
  }

  if (period === "CUSTOM") {
    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "CUSTOM ต้องระบุ start_date และ end_date เป็น YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "start_date ต้องไม่เกิน end_date" },
        { status: 400 },
      );
    }
  } else {
    if (!isValidDateInput(date)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD" },
        { status: 400 },
      );
    }
  }

  try {
    const query =
      period === "CUSTOM"
        ? { period: period as "CUSTOM", start_date: startDate!, end_date: endDate! }
        : { period: period as "DAY" | "WEEK" | "MONTH", date: date! };

    const result = await getDailySummaryByDate(query);
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
        message: "ไม่สามารถดึงรายงานรายวันได้",
      },
      { status: 500 },
    );
  }
}
