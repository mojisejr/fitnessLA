import { Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { toAppRole } from "@/lib/roles";
import { resolveSessionFromRequest } from "@/lib/session";

const createUserSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  full_name: z.string().min(1).max(120).trim(),
  phone: z.string().trim().min(8).max(30),
  password: z.string().min(8).max(128),
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

  if (requesterRole !== "OWNER") {
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
  const username = payload.username.trim();
  const phone = payload.phone.trim();
  const syntheticEmail = `${username.toLowerCase()}@fitnessla.local`;

  try {
    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          username,
          phone,
          name: payload.full_name,
          email: syntheticEmail,
          role: payload.role,
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          username: true,
          phone: true,
          name: true,
          email: true,
          role: true,
        },
      });

      await tx.account.create({
        data: {
          id: `acc-${username}-${crypto.randomUUID()}`,
          accountId: createdUser.id,
          providerId: "credential",
          userId: createdUser.id,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return createdUser;
    });

    return NextResponse.json(
      {
        user_id: user.id,
        username: user.username,
        full_name: user.name,
        phone: user.phone,
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
          message: "username นี้ถูกใช้งานแล้ว",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
