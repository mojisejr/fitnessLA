import { NextResponse } from "next/server";
import { z } from "zod";

import { getProductRecipe, replaceProductRecipe } from "@/features/operations/services";
import { canManageProducts, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const recipeSchema = z.object({
  items: z.array(z.object({ ingredient_id: z.string().trim().min(1), quantity: z.number().positive() })),
});

type Params = {
  params: Promise<{ productId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนเข้าถึงสูตรสินค้า" }, { status: 401 });
  }

  const { productId } = await params;

  try {
    const recipe = await getProductRecipe(productId);
    return NextResponse.json(recipe, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ code: "PRODUCT_NOT_FOUND", message: "ไม่พบสินค้าที่ต้องการดูสูตร" }, { status: 404 });
    }

    return NextResponse.json({ code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถโหลดสูตรสินค้าได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนแก้ไขสูตรสินค้า" }, { status: 401 });
  }

  if (!canManageProducts(requesterRole)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับการแก้ไขสูตรสินค้า" }, { status: 403 });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "ข้อมูลสูตรสินค้าไม่ถูกต้อง" }, { status: 400 });
  }

  const parseResult = recipeSchema.safeParse(requestBody);
  if (!parseResult.success) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "ข้อมูลสูตรสินค้าไม่ถูกต้อง", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { productId } = await params;

  try {
    const recipe = await replaceProductRecipe({ product_id: productId, ...parseResult.data });
    return NextResponse.json(recipe, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ code: "PRODUCT_NOT_FOUND", message: "ไม่พบสินค้าที่ต้องการแก้ไขสูตร" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "INGREDIENT_NOT_FOUND") {
      return NextResponse.json({ code: "INGREDIENT_NOT_FOUND", message: "มีวัตถุดิบบางรายการไม่อยู่ในระบบหรือถูกปิดใช้งาน" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_RECIPE_QUANTITY") {
      return NextResponse.json({ code: "INVALID_RECIPE_QUANTITY", message: "ปริมาณวัตถุดิบในสูตรต้องมากกว่า 0" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "DUPLICATE_RECIPE_INGREDIENT") {
      return NextResponse.json({ code: "DUPLICATE_RECIPE_INGREDIENT", message: "วัตถุดิบในสูตรซ้ำกัน กรุณารวมให้อยู่บรรทัดเดียว" }, { status: 400 });
    }

    return NextResponse.json({ code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถบันทึกสูตรสินค้าได้" }, { status: 500 });
  }
}