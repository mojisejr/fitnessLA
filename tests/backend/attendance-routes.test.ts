import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as attendanceStatusGET } from "../../src/app/api/v1/attendance/status/route";
import { POST as attendanceCheckInPOST } from "../../src/app/api/v1/attendance/check-in/route";
import { POST as attendanceCheckOutPOST } from "../../src/app/api/v1/attendance/check-out/route";

const mockResolveSessionFromRequest = vi.fn();
const mockGetAttendanceStatusForSession = vi.fn();
const mockCheckInForSession = vi.fn();
const mockCheckOutForSession = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/staff/services", () => ({
  getAttendanceStatusForSession: (...args: unknown[]) => mockGetAttendanceStatusForSession(...args),
  checkInForSession: (...args: unknown[]) => mockCheckInForSession(...args),
  checkOutForSession: (...args: unknown[]) => mockCheckOutForSession(...args),
}));

describe("attendance routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /attendance/status returns current status", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockGetAttendanceStatusForSession.mockResolvedValue({
      today: null,
      current_ip: "127.0.0.1",
      device_allowed: true,
      can_check_in: true,
      can_check_out: false,
      has_active_shift: false,
      active_device: null,
    });

    const response = await attendanceStatusGET(new Request("http://localhost/api/v1/attendance/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.can_check_in).toBe(true);
  });

  it("POST /attendance/check-in returns warning when user is late", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockCheckInForSession.mockResolvedValue({
      attendance_id: "att-1",
      user_id: "u1",
      full_name: "Admin One",
      username: "admin.one",
      role: "ADMIN",
      work_date: "2026-03-22",
      scheduled_start_time: "08:00",
      scheduled_end_time: "17:00",
      checked_in_at: "2026-03-22T01:15:00.000Z",
      checked_out_at: null,
      arrival_status: "LATE",
      departure_status: "PENDING",
      late_minutes: 15,
      early_arrival_minutes: 0,
      overtime_minutes: 0,
      early_leave_minutes: 0,
      machine_ip: "127.0.0.1",
    });

    const response = await attendanceCheckInPOST(new Request("http://localhost/api/v1/attendance/check-in", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.warning).toEqual({
      code: "LATE_ATTENDANCE",
      message: "มาสาย 15 นาที",
    });
  });

  it("POST /attendance/check-in returns 403 when current device is not allowed", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockCheckInForSession.mockRejectedValue(new Error("ATTENDANCE_DEVICE_NOT_ALLOWED"));

    const response = await attendanceCheckInPOST(new Request("http://localhost/api/v1/attendance/check-in", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("ATTENDANCE_DEVICE_NOT_ALLOWED");
  });

  it("POST /attendance/check-out returns 409 while shift is still open", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockCheckOutForSession.mockRejectedValue(new Error("SHIFT_STILL_OPEN"));

    const response = await attendanceCheckOutPOST(new Request("http://localhost/api/v1/attendance/check-out", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("SHIFT_STILL_OPEN");
  });
});