import type {
  AttendanceArrivalStatus,
  AttendanceDepartureStatus,
} from "@/lib/contracts";

const THAI_TIME_ZONE = "Asia/Bangkok";

function getFormatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: THAI_TIME_ZONE,
    ...options,
  });
}

function getParts(date: Date, options: Intl.DateTimeFormatOptions) {
  return getFormatter(options).formatToParts(date);
}

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getThaiDateKey(date = new Date()) {
  const parts = getParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${getPartValue(parts, "year")}-${getPartValue(parts, "month")}-${getPartValue(parts, "day")}`;
}

export function getThaiTimeKey(date = new Date()) {
  const parts = getParts(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${getPartValue(parts, "hour")}:${getPartValue(parts, "minute")}`;
}

export function getThaiDateTime(date = new Date()) {
  return {
    dateKey: getThaiDateKey(date),
    timeKey: getThaiTimeKey(date),
    instant: date,
  };
}

export function normalizeTimeInput(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : null;
}

export function thaiDateKeyToDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000+07:00`);
}

function minutesFromTimeKey(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateArrivalMetrics(scheduledStartTime: string | null, actualTimeKey: string): {
  arrivalStatus: AttendanceArrivalStatus;
  lateMinutes: number;
  earlyArrivalMinutes: number;
} {
  if (!scheduledStartTime) {
    return {
      arrivalStatus: "UNSCHEDULED",
      lateMinutes: 0,
      earlyArrivalMinutes: 0,
    };
  }

  const difference = minutesFromTimeKey(actualTimeKey) - minutesFromTimeKey(scheduledStartTime);

  if (difference > 0) {
    return {
      arrivalStatus: "LATE",
      lateMinutes: difference,
      earlyArrivalMinutes: 0,
    };
  }

  if (difference < 0) {
    return {
      arrivalStatus: "EARLY",
      lateMinutes: 0,
      earlyArrivalMinutes: Math.abs(difference),
    };
  }

  return {
    arrivalStatus: "ON_TIME",
    lateMinutes: 0,
    earlyArrivalMinutes: 0,
  };
}

export function calculateDepartureMetrics(scheduledEndTime: string | null, actualTimeKey: string): {
  departureStatus: AttendanceDepartureStatus;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
} {
  if (!scheduledEndTime) {
    return {
      departureStatus: "ON_TIME",
      overtimeMinutes: 0,
      earlyLeaveMinutes: 0,
    };
  }

  const difference = minutesFromTimeKey(actualTimeKey) - minutesFromTimeKey(scheduledEndTime);

  if (difference > 0) {
    return {
      departureStatus: "OVERTIME",
      overtimeMinutes: difference,
      earlyLeaveMinutes: 0,
    };
  }

  if (difference < 0) {
    return {
      departureStatus: "EARLY_LEAVE",
      overtimeMinutes: 0,
      earlyLeaveMinutes: Math.abs(difference),
    };
  }

  return {
    departureStatus: "ON_TIME",
    overtimeMinutes: 0,
    earlyLeaveMinutes: 0,
  };
}