import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as enrollmentDELETE,
  PATCH as enrollmentPATCH,
} from "../../src/app/api/v1/trainers/enrollments/[enrollmentId]/route";
import { POST as enrollmentBulkDeletePOST } from "../../src/app/api/v1/trainers/enrollments/bulk-delete/route";

const mockResolveSessionFromRequest = vi.fn();
const mockUpdateTrainingEnrollment = vi.fn();
const mockDeleteTrainingEnrollment = vi.fn();
const mockDeleteTrainingEnrollments = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  updateTrainingEnrollment: (...args: unknown[]) => mockUpdateTrainingEnrollment(...args),
  deleteTrainingEnrollment: (...args: unknown[]) => mockDeleteTrainingEnrollment(...args),
  deleteTrainingEnrollments: (...args: unknown[]) => mockDeleteTrainingEnrollments(...args),
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
    expect(mockUpdateTrainingEnrollment).toHaveBeenCalledWith(
      "e1",
      {
        sessions_remaining: 6,
        status: "ACTIVE",
        schedule_entries: undefined,
      },
      {
        actor_role: "OWNER",
        actor_trainer_id: null,
      },
    );
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

  it("DELETE removes enrollment with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockDeleteTrainingEnrollment.mockResolvedValue({
      enrollment_id: "e1",
      customer_name: "ลูกค้าทดสอบ",
      package_name: "เทรน 10 ครั้ง",
    });

    const response = await enrollmentDELETE(
      new Request("http://localhost/api/v1/trainers/enrollments/e1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ enrollmentId: "e1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockDeleteTrainingEnrollment).toHaveBeenCalledWith("e1");
    expect(body).toEqual({
      enrollment_id: "e1",
      customer_name: "ลูกค้าทดสอบ",
      package_name: "เทรน 10 ครั้ง",
    });
  });

  it("DELETE returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await enrollmentDELETE(
      new Request("http://localhost/api/v1/trainers/enrollments/e1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ enrollmentId: "e1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(mockDeleteTrainingEnrollment).not.toHaveBeenCalled();
  });

  it("POST bulk-delete removes selected enrollments with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockDeleteTrainingEnrollments.mockResolvedValue({
      deleted_count: 2,
      deleted_enrollments: [
        { enrollment_id: "e1", customer_name: "ลูกค้าทดสอบ", package_name: "เทรน 10 ครั้ง" },
        { enrollment_id: "e2", customer_name: "ลูกค้าอีกคน", package_name: "เทรน 20 ครั้ง" },
      ],
    });

    const response = await enrollmentBulkDeletePOST(
      new Request("http://localhost/api/v1/trainers/enrollments/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ enrollment_ids: ["e1", "e2"] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockDeleteTrainingEnrollments).toHaveBeenCalledWith(["e1", "e2"]);
    expect(body.deleted_count).toBe(2);
  });

  it("POST bulk-delete returns 400 when no enrollment ids are provided", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });

    const response = await enrollmentBulkDeletePOST(
      new Request("http://localhost/api/v1/trainers/enrollments/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ enrollment_ids: [] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(mockDeleteTrainingEnrollments).not.toHaveBeenCalled();
  });
});