import { NextResponse } from "next/server";

import { getGeneralLedgerReport } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

function isValidDateInput(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function toCsv(rows: Awaited<ReturnType<typeof getGeneralLedgerReport>>): string {
  const header = ["Date", "Account Code", "Account Name", "Debit", "Credit", "Description"];
  const lines = rows.map((row) =>
    [
      row.date,
      row.account_code,
      row.account_name,
      row.debit.toFixed(2),
      row.credit.toFixed(2),
      row.description,
    ]
      .map(escapeCsv)
      .join(","),
  );

  return `${header.join(",")}\n${lines.join("\n")}`;
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
        message: "ไม่มีสิทธิ์เข้าถึงรายงาน GL",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD",
      },
      { status: 400 },
    );
  }

  try {
    const rows = await getGeneralLedgerReport(startDate, endDate);
    const csv = toCsv(rows);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="general-ledger-${startDate}-to-${endDate}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE_RANGE") {
      return NextResponse.json(
        {
          code: "INVALID_DATE_RANGE",
          message: "ช่วงวันที่ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถดึงรายงาน GL ได้",
      },
      { status: 500 },
    );
  }
}
