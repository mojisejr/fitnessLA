import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import AdminAttendancePage from "@/app/(app)/admin/attendance/page";
import DashboardPage from "@/app/(app)/dashboard/page";

import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("owner attendance pages", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearMockSession();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    clearMockSession();
  });

  it("shows a dashboard shortcut to the dedicated owner attendance page", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "ย้ายสรุป attendance owner ไปหน้าแยกแล้ว" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "ไปหน้า attendance ทีม" })).toHaveAttribute("href", "/admin/attendance");
    expect(screen.queryByRole("heading", { name: "พนักงานที่เข้างาน วันนี้ กี่โมง ออกกี่โมง สายเท่าไหร่" })).not.toBeInTheDocument();
  });

  it("loads the dedicated owner attendance page from the new API route", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("period=DAY") && !url.includes("user_id=")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              range_start: "2026-03-22",
              range_end: "2026-03-22",
              summary_rows: [
                {
                  user_id: 10,
                  username: "cashier1",
                  full_name: "Pim Counter",
                  role: "CASHIER",
                  checked_in_days: 1,
                  checked_out_days: 0,
                  late_minutes_total: 15,
                  early_arrival_minutes_total: 0,
                  summary_status: "LATE",
                  latest_work_date: "2026-03-22",
                  latest_checked_in_at: "2026-03-22T02:15:00.000Z",
                  latest_checked_out_at: null,
                },
              ],
              filtered_attendance_rows: [
                {
                  attendance_id: 101,
                  user_id: 10,
                  username: "cashier1",
                  full_name: "Pim Counter",
                  role: "CASHIER",
                  work_date: "2026-03-22",
                  scheduled_start_time: "09:00",
                  scheduled_end_time: "18:00",
                  checked_in_at: "2026-03-22T02:15:00.000Z",
                  checked_out_at: null,
                  arrival_status: "LATE",
                  departure_status: "PENDING",
                  late_minutes: 15,
                  early_arrival_minutes: 0,
                  overtime_minutes: 0,
                  early_leave_minutes: 0,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            range_start: "2026-03-22",
            range_end: "2026-03-22",
            summary_rows: [
              {
                user_id: 10,
                username: "cashier1",
                full_name: "Pim Counter",
                role: "CASHIER",
                checked_in_days: 1,
                checked_out_days: 0,
                late_minutes_total: 15,
                early_arrival_minutes_total: 0,
                summary_status: "LATE",
                latest_work_date: "2026-03-22",
                latest_checked_in_at: "2026-03-22T02:15:00.000Z",
                latest_checked_out_at: null,
              },
            ],
            filtered_attendance_rows: [
              {
                attendance_id: 101,
                user_id: 10,
                username: "cashier1",
                full_name: "Pim Counter",
                role: "CASHIER",
                work_date: "2026-03-22",
                scheduled_start_time: "09:00",
                scheduled_end_time: "18:00",
                checked_in_at: "2026-03-22T02:15:00.000Z",
                checked_out_at: null,
                arrival_status: "LATE",
                departure_status: "PENDING",
                late_minutes: 15,
                early_arrival_minutes: 0,
                overtime_minutes: 0,
                early_leave_minutes: 0,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as typeof fetch;

    renderWithProviders(<AdminAttendancePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "พนักงานที่เข้างาน วันนี้ กี่โมง ออกกี่โมง สายเท่าไหร่" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText("Pim Counter").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/15 นาที/).length).toBeGreaterThan(0);
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it("blocks non-owner access to the dedicated owner attendance page", async () => {
    seedMockSession({
      session: {
        user_id: 2,
        username: "admin",
        full_name: "Mint Admin",
        role: "ADMIN",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<AdminAttendancePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "บทบาทของคุณยังเข้าใช้งานหน้านี้ไม่ได้" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "กลับไปหน้าภาพรวม" })).toHaveAttribute("href", "/dashboard");
  });
});