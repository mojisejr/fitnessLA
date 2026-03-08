import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { canManageUsers, toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const createUserSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  full_name: z.string().min(1).max(120).trim(),
  email: z.string().email().trim().toLowerCase(),
  role: z.enum(["OWNER", "ADMIN", "CASHIER"]).default("CASHIER"),
});

function unauthorized(message: string, code = "FORBIDDEN") {
  return NextResponse.json({ code, message }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await resolveSessionFromRequest(request);
  const headerRole = toAppRole(request.headers.get("x-user-role"));
  const requesterRole = session?.role ?? headerRole;

  if (!requesterRole) {
    return unauthorized("ต้องยืนยันตัวตนก่อนสร้างพนักงาน", "UNAUTHENTICATED");
  }

  if (!canManageUsers(requesterRole)) {
    return unauthorized("สิทธิ์ไม่เพียงพอสำหรับการสร้างพนักงาน");
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

  const payload = parseResult.data;

  try {
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        username: payload.username,
        name: payload.full_name,
        email: payload.email,
        role: payload.role,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        user_id: user.id,
        username: user.username,
        full_name: user.name,
        email: user.email,
        role: user.role,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          code: "USER_ALREADY_EXISTS",
          message: "username หรือ email นี้ถูกใช้งานแล้ว",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
