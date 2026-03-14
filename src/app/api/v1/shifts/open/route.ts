import { NextResponse } from "next/server";
import { z } from "zod";

import { openShiftWithJournal } from "@/features/operations/services";
import { resolveSessionFromRequest } from "@/lib/session";

const openShiftSchema = z.object({
  starting_cash: z.number().min(0),
  responsible_name: z.string().trim().min(1).max(120),
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

  try {
    const result = await openShiftWithJournal(session.user_id, parseResult.data.starting_cash);

    return NextResponse.json(
      {
        shift_id: result.shift_id,
        opened_at: result.opened_at,
        journal_entry_id: result.journal_entry_id,
        responsible_name: parseResult.data.responsible_name,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_ALREADY_OPEN") {
      return NextResponse.json(
        {
          code: "SHIFT_ALREADY_OPEN",
          message: "พนักงานมีกะเปิดอยู่แล้ว",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
