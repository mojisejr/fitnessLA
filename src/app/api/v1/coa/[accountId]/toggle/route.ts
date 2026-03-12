import { NextResponse } from "next/server";

import { toggleChartOfAccount } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    accountId: string;
  }>;
};

function ensureAuthorizedRole(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนแก้ไขสถานะผังบัญชี",
      },
      { status: 401 },
    );
  }

  if (!ensureAuthorizedRole(session.role)) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "ไม่มีสิทธิ์แก้ไขสถานะผังบัญชี",
      },
      { status: 403 },
    );
  }

  const { accountId } = await context.params;
  if (!accountId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสบัญชีที่ต้องการแก้ไข",
      },
      { status: 400 },
    );
  }

  try {
    const updated = await toggleChartOfAccount(accountId);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ACCOUNT_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "ACCOUNT_NOT_FOUND",
            message: "ไม่พบบัญชีที่ระบุ",
          },
          { status: 404 },
        );
      }

      if (error.message === "ACCOUNT_LOCKED") {
        return NextResponse.json(
          {
            code: "ACCOUNT_LOCKED",
            message: "บัญชีนี้ไม่สามารถปรับสถานะได้",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถปรับสถานะบัญชีได้",
      },
      { status: 500 },
    );
  }
}
