import type { User } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toAppRole, type AppRole } from "@/lib/roles";

export type UserSession = {
  user_id: string;
  username: string;
  full_name: string;
  role: AppRole;
  active_shift_id: string | null;
};

async function toUserSession(user: User): Promise<UserSession | null> {
  const role = toAppRole(user.role);
  if (!role || !user.isActive) {
    return null;
  }

  const activeShift = await prisma.shift.findFirst({
    where: {
      status: "OPEN",
      endTime: null,
    },
    orderBy: { startTime: "desc" },
    select: { id: true },
  });

  return {
    user_id: user.id,
    username: user.username,
    full_name: user.name,
    role,
    active_shift_id: activeShift?.id ?? null,
  };
}

export async function resolveSessionFromRequest(request: Request): Promise<UserSession | null> {
  const authSession = await auth.api.getSession({
    headers: new Headers(request.headers),
  });

  const authenticatedUserId = authSession?.user?.id;
  if (!authenticatedUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: authenticatedUserId } });

  return user ? toUserSession(user) : null;
}
