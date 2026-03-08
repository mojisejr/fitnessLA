import { NextResponse } from "next/server";
import { z } from "zod";

import { postExpenseWithJournal } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const createExpenseSchema = z.object({
  shift_id: z.string().min(1),
  account_id: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  receipt_url: z.string().url().optional(),
});

async function parseExpenseRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return createExpenseSchema.safeParse({
      shift_id: String(formData.get("shift_id") ?? ""),
      account_id: String(formData.get("account_id") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
      description: String(formData.get("description") ?? ""),
      receipt_url: formData.get("receipt_url") ? String(formData.get("receipt_url")) : undefined,
    });
  }

  return createExpenseSchema.safeParse(await request.json());
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนบันทึกรายจ่าย",
      },
      { status: 401 },
    );
  }

  const parseResult = await parseExpenseRequest(request);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลรายจ่ายไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await postExpenseWithJournal(session.user_id, parseResult.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SHIFT_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "SHIFT_NOT_FOUND",
            message: "ไม่พบกะที่ระบุ",
          },
          { status: 404 },
        );
      }

      if (error.message === "SHIFT_OWNER_MISMATCH" || error.message === "SHIFT_NOT_OPEN") {
        return NextResponse.json(
          {
            code: error.message,
            message: "ไม่สามารถบันทึกรายจ่ายในกะนี้ได้",
          },
          { status: 409 },
        );
      }

      if (error.message === "CHART_OF_ACCOUNT_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "CHART_OF_ACCOUNT_NOT_FOUND",
            message: "ไม่พบบัญชีสำหรับบันทึกรายจ่าย",
          },
          { status: 404 },
        );
      }

      if (
        error.message === "ACCOUNT_ID_REQUIRED" ||
        error.message === "EXPENSE_DESCRIPTION_REQUIRED" ||
        error.message === "INVALID_EXPENSE_AMOUNT"
      ) {
        return NextResponse.json(
          {
            code: error.message,
            message: "ข้อมูลรายจ่ายไม่ถูกต้อง",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถบันทึกรายจ่ายได้",
      },
      { status: 500 },
    );
  }
}
