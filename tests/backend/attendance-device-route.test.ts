import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as attendanceDeviceGET, POST as attendanceDevicePOST } from "../../src/app/api/v1/attendance/device/route";

const mockResolveSessionFromRequest = vi.fn();
const mockGetAttendanceDeviceStatus = vi.fn();
const mockRegisterAttendanceDevice = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/staff/services", () => ({
  getAttendanceDeviceStatus: (...args: unknown[]) => mockGetAttendanceDeviceStatus(...args),
  registerAttendanceDevice: (...args: unknown[]) => mockRegisterAttendanceDevice(...args),
}));

describe("attendance device route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /attendance/device returns current device status", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });
    mockGetAttendanceDeviceStatus.mockResolvedValue({
      current_ip: "127.0.0.1",
      current_user_agent: "Mozilla/5.0",
      current_device_authorized: true,
      active_device: {
        device_id: "device-1",
        label: "Front Desk",
        registered_ip: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        approved_by_user_id: "owner-1",
        approved_by_name: "Owner One",
        is_active: true,
        last_seen_at: "2026-03-22T01:00:00.000Z",
        created_at: "2026-03-22T01:00:00.000Z",
      },
    });

    const response = await attendanceDeviceGET(new Request("http://localhost/api/v1/attendance/device"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.current_device_authorized).toBe(true);
    expect(body.active_device.label).toBe("Front Desk");
  });

  it("POST /attendance/device sets cookie and returns approved device", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });
    mockRegisterAttendanceDevice.mockResolvedValue({
      rawToken: "raw-device-token",
      device: {
        device_id: "device-1",
        label: "Front Desk",
        registered_ip: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        approved_by_user_id: "owner-1",
        approved_by_name: "Owner One",
        is_active: true,
        last_seen_at: "2026-03-22T01:00:00.000Z",
        created_at: "2026-03-22T01:00:00.000Z",
      },
    });

    const response = await attendanceDevicePOST(
      new Request("http://localhost/api/v1/attendance/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Front Desk" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.device.label).toBe("Front Desk");
    expect(response.headers.get("set-cookie")).toContain("attendance_device_token=");
  });
});