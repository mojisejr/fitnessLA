import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteOrderSale, updateOrderSale } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const updateOrderSaleSchema = z.object({
  items: z
    .array(
      z.object({
        order_item_id: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
      }),
    )
    .min(1),
});

type Params = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนแก้ไขรายการขาย",
      },
      { status: 401 },
    );
  }

  if (session.role !== "OWNER") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับการแก้ไขรายการขาย",
      },
      { status: 403 },
    );
  }

  const parseResult = updateOrderSaleSchema.safeParse(await request.json());
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

  const { orderId } = await params;

  try {
    const updated = await updateOrderSale({
      order_id: orderId,
      ...parseResult.data,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "ORDER_NOT_FOUND",
          message: "ไม่พบบิลขายที่ต้องการแก้ไข",
        },
        { status: 404 },
      );
    }

    if (error instanceof Error && (error.message === "INVALID_ORDER_ITEMS_SUMMARY" || error.message === "INVALID_ORDER_TOTAL")) {
      return NextResponse.json(
        {
          code: error.message,
          message: error.message === "INVALID_ORDER_TOTAL" ? "ข้อมูลจำนวนหรือราคาต่อหน่วยไม่ถูกต้อง" : "กรุณาระบุรายการที่ขาย",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถแก้ไขรายการขายได้",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
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

  const { orderId } = await params;

  try {
    const deleted = await deleteOrderSale(orderId);
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "ORDER_NOT_FOUND",
          message: "ไม่พบบิลขายที่ต้องการลบ",
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