import { NextResponse } from "next/server";
import { z } from "zod";

import { addProductStockAdjustment, listProductStockAdjustments } from "@/features/operations/services";
import { canManageProducts, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const createStockAdjustmentSchema = z.object({
  product_id: z.string().trim().min(1),
  added_quantity: z.number().int().positive(),
  note: z.string().trim().max(240).nullable().optional(),
});

function authError(message: string, status: 401 | 403) {
  return NextResponse.json(
    { code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", message },
    { status },
  );
}

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return authError("ต้องยืนยันตัวตนก่อนดูประวัติการเติมสินค้า", 401);
  }

  if (!canManageProducts(requesterRole)) {
    return authError("สิทธิ์ไม่เพียงพอสำหรับการดูประวัติการเติมสินค้า", 403);
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("product_id")?.trim() || undefined;

  try {
    const adjustments = await listProductStockAdjustments(productId);
    return NextResponse.json(adjustments, { status: 200 });
  } catch (error) {
    console.error("GET /api/v1/products/stock-adjustments failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถโหลดประวัติการเติมสินค้าได้" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!session || !requesterRole) {
    return authError("ต้องยืนยันตัวตนก่อนเติมสินค้า", 401);
  }

  if (!canManageProducts(requesterRole)) {
    return authError("สิทธิ์ไม่เพียงพอสำหรับการเติมสินค้า", 403);
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "ข้อมูลการเติมสินค้าไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const parseResult = createStockAdjustmentSchema.safeParse(requestBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลการเติมสินค้าไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const created = await addProductStockAdjustment(session.user_id, session.full_name, parseResult.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { code: "PRODUCT_NOT_FOUND", message: "ไม่พบสินค้าที่ต้องการเติมสต็อก" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "PRODUCT_STOCK_NOT_TRACKED") {
      return NextResponse.json(
        { code: "PRODUCT_STOCK_NOT_TRACKED", message: "สินค้านี้ไม่ได้ติดตาม stock จึงเติมสต็อกไม่ได้" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_STOCK_ADDITION") {
      return NextResponse.json(
        { code: "INVALID_STOCK_ADDITION", message: "จำนวนที่เติมต้องมากกว่า 0" },
        { status: 400 },
      );
    }

    console.error("POST /api/v1/products/stock-adjustments failed", error);
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถบันทึกการเติมสินค้าได้" },
      { status: 500 },
    );
  }
}