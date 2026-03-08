import type { User } from "@prisma/client";

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
      staffId: user.id,
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
  const userId = request.headers.get("x-user-id");
  const username = request.headers.get("x-username");

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : username
      ? await prisma.user.findUnique({ where: { username } })
      : null;

  return user ? toUserSession(user) : null;
}
