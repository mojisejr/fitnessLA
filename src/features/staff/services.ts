import { Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import type {
  AttendanceSummaryPeriod,
  AttendanceSummaryReport,
  AttendanceDeviceRecord,
  AttendanceDeviceStatusRecord,
  AttendanceStatusRecord,
  BulkDeleteManagedUsersResult,
  DeleteManagedUserResult,
  ManagedStaffUserRecord,
  StaffAttendanceSummaryRecord,
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

type AttendanceSummaryQuery = {
  period: AttendanceSummaryPeriod;
  date?: string;
  start_date?: string;
  end_date?: string;
  user_id?: string;
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

function isManagedUserRole(role: string) {
  const appRole = toAppRole(role);
  return appRole === "ADMIN" || appRole === "CASHIER";
}

function mapDeletedManagedUserRecord(user: {
  id: string;
  name: string;
  username: string;
  role: string;
}): DeleteManagedUserResult {
  const role = toAppRole(user.role);
  if (role !== "ADMIN" && role !== "CASHIER") {
    throw new Error("MANAGED_USER_DELETE_FORBIDDEN");
  }

  return {
    user_id: user.id,
    full_name: user.name,
    username: user.username,
    role,
  };
}

function getThaiNoonDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000+07:00`);
}

function shiftThaiDateKey(dateKey: string, days: number) {
  const next = getThaiNoonDate(dateKey);
  next.setUTCDate(next.getUTCDate() + days);
  return getThaiDateKey(next);
}

function getMonthBoundary(dateKey: string, boundary: "start" | "end") {
  const current = getThaiNoonDate(dateKey);
  const year = current.getUTCFullYear();
  const monthIndex = current.getUTCMonth();

  if (boundary === "start") {
    return getThaiDateKey(new Date(Date.UTC(year, monthIndex, 1, 5, 0, 0)));
  }

  return getThaiDateKey(new Date(Date.UTC(year, monthIndex + 1, 0, 5, 0, 0)));
}

function resolveAttendanceSummaryRange(query: AttendanceSummaryQuery) {
  if (query.period === "CUSTOM") {
    if (!query.start_date || !query.end_date) {
      throw new Error("INVALID_DATE_RANGE");
    }

    return {
      rangeStart: query.start_date,
      rangeEnd: query.end_date,
    };
  }

  if (!query.date) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (query.period === "DAY") {
    return {
      rangeStart: query.date,
      rangeEnd: query.date,
    };
  }

  if (query.period === "WEEK") {
    const anchor = getThaiNoonDate(query.date);
    const dayOfWeek = anchor.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const rangeStart = shiftThaiDateKey(query.date, -daysFromMonday);
    return {
      rangeStart,
      rangeEnd: shiftThaiDateKey(rangeStart, 6),
    };
  }

  return {
    rangeStart: getMonthBoundary(query.date, "start"),
    rangeEnd: getMonthBoundary(query.date, "end"),
  };
}

function resolveAttendanceSummaryStatus(summary: {
  checkedInDays: number;
  onTimeDays: number;
  lateDays: number;
  earlyDays: number;
}): StaffAttendanceSummaryRecord["summary_status"] {
  if (summary.checkedInDays === 0) {
    return "NO_RECORD";
  }

  const activeStatuses = [summary.onTimeDays > 0, summary.lateDays > 0, summary.earlyDays > 0].filter(Boolean).length;
  if (activeStatuses > 1) {
    return "MIXED";
  }

  if (summary.lateDays > 0) {
    return "LATE";
  }

  if (summary.earlyDays > 0) {
    return "EARLY";
  }

  return "ON_TIME";
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

export async function deleteManagedUser(userId: string): Promise<DeleteManagedUserResult> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  });

  if (!target) {
    throw new Error("MANAGED_USER_NOT_FOUND");
  }

  if (!isManagedUserRole(target.role)) {
    throw new Error("MANAGED_USER_DELETE_FORBIDDEN");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return mapDeletedManagedUserRecord(target);
}

export async function deleteManagedUsers(userIds: string[]): Promise<BulkDeleteManagedUsersResult> {
  const normalizedIds = [...new Set(userIds.map((userId) => userId.trim()).filter(Boolean))];
  if (normalizedIds.length === 0) {
    throw new Error("MANAGED_USER_IDS_REQUIRED");
  }

  const targets = await prisma.user.findMany({
    where: {
      id: { in: normalizedIds },
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  if (targets.length !== normalizedIds.length) {
    throw new Error("MANAGED_USER_NOT_FOUND");
  }

  if (targets.some((target) => !isManagedUserRole(target.role))) {
    throw new Error("MANAGED_USER_DELETE_FORBIDDEN");
  }

  await prisma.user.deleteMany({
    where: {
      id: { in: normalizedIds },
    },
  });

  return {
    deleted_count: targets.length,
    deleted_users: targets.map(mapDeletedManagedUserRecord),
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

export async function getAttendanceSummaryReport(query: AttendanceSummaryQuery): Promise<AttendanceSummaryReport> {
  const { rangeStart, rangeEnd } = resolveAttendanceSummaryRange(query);

  const managedUsers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "CASHIER"] },
      ...(query.user_id ? { id: query.user_id } : {}),
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      allowedMachineIp: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const managedUserIds = managedUsers.map((user) => user.id);

  const attendanceRows = managedUserIds.length === 0
    ? []
    : await prisma.staffAttendance.findMany({
      where: {
        userId: { in: managedUserIds },
        workDate: {
          gte: thaiDateKeyToDate(rangeStart),
          lte: thaiDateKeyToDate(rangeEnd),
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
      orderBy: [{ workDate: "desc" }, { checkedInAt: "desc" }],
    });

  const mappedRows = attendanceRows.map(mapAttendanceRecord);

  const summaryRows: StaffAttendanceSummaryRecord[] = managedUsers.map((user) => {
    const role = toAppRole(user.role);
    if (role !== "ADMIN" && role !== "CASHIER") {
      throw new Error("INVALID_ROLE");
    }

    const rows = mappedRows.filter((row) => String(row.user_id) === user.id);
    const checkedInDays = rows.filter((row) => row.checked_in_at).length;
    const checkedOutDays = rows.filter((row) => row.checked_out_at).length;
    const onTimeDays = rows.filter((row) => row.arrival_status === "ON_TIME").length;
    const lateDays = rows.filter((row) => row.arrival_status === "LATE").length;
    const earlyDays = rows.filter((row) => row.arrival_status === "EARLY").length;
    const latestRow = rows[0] ?? null;

    return {
      user_id: user.id,
      full_name: user.name,
      username: user.username,
      role,
      scheduled_start_time: user.scheduledStartTime,
      scheduled_end_time: user.scheduledEndTime,
      attendance_days: rows.length,
      checked_in_days: checkedInDays,
      checked_out_days: checkedOutDays,
      on_time_days: onTimeDays,
      late_days: lateDays,
      early_days: earlyDays,
      late_minutes_total: rows.reduce((sum, row) => sum + row.late_minutes, 0),
      early_arrival_minutes_total: rows.reduce((sum, row) => sum + row.early_arrival_minutes, 0),
      overtime_minutes_total: rows.reduce((sum, row) => sum + row.overtime_minutes, 0),
      early_leave_minutes_total: rows.reduce((sum, row) => sum + row.early_leave_minutes, 0),
      summary_status: resolveAttendanceSummaryStatus({ checkedInDays, onTimeDays, lateDays, earlyDays }),
      latest_work_date: latestRow?.work_date ?? null,
      latest_checked_in_at: latestRow?.checked_in_at ?? null,
      latest_checked_out_at: latestRow?.checked_out_at ?? null,
      latest_arrival_status: latestRow?.arrival_status ?? null,
      latest_departure_status: latestRow?.departure_status ?? null,
    };
  });

  return {
    period: query.period,
    range_start: rangeStart,
    range_end: rangeEnd,
    summary_rows: summaryRows,
    filtered_attendance_rows: mappedRows,
  };
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