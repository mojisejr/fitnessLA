import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteProducts } from "@/features/operations/services";
import { canDeleteProducts, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const bulkDeleteProductsSchema = z.object({
  product_ids: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนลบสินค้า",
      },
      { status: 401 },
    );
  }

  if (!canDeleteProducts(requesterRole)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "เฉพาะ owner เท่านั้นที่ลบสินค้าได้",
      },
      { status: 403 },
    );
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลสินค้าที่ต้องการลบไม่ถูกต้อง",
      },
      { status: 400 },
    );
  }

  const parseResult = bulkDeleteProductsSchema.safeParse(requestBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลสินค้าที่ต้องการลบไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteProducts(parseResult.data.product_ids);
    return NextResponse.json(deleted, { status: 200 });
  } catch (error) {
    console.error("POST /api/v1/products/bulk-delete failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถลบสินค้าที่เลือกได้",
      },
      { status: 500 },
    );
  }
}
