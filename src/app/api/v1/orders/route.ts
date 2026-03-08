import { NextResponse } from "next/server";
import { z } from "zod";

import { createOrderWithJournal } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const createOrderSchema = z.object({
  shift_id: z.string().min(1),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  payment_method: z.enum(["CASH", "PROMPTPAY", "CREDIT_CARD"]),
  customer_info: z
    .object({
      name: z.string().min(1),
      tax_id: z.string().min(1).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนสร้างรายการขาย",
      },
      { status: 401 },
    );
  }

  const parseResult = createOrderSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลรายการขายไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await createOrderWithJournal(session.user_id, parseResult.data);
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
            message: "ไม่สามารถสร้างรายการขายในกะนี้ได้",
          },
          { status: 409 },
        );
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "PRODUCT_NOT_FOUND",
            message: "มีสินค้าที่ไม่พบหรือถูกปิดใช้งาน",
          },
          { status: 404 },
        );
      }

      if (error.message === "SIMULATED_JOURNAL_FAILURE") {
        return NextResponse.json(
          {
            code: "JOURNAL_POSTING_FAILED",
            message: "ระบบจำลองความล้มเหลวของการลงบัญชี",
          },
          { status: 500 },
        );
      }

      if (
        error.message === "ORDER_ITEMS_REQUIRED" ||
        error.message === "INVALID_ORDER_ITEM" ||
        error.message === "INVALID_PAYMENT_METHOD"
      ) {
        return NextResponse.json(
          {
            code: error.message,
            message: "ข้อมูลคำสั่งขายไม่ถูกต้อง",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถสร้างรายการขายได้",
      },
      { status: 500 },
    );
  }
}
