import { NextResponse } from "next/server";

import { listProducts } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

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

  const products = await listProducts();
  return NextResponse.json(products, { status: 200 });
}
