import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { updateIngredient } from "@/features/operations/services";
import { canManageProducts, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  );
}

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(160),
  unit: z.enum(["G", "ML", "PIECE"]),
  purchase_quantity: z.number().positive(),
  purchase_price: z.number().nonnegative(),
  notes: z.string().trim().max(240).nullable().optional(),
});

type Params = {
  params: Promise<{ ingredientId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนแก้ไขวัตถุดิบ" }, { status: 401 });
  }

  if (!canManageProducts(requesterRole)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "สิทธิ์ไม่เพียงพอสำหรับการแก้ไขวัตถุดิบ" }, { status: 403 });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "ข้อมูลวัตถุดิบไม่ถูกต้อง" }, { status: 400 });
  }

  const parseResult = ingredientSchema.safeParse(requestBody);
  if (!parseResult.success) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "ข้อมูลวัตถุดิบไม่ถูกต้อง", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { ingredientId } = await params;

  try {
    const ingredient = await updateIngredient({ ingredient_id: ingredientId, ...parseResult.data });
    return NextResponse.json(ingredient, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "INGREDIENT_NOT_FOUND") {
      return NextResponse.json({ code: "INGREDIENT_NOT_FOUND", message: "ไม่พบวัตถุดิบที่ต้องการแก้ไข" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "INVALID_INGREDIENT") {
      return NextResponse.json({ code: "INVALID_INGREDIENT", message: "กรุณาระบุชื่อวัตถุดิบ" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_INGREDIENT_UNIT") {
      return NextResponse.json({ code: "INVALID_INGREDIENT_UNIT", message: "หน่วยวัตถุดิบไม่ถูกต้อง" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_INGREDIENT_PRICE") {
      return NextResponse.json({ code: "INVALID_INGREDIENT_PRICE", message: "ราคาซื้อต้องเป็นศูนย์หรือมากกว่า" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVALID_INGREDIENT_QUANTITY") {
      return NextResponse.json({ code: "INVALID_INGREDIENT_QUANTITY", message: "ปริมาณที่ซื้อต้องมากกว่า 0" }, { status: 400 });
    }

    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ code: "DUPLICATE_INGREDIENT_NAME", message: "ชื่อวัตถุดิบนี้มีอยู่แล้ว" }, { status: 409 });
    }

    return NextResponse.json({ code: "INTERNAL_SERVER_ERROR", message: "ไม่สามารถแก้ไขวัตถุดิบได้" }, { status: 500 });
  }
}