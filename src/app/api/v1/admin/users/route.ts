import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createManagedUser,
  isUniqueConstraintError,
  listAttendanceRows,
  listManagedUsers,
} from "@/features/staff/services";
import { toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const createUserSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  full_name: z.string().min(1).max(120).trim(),
  phone: z.string().trim().min(8).max(30),
  password: z.string().min(8).max(128),
  role: z.enum(["OWNER", "ADMIN", "CASHIER"]).default("CASHIER"),
  scheduled_start_time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  scheduled_end_time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  allowed_machine_ip: z.string().trim().min(3).max(64).optional(),
});

function unauthorized(message: string, code = "FORBIDDEN") {
  return NextResponse.json({ code, message }, { status: 403 });
}

async function resolveOwnerRequest(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return { response: unauthorized("ต้องยืนยันตัวตนก่อนสร้างพนักงาน", "UNAUTHENTICATED") };
  }

  if (requesterRole !== "OWNER") {
    return { response: unauthorized("สิทธิ์ไม่เพียงพอสำหรับการสร้างพนักงาน") };
  }

  return { session };
}

export async function GET(request: Request) {
  const access = await resolveOwnerRequest(request);
  if (access.response) {
    return access.response;
  }

  const [users, attendanceRows] = await Promise.all([listManagedUsers(), listAttendanceRows()]);
  return NextResponse.json(
    {
      users,
      attendance_rows: attendanceRows,
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const access = await resolveOwnerRequest(request);
  if (access.response) {
    return access.response;
  }

  const parseResult = createUserSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลพนักงานไม่ถูกต้อง",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const user = await createManagedUser(parseResult.data);

    return NextResponse.json(
      user,
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          code: "USER_ALREADY_EXISTS",
          message: "username นี้ถูกใช้งานแล้ว",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
