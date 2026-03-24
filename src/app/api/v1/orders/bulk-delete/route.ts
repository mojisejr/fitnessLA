import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteOrderSales } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const bulkDeleteOrdersSchema = z.object({
  order_ids: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนลบบิลขาย",
      },
      { status: 401 },
    );
  }

  if (session.role !== "OWNER") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับการลบบิลขาย",
      },
      { status: 403 },
    );
  }

  const parseResult = bulkDeleteOrdersSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลการลบบิลไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteOrderSales(parseResult.data.order_ids);
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_IDS_REQUIRED") {
      return NextResponse.json(
        {
          code: "ORDER_IDS_REQUIRED",
          message: "ต้องเลือกรายการขายอย่างน้อย 1 บิล",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "ORDER_NOT_FOUND",
          message: "ไม่พบบิลขายที่ต้องการลบบางรายการ",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถลบบิลขายได้",
      },
      { status: 500 },
    );
  }
}
