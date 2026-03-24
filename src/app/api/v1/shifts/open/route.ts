import { NextResponse } from "next/server";
import { z } from "zod";

import { openShiftWithJournal } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const openShiftSchema = z.object({
  starting_cash: z.number().min(0),
  responsible_name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHENTICATED",
        message: "ต้องยืนยันตัวตนก่อนเปิดกะ",
      },
      { status: 401 },
    );
  }

  const parseResult = openShiftSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "starting_cash ไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const providedName = parseResult.data.responsible_name;
  if (providedName && providedName !== session.full_name) {
    return NextResponse.json(
      {
        code: "RESPONSIBLE_NAME_MISMATCH",
        message: "Responsible name does not match logged-in user",
        details: { expected: session.full_name, received: providedName },
      },
      { status: 409 },
    );
  }

  try {
    const result = await openShiftWithJournal(
      session.user_id,
      parseResult.data.starting_cash,
      session.full_name,
    );

    return NextResponse.json(
      {
        shift_id: result.shift_id,
        opened_at: result.opened_at,
        journal_entry_id: result.journal_entry_id,
        responsible_name: result.responsible_name,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_ALREADY_OPEN") {
      return NextResponse.json(
        {
          code: "SHIFT_ALREADY_OPEN",
          message: "มีกะเปิดอยู่แล้วในระบบ",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
