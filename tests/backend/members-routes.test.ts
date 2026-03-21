import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as membersGET } from "../../src/app/api/v1/members/route";
import { DELETE as memberDELETE, PATCH as memberPATCH } from "../../src/app/api/v1/members/[memberId]/route";
import { POST as memberRenewPOST } from "../../src/app/api/v1/members/[memberId]/renew/route";
import { POST as memberRestartPOST } from "../../src/app/api/v1/members/[memberId]/restart/route";
import { PATCH as memberToggleActivePATCH } from "../../src/app/api/v1/members/[memberId]/toggle-active/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListMembers = vi.fn();
const mockRenewMember = vi.fn();
const mockRestartMember = vi.fn();
const mockToggleMemberActive = vi.fn();
const mockUpdateMemberDates = vi.fn();
const mockDeleteMember = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listMembers: (...args: unknown[]) => mockListMembers(...args),
  updateMemberDates: (...args: unknown[]) => mockUpdateMemberDates(...args),
  deleteMember: (...args: unknown[]) => mockDeleteMember(...args),
  renewMember: (...args: unknown[]) => mockRenewMember(...args),
  restartMember: (...args: unknown[]) => mockRestartMember(...args),
  toggleMemberActive: (...args: unknown[]) => mockToggleMemberActive(...args),
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
        is_active: true,
        membership_product_id: "p1",
        membership_name: "Monthly Pass",
        membership_period: "MONTHLY",
        started_at: "2026-03-01T00:00:00.000Z",
        expires_at: "2026-03-31T23:59:59.000Z",
        checked_in_at: null,
        renewed_at: null,
        renewal_status: "ACTIVE",
        renewal_method: "NONE",
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
    expect(body).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
    });
    expect(mockListMembers).toHaveBeenCalledTimes(2);
  });

  it("GET /members retries once and returns 200 after transient failure", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListMembers
      .mockRejectedValueOnce(new Error("temporary database hiccup"))
      .mockResolvedValueOnce([
        {
          member_id: "m1",
          member_code: "MEM-0001",
          full_name: "สมชาย ทดสอบ",
          phone: "0812345678",
          is_active: true,
          membership_product_id: "p1",
          membership_name: "Monthly Pass",
          membership_period: "MONTHLY",
          started_at: "2026-03-01T00:00:00.000Z",
          expires_at: "2026-03-31T23:59:59.000Z",
          checked_in_at: null,
          renewed_at: null,
          renewal_status: "ACTIVE",
          renewal_method: "NONE",
        },
      ]);

    const response = await membersGET(new Request("http://localhost/api/v1/members"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]?.full_name).toBe("สมชาย ทดสอบ");
    expect(mockListMembers).toHaveBeenCalledTimes(2);
  });

  it("POST /members/:memberId/renew returns renewed member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockRenewMember.mockResolvedValue({
      member_id: "m1",
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      phone: "0812345678",
      is_active: true,
      membership_product_id: "p1",
      membership_name: "Monthly Pass",
      membership_period: "MONTHLY",
      started_at: "2026-04-01T00:00:00.000Z",
      expires_at: "2026-04-30T23:59:59.000Z",
      checked_in_at: null,
      renewed_at: "2026-03-20T10:00:00.000Z",
      renewal_status: "RENEWED",
      renewal_method: "EXTEND_FROM_PREVIOUS_END",
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
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockRestartMember.mockResolvedValue({
      member_id: "m1",
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      phone: "0812345678",
      is_active: true,
      membership_product_id: "p1",
      membership_name: "Monthly Pass",
      membership_period: "MONTHLY",
      started_at: "2026-03-20T00:00:00.000Z",
      expires_at: "2026-04-19T23:59:59.000Z",
      checked_in_at: null,
      renewed_at: "2026-03-20T10:00:00.000Z",
      renewal_status: "ACTIVE",
      renewal_method: "RESTART_FROM_NEW_START",
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
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockRenewMember.mockRejectedValue(new Error("MEMBER_NOT_FOUND"));

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/unknown/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "unknown" }) },
    );

    expect(response.status).toBe(404);
  });

  it("POST /members/:memberId/renew returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/m1/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับต่ออายุสมาชิก",
    });
    expect(mockRenewMember).not.toHaveBeenCalled();
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
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
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

  it("POST /members/:memberId/renew returns 409 for inactive member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockRenewMember.mockRejectedValue(new Error("MEMBER_INACTIVE"));

    const response = await memberRenewPOST(
      new Request("http://localhost/api/v1/members/m1/renew", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      code: "MEMBER_INACTIVE",
      message: "สมาชิกที่ปิดใช้งานไม่สามารถต่ออายุได้",
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

  it("POST /members/:memberId/restart returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/m1/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับเริ่มรอบสมาชิกใหม่",
    });
    expect(mockRestartMember).not.toHaveBeenCalled();
  });

  it("POST /members/:memberId/restart returns 404 for unknown member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockRestartMember.mockRejectedValue(new Error("MEMBER_NOT_FOUND"));

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/unknown/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "unknown" }) },
    );

    expect(response.status).toBe(404);
  });

  it("POST /members/:memberId/restart returns 500 for unexpected service failure", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
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

  it("POST /members/:memberId/restart returns 409 for inactive member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockRestartMember.mockRejectedValue(new Error("MEMBER_INACTIVE"));

    const response = await memberRestartPOST(
      new Request("http://localhost/api/v1/members/m1/restart", { method: "POST" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      code: "MEMBER_INACTIVE",
      message: "สมาชิกที่ปิดใช้งานไม่สามารถเริ่มรอบใหม่ได้",
    });
  });

  it("PATCH /members/:memberId/toggle-active returns toggled member", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockToggleMemberActive.mockResolvedValue({
      member_id: "m1",
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      phone: "0812345678",
      is_active: false,
      membership_product_id: "p1",
      membership_name: "Monthly Pass",
      membership_period: "MONTHLY",
      started_at: "2026-03-01T00:00:00.000Z",
      expires_at: "2026-03-31T23:59:59.000Z",
      checked_in_at: null,
      renewed_at: null,
      renewal_status: "ACTIVE",
      renewal_method: "NONE",
    });

    const response = await memberToggleActivePATCH(
      new Request("http://localhost/api/v1/members/m1/toggle-active", { method: "PATCH" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ member_id: "m1", is_active: false });
    expect(mockToggleMemberActive).toHaveBeenCalledWith("m1");
  });

  it("PATCH /members/:memberId/toggle-active returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await memberToggleActivePATCH(
      new Request("http://localhost/api/v1/members/m1/toggle-active", { method: "PATCH" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับปรับสถานะสมาชิก",
    });
    expect(mockToggleMemberActive).not.toHaveBeenCalled();
  });

  it("PATCH /members/:memberId/toggle-active returns 404 when member is missing", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockToggleMemberActive.mockRejectedValue(new Error("MEMBER_NOT_FOUND"));

    const response = await memberToggleActivePATCH(
      new Request("http://localhost/api/v1/members/unknown/toggle-active", { method: "PATCH" }),
      { params: Promise.resolve({ memberId: "unknown" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      code: "MEMBER_NOT_FOUND",
      message: "ไม่พบสมาชิกที่ต้องการปรับสถานะ",
    });
  });

  it("PATCH /members/:memberId updates member dates for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateMemberDates.mockResolvedValue({
      member_id: "m1",
      member_code: "MEM-0001",
      full_name: "สมชาย ทดสอบ",
      phone: "0812345678",
      is_active: true,
      membership_product_id: "p1",
      membership_name: "Monthly Pass",
      membership_period: "MONTHLY",
      started_at: "2026-03-20T09:00:00.000Z",
      expires_at: "2026-04-20T18:00:00.000Z",
      checked_in_at: null,
      renewed_at: null,
      renewal_status: "ACTIVE",
      renewal_method: "NONE",
    });

    const response = await memberPATCH(
      new Request("http://localhost/api/v1/members/m1", {
        method: "PATCH",
        body: JSON.stringify({
          started_at: "2026-03-20T09:00:00.000Z",
          expires_at: "2026-04-20T18:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      member_id: "m1",
      started_at: "2026-03-20T09:00:00.000Z",
      expires_at: "2026-04-20T18:00:00.000Z",
    });
    expect(mockUpdateMemberDates).toHaveBeenCalledWith("m1", {
      started_at: "2026-03-20T09:00:00.000Z",
      expires_at: "2026-04-20T18:00:00.000Z",
    });
  });

  it("PATCH /members/:memberId returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await memberPATCH(
      new Request("http://localhost/api/v1/members/m1", {
        method: "PATCH",
        body: JSON.stringify({
          started_at: "2026-03-20T09:00:00.000Z",
          expires_at: "2026-04-20T18:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับแก้ไขข้อมูลสมาชิก",
    });
    expect(mockUpdateMemberDates).not.toHaveBeenCalled();
  });

  it("PATCH /members/:memberId returns 400 for invalid dates", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateMemberDates.mockRejectedValue(new Error("EXPIRES_BEFORE_START"));

    const response = await memberPATCH(
      new Request("http://localhost/api/v1/members/m1", {
        method: "PATCH",
        body: JSON.stringify({
          started_at: "2026-04-20T18:00:00.000Z",
          expires_at: "2026-03-20T09:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      code: "EXPIRES_BEFORE_START",
      message: "วันหมดอายุต้องมาหลังวันเริ่มต้น",
    });
  });

  it("DELETE /members/:memberId deletes member for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockDeleteMember.mockResolvedValue({
      member_id: "m1",
      full_name: "สมชาย ทดสอบ",
    });

    const response = await memberDELETE(
      new Request("http://localhost/api/v1/members/m1", { method: "DELETE" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      member_id: "m1",
      full_name: "สมชาย ทดสอบ",
    });
    expect(mockDeleteMember).toHaveBeenCalledWith("m1");
  });

  it("DELETE /members/:memberId returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await memberDELETE(
      new Request("http://localhost/api/v1/members/m1", { method: "DELETE" }),
      { params: Promise.resolve({ memberId: "m1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับลบสมาชิก",
    });
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });

  it("DELETE /members/:memberId returns 404 when member is missing", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockDeleteMember.mockRejectedValue(new Error("MEMBER_NOT_FOUND"));

    const response = await memberDELETE(
      new Request("http://localhost/api/v1/members/unknown", { method: "DELETE" }),
      { params: Promise.resolve({ memberId: "unknown" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      code: "MEMBER_NOT_FOUND",
      message: "ไม่พบสมาชิกที่ต้องการลบ",
    });
  });
});
