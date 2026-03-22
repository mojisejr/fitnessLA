import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as attendanceSummaryGET } from "../../src/app/api/v1/admin/users/attendance-summary/route";

const mockResolveSessionFromRequest = vi.fn();
const mockGetAttendanceSummaryReport = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/staff/services", () => ({
  getAttendanceSummaryReport: (...args: unknown[]) => mockGetAttendanceSummaryReport(...args),
}));

describe("attendance summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns owner attendance summary for selected period", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });
    mockGetAttendanceSummaryReport.mockResolvedValue({
      period: "WEEK",
      range_start: "2026-03-16",
      range_end: "2026-03-22",
      summary_rows: [
        {
          user_id: "user-1",
          full_name: "Cashier One",
          username: "cashier.one",
          role: "CASHIER",
          scheduled_start_time: "08:00",
          scheduled_end_time: "17:00",
          attendance_days: 5,
          checked_in_days: 5,
          checked_out_days: 5,
          on_time_days: 3,
          late_days: 2,
          early_days: 0,
          late_minutes_total: 18,
          early_arrival_minutes_total: 0,
          overtime_minutes_total: 12,
          early_leave_minutes_total: 0,
          summary_status: "MIXED",
          latest_work_date: "2026-03-22",
          latest_checked_in_at: "2026-03-22T01:02:00.000Z",
          latest_checked_out_at: "2026-03-22T10:00:00.000Z",
          latest_arrival_status: "LATE",
          latest_departure_status: "ON_TIME",
        },
      ],
      filtered_attendance_rows: [],
    });

    const response = await attendanceSummaryGET(new Request("http://localhost/api/v1/admin/users/attendance-summary?period=WEEK&date=2026-03-22"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.period).toBe("WEEK");
    expect(mockGetAttendanceSummaryReport).toHaveBeenCalledWith({ period: "WEEK", date: "2026-03-22", user_id: undefined });
  });

  it("GET validates custom range", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });

    const response = await attendanceSummaryGET(new Request("http://localhost/api/v1/admin/users/attendance-summary?period=CUSTOM&start_date=2026-03-22&end_date=2026-03-01"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});