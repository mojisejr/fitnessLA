import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as membersGET } from "../../src/app/api/v1/members/route";
import { POST as memberRenewPOST } from "../../src/app/api/v1/members/[memberId]/renew/route";
import { POST as memberRestartPOST } from "../../src/app/api/v1/members/[memberId]/restart/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListMembers = vi.fn();
const mockRenewMember = vi.fn();
const mockRestartMember = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listMembers: (...args: unknown[]) => mockListMembers(...args),
  renewMember: (...args: unknown[]) => mockRenewMember(...args),
  restartMember: (...args: unknown[]) => mockRestartMember(...args),
}));

describe("members routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /members returns list with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListMembers.mockResolvedValue([
      {
        member_id: "m1",
        member_code: "MEM-0001",
        full_name: "สมชาย ทดสอบ",
        phone: "0812345678",
        membership_product_id: "p1",
        membership_name: "Monthly Pass",
        membership_period: "MONTHLY",
        started_at: "2026-03-01T00:00:00.000Z",
        expires_at: "2026-03-31T23:59:59.000Z",
        checked_in_at: null,
        renewed_at: null,
        renewal_status: "ACTIVE",
      },
    ]);

    const response = await membersGET(new Request("http://localhost/api/v1/members"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      renewal_status: "ACTIVE",
    });
  });

  it("GET /members returns 401 for unauthenticated request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await membersGET(new Request("http://localhost/api/v1/members"));
    expect(response.status).toBe(401);
  });

  it("GET /members returns JSON 500 when listMembers fails", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListMembers.mockRejectedValue(new Error("database offline"));

    const response = await membersGET(new Request("http://localhost/api/v1/members"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
    });
  });

  it("POST /members/:memberId/renew returns renewed member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockRenewMember.mockResolvedValue({
      member_id: "m1",
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      phone: "0812345678",
      membership_product_id: "p1",
      membership_name: "Monthly Pass",
      membership_period: "MONTHLY",
      started_at: "2026-04-01T00:00:00.000Z",
      expires_at: "2026-04-30T23:59:59.000Z",
      checked_in_at: null,
      renewed_at: "2026-03-20T10:00:00.000Z",
      renewal_status: "RENEWED",
    });

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/m1/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      member_id: "m1",
      renewal_status: "RENEWED",
    });
    expect(mockRenewMember).toHaveBeenCalledWith("m1");
  });

  it("POST /members/:memberId/restart returns restarted member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockRestartMember.mockResolvedValue({
      member_id: "m1",
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      phone: "0812345678",
      membership_product_id: "p1",
      membership_name: "Monthly Pass",
      membership_period: "MONTHLY",
      started_at: "2026-03-20T00:00:00.000Z",
      expires_at: "2026-04-19T23:59:59.000Z",
      checked_in_at: null,
      renewed_at: "2026-03-20T10:00:00.000Z",
      renewal_status: "ACTIVE",
    });

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/m1/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      member_id: "m1",
      renewal_status: "ACTIVE",
    });
    expect(mockRestartMember).toHaveBeenCalledWith("m1");
  });

  it("POST /members/:memberId/renew returns 404 for unknown member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockRenewMember.mockRejectedValue(new Error("MEMBER_NOT_FOUND"));

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/unknown/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "unknown" }) },
    );

    expect(response.status).toBe(404);
  });

  it("POST /members/:memberId/renew returns 401 for unauthenticated request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/m1/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("POST /members/:memberId/renew returns 500 for unexpected service failure", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockRenewMember.mockRejectedValue(new Error("database offline"));

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/m1/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถต่ออายุสมาชิกได้",
    });
  });

  it("POST /members/:memberId/restart returns 401 for unauthenticated request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/m1/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("POST /members/:memberId/restart returns 404 for unknown member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockRestartMember.mockRejectedValue(new Error("MEMBER_NOT_FOUND"));

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/unknown/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "unknown" }) },
    );

    expect(response.status).toBe(404);
  });

  it("POST /members/:memberId/restart returns 500 for unexpected service failure", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockRestartMember.mockRejectedValue(new Error("database offline"));

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/m1/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถเริ่มรอบสมาชิกใหม่ได้",
    });
  });
});
