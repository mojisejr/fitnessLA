import { NextResponse } from "next/server";
import { z } from "zod";

import { closeActiveShiftWithDifference } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const closeShiftSchema = z.object({
  actual_cash: z.number().min(0),
  closing_note: z.string().max(300).optional(),
  responsible_name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนปิดกะ",
      },
      { status: 401 },
    );
  }

  const parseResult = closeShiftSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลปิดกะไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const providedName = parseResult.data.responsible_name;
  if (providedName && providedName !== session.full_name) {
    return NextResponse.json(
      {
        code: "RESPONSIBLE_NAME_MISMATCH",
        message: "Responsible name does not match logged-in user",
        details: { expected: session.full_name, received: providedName },
      },
      { status: 409 },
    );
  }

  try {
    const result = await closeActiveShiftWithDifference(session.user_id, {
      ...parseResult.data,
      responsible_name: session.full_name,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SHIFT_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "SHIFT_NOT_FOUND",
            message: "ไม่พบกะเปิดในระบบ",
          },
          { status: 404 },
        );
      }

      if (error.message === "INVALID_ACTUAL_CASH") {
        return NextResponse.json(
          {
            code: "INVALID_ACTUAL_CASH",
            message: "ยอดเงินสดที่นับได้ต้องไม่ติดลบ",
          },
          { status: 400 },
        );
      }

      if (error.message === "CHART_OF_ACCOUNT_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "CHART_OF_ACCOUNT_NOT_FOUND",
            message: "ไม่พบบัญชีที่จำเป็นสำหรับบันทึกส่วนต่าง",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถปิดกะได้",
      },
      { status: 500 },
    );
  }
}
