import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createProduct, listProducts } from "@/features/operations/services";
import { canManageUsers, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
  );
}

const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  price: z.number().nonnegative(),
  product_type: z.enum(["GOODS", "SERVICE", "MEMBERSHIP"]),
  revenue_account_id: z.string().trim().min(1).optional(),
  stock_on_hand: z.number().int().nonnegative().nullable().optional(),
  membership_period: z.enum(["DAILY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "YEARLY"]).nullable().optional(),
  membership_duration_days: z.number().int().positive().nullable().optional(),
});

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนเข้าถึงสินค้า",
      },
      { status: 401 },
    );
  }

  try {
    const products = await listProducts();
    return NextResponse.json(products, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถโหลดรายการสินค้าได้",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนสร้างสินค้า",
      },
      { status: 401 },
    );
  }

  if (!canManageUsers(requesterRole)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "สิทธิ์ไม่เพียงพอสำหรับการสร้างสินค้า",
      },
      { status: 403 },
    );
  }

  const parseResult = createProductSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลสินค้าไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const created = await createProduct(parseResult.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          code: "DUPLICATE_PRODUCT_SKU",
          message: "SKU นี้ถูกใช้งานแล้ว",
        },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === "REVENUE_ACCOUNT_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "REVENUE_ACCOUNT_NOT_FOUND",
          message: "ไม่พบบัญชีรายได้ที่ต้องการผูกกับสินค้า",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_REVENUE_ACCOUNT_TYPE") {
      return NextResponse.json(
        {
          code: "INVALID_REVENUE_ACCOUNT_TYPE",
          message: "บัญชีที่เลือกต้องเป็นหมวด REVENUE เท่านั้น",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "REVENUE_ACCOUNT_INACTIVE") {
      return NextResponse.json(
        {
          code: "REVENUE_ACCOUNT_INACTIVE",
          message: "บัญชีรายได้ที่เลือกถูกปิดใช้งานอยู่",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถสร้างสินค้าได้",
      },
      { status: 500 },
    );
  }
}
