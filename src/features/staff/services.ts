import { Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import type {
  AttendanceDeviceRecord,
  AttendanceDeviceStatusRecord,
  AttendanceStatusRecord,
  ManagedStaffUserRecord,
  StaffAttendanceRecord,
  UserSession,
} from "@/lib/contracts";
import {
  createAttendanceDeviceToken,
  getAttendanceDeviceTokenFromRequest,
  getRequestUserAgent,
  hashAttendanceDeviceToken,
} from "@/lib/attendance-device";
import { prisma } from "@/lib/prisma";
import { getRequestIp, normalizeAllowedMachineIp } from "@/lib/request-ip";
import { toAppRole } from "@/lib/roles";
import {
  calculateArrivalMetrics,
  calculateDepartureMetrics,
  getThaiDateKey,
  getThaiDateTime,
  normalizeTimeInput,
  thaiDateKeyToDate,
} from "@/lib/time";

type CreateManagedUserInput = {
  username: string;
  full_name: string;
  phone: string;
  password: string;
  role: "OWNER" | "ADMIN" | "CASHIER";
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  allowed_machine_ip?: string | null;
};

type UpdateManagedUserSettingsInput = {
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  allowed_machine_ip?: string | null;
};

type AttendanceDeviceRow = {
  id: string;
  label: string;
  tokenHash: string;
  registeredIp: string | null;
  userAgent: string | null;
  approvedByUserId: string;
  approvedByUserName: string;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapAdminUserRecord(user: {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  email: string;
  role: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  allowedMachineIp: string | null;
}) {
  const role = toAppRole(user.role);
  if (!role) {
    throw new Error("INVALID_ROLE");
  }

  return {
    user_id: user.id,
    username: user.username,
    full_name: user.name,
    phone: user.phone,
    email: user.email,
    role,
    scheduled_start_time: user.scheduledStartTime,
    scheduled_end_time: user.scheduledEndTime,
    allowed_machine_ip: user.allowedMachineIp,
  };
}

function mapAttendanceRecord(record: {
  id: string;
  userId: string;
  workDate: Date;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  arrivalStatus: string;
  departureStatus: string;
  lateMinutes: number;
  earlyArrivalMinutes: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  machineIp: string | null;
  note: string | null;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
}): StaffAttendanceRecord {
  const role = toAppRole(record.user.role);
  if (!role) {
    throw new Error("INVALID_ROLE");
  }

  return {
    attendance_id: record.id,
    user_id: record.userId,
    full_name: record.user.name,
    username: record.user.username,
    role,
    work_date: getThaiDateKey(record.workDate),
    scheduled_start_time: record.scheduledStartTime,
    scheduled_end_time: record.scheduledEndTime,
    checked_in_at: record.checkedInAt?.toISOString() ?? null,
    checked_out_at: record.checkedOutAt?.toISOString() ?? null,
    arrival_status: record.arrivalStatus as StaffAttendanceRecord["arrival_status"],
    departure_status: record.departureStatus as StaffAttendanceRecord["departure_status"],
    late_minutes: record.lateMinutes,
    early_arrival_minutes: record.earlyArrivalMinutes,
    overtime_minutes: record.overtimeMinutes,
    early_leave_minutes: record.earlyLeaveMinutes,
    machine_ip: record.machineIp,
    note: record.note,
  };
}

function mapAttendanceDeviceRecord(record: AttendanceDeviceRow): AttendanceDeviceRecord {
  return {
    device_id: record.id,
    label: record.label,
    registered_ip: record.registeredIp,
    user_agent: record.userAgent,
    approved_by_user_id: record.approvedByUserId,
    approved_by_name: record.approvedByUserName,
    is_active: record.isActive,
    last_seen_at: record.lastSeenAt?.toISOString() ?? null,
    created_at: record.createdAt.toISOString(),
  };
}

export async function createManagedUser(input: CreateManagedUserInput) {
  const username = input.username.trim();
  const phone = input.phone.trim();
  const syntheticEmail = `${username.toLowerCase()}@fitnessla.local`;
  const scheduledStartTime = normalizeTimeInput(input.scheduled_start_time);
  const scheduledEndTime = normalizeTimeInput(input.scheduled_end_time);
  const allowedMachineIp = normalizeAllowedMachineIp(input.allowed_machine_ip);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        id: crypto.randomUUID(),
        username,
        phone,
        name: input.full_name,
        email: syntheticEmail,
        role: input.role,
        isActive: true,
        emailVerified: true,
        scheduledStartTime,
        scheduledEndTime,
        allowedMachineIp,
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
        scheduledStartTime: true,
        scheduledEndTime: true,
        allowedMachineIp: true,
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

  return mapAdminUserRecord(user);
}

export async function listManagedUsers(): Promise<ManagedStaffUserRecord[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "CASHIER"] },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      attendanceLogs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: [{ workDate: "desc" }, { checkedInAt: "desc" }],
        take: 1,
      },
    },
  });

  return users.map((user) => ({
    ...mapAdminUserRecord(user),
    latest_attendance: user.attendanceLogs[0] ? mapAttendanceRecord(user.attendanceLogs[0]) : null,
  }));
}

export async function updateManagedUserSettings(userId: string, input: UpdateManagedUserSettingsInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      scheduledStartTime:
        input.scheduled_start_time === undefined ? undefined : normalizeTimeInput(input.scheduled_start_time),
      scheduledEndTime:
        input.scheduled_end_time === undefined ? undefined : normalizeTimeInput(input.scheduled_end_time),
      allowedMachineIp:
        input.allowed_machine_ip === undefined ? undefined : normalizeAllowedMachineIp(input.allowed_machine_ip),
      updatedAt: new Date(),
    },
    include: {
      attendanceLogs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: [{ workDate: "desc" }, { checkedInAt: "desc" }],
        take: 1,
      },
    },
  });

  return {
    ...mapAdminUserRecord(user),
    latest_attendance: user.attendanceLogs[0] ? mapAttendanceRecord(user.attendanceLogs[0]) : null,
  };
}

export async function listAttendanceRows(limit = 60): Promise<StaffAttendanceRecord[]> {
  const rows = await prisma.staffAttendance.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
    },
    orderBy: [{ workDate: "desc" }, { checkedInAt: "desc" }],
    take: limit,
  });

  return rows.map(mapAttendanceRecord);
}

async function getTodayAttendanceRow(userId: string) {
  const { dateKey } = getThaiDateTime();
  const workDate = thaiDateKeyToDate(dateKey);

  return prisma.staffAttendance.findUnique({
    where: {
      userId_workDate: {
        userId,
        workDate,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
    },
  });
}

async function getManagedUserForAttendance(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      allowedMachineIp: true,
    },
  });
}

async function hasOpenShift() {
  const activeShift = await prisma.shift.findFirst({
    where: {
      status: "OPEN",
      endTime: null,
    },
    select: { id: true },
  });

  return Boolean(activeShift);
}

async function getActiveAttendanceDevice() {
  return prisma.attendanceDevice.findFirst({
    where: { isActive: true },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

async function resolveAttendanceDeviceAccess(request: Request) {
  const activeDevice = await getActiveAttendanceDevice();
  const currentIp = getRequestIp(request);
  const currentUserAgent = getRequestUserAgent(request);
  const rawToken = getAttendanceDeviceTokenFromRequest(request);
  const tokenHash = rawToken ? hashAttendanceDeviceToken(rawToken) : null;
  const deviceAllowed = Boolean(activeDevice && tokenHash && activeDevice.tokenHash === tokenHash);

  return {
    activeDevice,
    currentIp,
    currentUserAgent,
    deviceAllowed,
  };
}

function assertAttendanceRole(role: UserSession["role"]) {
  if (role !== "ADMIN" && role !== "CASHIER") {
    throw new Error("ATTENDANCE_ROLE_NOT_ALLOWED");
  }
}

export async function getAttendanceDeviceStatus(request: Request): Promise<AttendanceDeviceStatusRecord> {
  const access = await resolveAttendanceDeviceAccess(request);

  return {
    current_ip: access.currentIp,
    current_user_agent: access.currentUserAgent,
    current_device_authorized: access.deviceAllowed,
    active_device: access.activeDevice ? mapAttendanceDeviceRecord(access.activeDevice) : null,
  };
}

export async function registerAttendanceDevice(session: UserSession, request: Request, label?: string) {
  if (session.role !== "OWNER") {
    throw new Error("ATTENDANCE_DEVICE_FORBIDDEN");
  }

  const rawToken = createAttendanceDeviceToken();
  const tokenHash = hashAttendanceDeviceToken(rawToken);
  const currentIp = getRequestIp(request);
  const currentUserAgent = getRequestUserAgent(request);
  const normalizedLabel = label?.trim() ? label.trim() : "เครื่องลงเวลาเข้างานหน้าร้าน";

  const device = await prisma.$transaction(async (tx) => {
    await tx.attendanceDevice.updateMany({
      where: { isActive: true },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return tx.attendanceDevice.create({
      data: {
        label: normalizedLabel,
        tokenHash,
        registeredIp: currentIp,
        userAgent: currentUserAgent,
        approvedByUserId: String(session.user_id),
        approvedByUserName: session.full_name,
        isActive: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  return {
    device: mapAttendanceDeviceRecord(device),
    rawToken,
  };
}

export async function getAttendanceStatusForSession(session: UserSession, request: Request): Promise<AttendanceStatusRecord> {
  const today = await getTodayAttendanceRow(String(session.user_id));
  const access = await resolveAttendanceDeviceAccess(request);
  const hasActiveShift = await hasOpenShift();
  const attendanceEnabled = session.role === "ADMIN" || session.role === "CASHIER";

  return {
    today: today ? mapAttendanceRecord(today) : null,
    current_ip: access.currentIp,
    device_allowed: access.deviceAllowed,
    can_check_in: attendanceEnabled && !today?.checkedInAt && access.deviceAllowed,
    can_check_out: attendanceEnabled && Boolean(today?.checkedInAt) && !today?.checkedOutAt && !hasActiveShift,
    has_active_shift: hasActiveShift,
    active_device: access.activeDevice ? mapAttendanceDeviceRecord(access.activeDevice) : null,
  };
}

export async function checkInForSession(session: UserSession, request: Request) {
  assertAttendanceRole(session.role);

  const user = await getManagedUserForAttendance(String(session.user_id));
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const access = await resolveAttendanceDeviceAccess(request);
  if (!access.deviceAllowed) {
    throw new Error("ATTENDANCE_DEVICE_NOT_ALLOWED");
  }

  const existing = await getTodayAttendanceRow(user.id);
  if (existing?.checkedInAt) {
    throw new Error("ATTENDANCE_ALREADY_CHECKED_IN");
  }

  const { dateKey, timeKey, instant } = getThaiDateTime();
  const workDate = thaiDateKeyToDate(dateKey);
  const arrival = calculateArrivalMetrics(user.scheduledStartTime, timeKey);

  const attendance = existing
    ? await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          scheduledStartTime: user.scheduledStartTime,
          scheduledEndTime: user.scheduledEndTime,
          checkedInAt: instant,
          arrivalStatus: arrival.arrivalStatus,
          lateMinutes: arrival.lateMinutes,
          earlyArrivalMinutes: arrival.earlyArrivalMinutes,
          machineIp: access.currentIp,
          note:
            arrival.arrivalStatus === "LATE"
              ? `Late by ${arrival.lateMinutes} minute(s)`
              : arrival.arrivalStatus === "EARLY"
                ? `Early by ${arrival.earlyArrivalMinutes} minute(s)`
                : null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      })
    : await prisma.staffAttendance.create({
        data: {
          userId: user.id,
          workDate,
          scheduledStartTime: user.scheduledStartTime,
          scheduledEndTime: user.scheduledEndTime,
          checkedInAt: instant,
          arrivalStatus: arrival.arrivalStatus,
          departureStatus: "PENDING",
          lateMinutes: arrival.lateMinutes,
          earlyArrivalMinutes: arrival.earlyArrivalMinutes,
          machineIp: access.currentIp,
          note:
            arrival.arrivalStatus === "LATE"
              ? `Late by ${arrival.lateMinutes} minute(s)`
              : arrival.arrivalStatus === "EARLY"
                ? `Early by ${arrival.earlyArrivalMinutes} minute(s)`
                : null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

  if (access.activeDevice) {
    await prisma.attendanceDevice.update({
      where: { id: access.activeDevice.id },
      data: {
        lastSeenAt: instant,
        registeredIp: access.currentIp,
        userAgent: access.currentUserAgent,
      },
    });
  }

  return mapAttendanceRecord(attendance);
}

export async function checkOutForSession(session: UserSession) {
  assertAttendanceRole(session.role);

  if (await hasOpenShift()) {
    throw new Error("SHIFT_STILL_OPEN");
  }

  const today = await getTodayAttendanceRow(String(session.user_id));
  if (!today?.checkedInAt) {
    throw new Error("ATTENDANCE_NOT_CHECKED_IN");
  }

  if (today.checkedOutAt) {
    throw new Error("ATTENDANCE_ALREADY_CHECKED_OUT");
  }

  const { timeKey, instant } = getThaiDateTime();
  const departure = calculateDepartureMetrics(today.scheduledEndTime, timeKey);
  const attendance = await prisma.staffAttendance.update({
    where: { id: today.id },
    data: {
      checkedOutAt: instant,
      departureStatus: departure.departureStatus,
      overtimeMinutes: departure.overtimeMinutes,
      earlyLeaveMinutes: departure.earlyLeaveMinutes,
      note:
        departure.departureStatus === "EARLY_LEAVE"
          ? `Left early by ${departure.earlyLeaveMinutes} minute(s)`
          : departure.departureStatus === "OVERTIME"
            ? `Overtime ${departure.overtimeMinutes} minute(s)`
            : today.note,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
    },
  });

  return mapAttendanceRecord(attendance);
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}