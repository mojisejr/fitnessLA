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
        trainer_id: z.string().min(1).optional(),
        service_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
            message: "ไม่พบกะที่ระบุหรือกะนี้ไม่อยู่ในระบบแล้ว",
          },
          { status: 404 },
        );
      }

      if (error.message === "SHIFT_OWNER_MISMATCH") {
        return NextResponse.json(
          {
            code: "SHIFT_OWNER_MISMATCH",
            message: "กะที่เลือกไม่ใช่กะเปิดปัจจุบันของระบบ",
          },
          { status: 409 },
        );
      }

      if (error.message === "SHIFT_NOT_OPEN") {
        return NextResponse.json(
          {
            code: "SHIFT_NOT_OPEN",
            message: "กะนี้ถูกปิดไปแล้วหรือยังไม่ได้เปิดกะก่อนคิดเงิน",
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

      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          {
            code: "INSUFFICIENT_STOCK",
            message: "สต็อกสินค้าไม่พอสำหรับรายการที่เลือก",
          },
          { status: 409 },
        );
      }

      if (error.message === "MEMBERSHIP_CUSTOMER_REQUIRED" || error.message === "MEMBERSHIP_SINGLE_QUANTITY") {
        return NextResponse.json(
          {
            code: error.message,
            message:
              error.message === "MEMBERSHIP_CUSTOMER_REQUIRED"
                ? "บิลสมาชิกต้องระบุชื่อลูกค้าเพื่อสร้างข้อมูลสมาชิก"
                : "แพ็กเกจสมาชิกซื้อได้ครั้งละ 1 รายการเท่านั้น",
          },
          { status: 400 },
        );
      }

      if (error.message === "TRAINER_REQUIRED") {
        return NextResponse.json(
          { code: "TRAINER_REQUIRED", message: "สินค้า PT ต้องเลือกเทรนเนอร์" },
          { status: 400 },
        );
      }

      if (error.message === "TRAINER_NOT_FOUND") {
        return NextResponse.json(
          { code: "TRAINER_NOT_FOUND", message: "ไม่พบเทรนเนอร์ที่เลือกหรือไม่ active" },
          { status: 404 },
        );
      }

      if (error.message === "TRAINING_SINGLE_QUANTITY") {
        return NextResponse.json(
          { code: "TRAINING_SINGLE_QUANTITY", message: "แพ็กเกจ PT ซื้อได้ครั้งละ 1 รายการเท่านั้น" },
          { status: 400 },
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
