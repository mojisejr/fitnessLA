import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as adminUsersGET, POST as adminUsersPOST } from "../../src/app/api/v1/admin/users/route";

const mockResolveSessionFromRequest = vi.fn();
const mockCreateManagedUser = vi.fn();
const mockListManagedUsers = vi.fn();
const mockListAttendanceRows = vi.fn();
const mockIsUniqueConstraintError = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/staff/services", () => ({
  createManagedUser: (...args: unknown[]) => mockCreateManagedUser(...args),
  listManagedUsers: (...args: unknown[]) => mockListManagedUsers(...args),
  listAttendanceRows: (...args: unknown[]) => mockListAttendanceRows(...args),
  isUniqueConstraintError: (...args: unknown[]) => mockIsUniqueConstraintError(...args),
}));

describe("admin users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUniqueConstraintError.mockReturnValue(false);
  });

  it("GET /admin/users returns managed users and attendance rows for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockListManagedUsers.mockResolvedValue([
      {
        user_id: "user-1",
        full_name: "Cashier One",
        username: "cashier.one",
        phone: "0812345678",
        role: "CASHIER",
        scheduled_start_time: "08:00",
        scheduled_end_time: "17:00",
        allowed_machine_ip: "127.0.0.1",
        latest_attendance: null,
      },
    ]);
    mockListAttendanceRows.mockResolvedValue([
      {
        attendance_id: "att-1",
        user_id: "user-1",
        full_name: "Cashier One",
        username: "cashier.one",
        role: "CASHIER",
        work_date: "2026-03-22",
        scheduled_start_time: "08:00",
        scheduled_end_time: "17:00",
        checked_in_at: "2026-03-22T01:00:00.000Z",
        checked_out_at: null,
        arrival_status: "ON_TIME",
        departure_status: "PENDING",
        late_minutes: 0,
        early_arrival_minutes: 0,
        overtime_minutes: 0,
        early_leave_minutes: 0,
        machine_ip: "127.0.0.1",
      },
    ]);

    const response = await adminUsersGET(new Request("http://localhost/api/v1/admin/users"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(body.attendance_rows).toHaveLength(1);
  });

  it("POST /admin/users creates a login-ready user for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockCreateManagedUser.mockResolvedValue({
      user_id: "user-1",
      username: "smoke.owner.user",
      phone: "0812345678",
      full_name: "Smoke Owner User",
      email: "smoke.owner.user@fitnessla.local",
      role: "CASHIER",
      scheduled_start_time: "08:00",
      scheduled_end_time: "17:00",
      allowed_machine_ip: "127.0.0.1",
    });

    const response = await adminUsersPOST(
      new Request("http://localhost/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "smoke.owner.user",
          full_name: "Smoke Owner User",
          phone: "0812345678",
          password: "SmokePass123!",
          role: "CASHIER",
          scheduled_start_time: "08:00",
          scheduled_end_time: "17:00",
          allowed_machine_ip: "127.0.0.1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateManagedUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "smoke.owner.user",
        scheduled_start_time: "08:00",
        allowed_machine_ip: "127.0.0.1",
      }),
    );
    expect(body).toMatchObject({
      user_id: "user-1",
      username: "smoke.owner.user",
      full_name: "Smoke Owner User",
      phone: "0812345678",
      role: "CASHIER",
    });
  });

  it("POST /admin/users returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await adminUsersPOST(
      new Request("http://localhost/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "blocked.admin",
          full_name: "Blocked Admin",
          phone: "0812345678",
          password: "SmokePass123!",
          role: "CASHIER",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับการสร้างพนักงาน",
    });
    expect(mockCreateManagedUser).not.toHaveBeenCalled();
  });

  it("POST /admin/users validates phone and password", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });

    const response = await adminUsersPOST(
      new Request("http://localhost/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "bad.user",
          full_name: "Bad User",
          phone: "123",
          password: "123",
          role: "CASHIER",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(mockCreateManagedUser).not.toHaveBeenCalled();
  });
});