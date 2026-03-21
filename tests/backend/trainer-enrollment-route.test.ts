import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH as enrollmentPATCH } from "../../src/app/api/v1/trainers/enrollments/[enrollmentId]/route";

const mockResolveSessionFromRequest = vi.fn();
const mockUpdateTrainingEnrollment = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  updateTrainingEnrollment: (...args: unknown[]) => mockUpdateTrainingEnrollment(...args),
}));

describe("trainer enrollment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH updates enrollment with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateTrainingEnrollment.mockResolvedValue({
      enrollment_id: "e1",
      trainer_id: "t1",
      trainer_name: "สมชาย ยิมเนส",
      customer_name: "ลูกค้าทดสอบ",
      member_id: "m1",
      package_name: "เทรน 10 ครั้ง",
      package_sku: "PT-10",
      started_at: "2026-03-21T00:00:00.000Z",
      expires_at: "2026-04-20T00:00:00.000Z",
      session_limit: 10,
      sessions_remaining: 6,
      price: 4500,
      status: "ACTIVE",
      closed_at: null,
      close_reason: null,
      updated_at: "2026-03-21T02:00:00.000Z",
    });

    const response = await enrollmentPATCH(
      new Request("http://localhost/api/v1/trainers/enrollments/e1", {
        method: "PATCH",
        body: JSON.stringify({ sessions_remaining: 6, status: "ACTIVE" }),
      }),
      { params: Promise.resolve({ enrollmentId: "e1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateTrainingEnrollment).toHaveBeenCalledWith("e1", {
      sessions_remaining: 6,
      status: "ACTIVE",
    });
    expect(body.sessions_remaining).toBe(6);
  });

  it("PATCH returns 400 for invalid remaining sessions", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });

    const response = await enrollmentPATCH(
      new Request("http://localhost/api/v1/trainers/enrollments/e1", {
        method: "PATCH",
        body: JSON.stringify({ sessions_remaining: -1 }),
      }),
      { params: Promise.resolve({ enrollmentId: "e1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await enrollmentPATCH(
      new Request("http://localhost/api/v1/trainers/enrollments/e1", {
        method: "PATCH",
        body: JSON.stringify({ sessions_remaining: 4, status: "ACTIVE" }),
      }),
      { params: Promise.resolve({ enrollmentId: "e1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(mockUpdateTrainingEnrollment).not.toHaveBeenCalled();
  });

  it("PATCH returns 401 for unauthenticated request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await enrollmentPATCH(
      new Request("http://localhost/api/v1/trainers/enrollments/e1", {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      }),
      { params: Promise.resolve({ enrollmentId: "e1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
  });
});