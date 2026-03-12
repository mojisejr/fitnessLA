import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createChartOfAccount, listChartOfAccounts } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const createChartOfAccountSchema = z.object({
  account_code: z.string().min(4),
  account_name: z.string().min(3),
  account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  description: z.string().max(300).optional(),
});

function ensureAuthorizedRole(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export async function GET(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนดูผังบัญชี",
      },
      { status: 401 },
    );
  }

  try {
    const accounts = await listChartOfAccounts();
    return NextResponse.json(accounts, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถโหลดผังบัญชีได้",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนสร้างผังบัญชี",
      },
      { status: 401 },
    );
  }

  if (!ensureAuthorizedRole(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "ไม่มีสิทธิ์สร้างผังบัญชี",
      },
      { status: 403 },
    );
  }

  const parseResult = createChartOfAccountSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลผังบัญชีไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const account = await createChartOfAccount(parseResult.data);
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_ACCOUNT_CODE" || error.message === "INVALID_ACCOUNT_NAME") {
        return NextResponse.json(
          {
            code: error.message,
            message: "ข้อมูลผังบัญชีไม่ถูกต้อง",
          },
          { status: 400 },
        );
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          code: "ACCOUNT_CODE_DUPLICATED",
          message: "รหัสบัญชีนี้ถูกใช้งานแล้ว",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถสร้างผังบัญชีได้",
      },
      { status: 500 },
    );
  }
}
