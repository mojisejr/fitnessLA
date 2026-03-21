import { NextResponse } from "next/server";

import { renewMember } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนต่ออายุสมาชิก",
      },
      { status: 401 },
    );
  }

  const { memberId } = await context.params;
  if (!memberId) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ไม่พบรหัสสมาชิกที่ต้องการต่ออายุ",
      },
      { status: 400 },
    );
  }

  try {
    const member = await renewMember(memberId);
    return NextResponse.json(member, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return NextResponse.json(
        {
          code: "MEMBER_NOT_FOUND",
          message: "ไม่พบสมาชิกที่ต้องการต่ออายุ",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "ไม่สามารถต่ออายุสมาชิกได้",
      },
      { status: 500 },
    );
  }
}