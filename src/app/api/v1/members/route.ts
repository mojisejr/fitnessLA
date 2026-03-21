import { NextResponse } from "next/server";

import { listMembers } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

async function listMembersWithRetry() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await listMembers();
    } catch (error) {
      lastError = error;

      if (attempt === 2) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw lastError;
}

export async function GET(request: Request) {
  try {
    const session = await resolveSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "ต้องยืนยันตัวตนก่อนเข้าถึงข้อมูลสมาชิก" },
        { status: 401 },
      );
    }

    const members = await listMembersWithRetry();
    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error("GET /api/v1/members failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
        ...(process.env.NODE_ENV !== "production"
          ? {
              details: {
                debug_message: error instanceof Error ? error.message : String(error),
              },
            }
          : {}),
      },
      { status: 500 },
    );
  }
}
