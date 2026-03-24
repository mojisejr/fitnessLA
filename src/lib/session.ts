import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toAppRole, type AppRole } from "@/lib/roles";

export type UserSession = {
  user_id: string;
  username: string;
  full_name: string;
  role: AppRole;
  trainer_id: string | null;
  active_shift_id: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  allowed_machine_ip: string | null;
};

async function toUserSession(user: {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  allowedMachineIp: string | null;
  trainerProfile: { id: string } | null;
}): Promise<UserSession | null> {
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
    trainer_id: user.trainerProfile?.id ?? null,
    active_shift_id: activeShift?.id ?? null,
    scheduled_start_time: user.scheduledStartTime ?? null,
    scheduled_end_time: user.scheduledEndTime ?? null,
    allowed_machine_ip: user.allowedMachineIp ?? null,
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

  const user = await prisma.user.findUnique({
    where: { id: authenticatedUserId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      allowedMachineIp: true,
      trainerProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  return user ? toUserSession(user) : null;
}
