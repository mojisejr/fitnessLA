import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as membersSpecialPOST } from "../../src/app/api/v1/members/special/route";

const mockResolveSessionFromRequest = vi.fn();
const mockCreateSpecialMember = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  createSpecialMember: (...args: unknown[]) => mockCreateSpecialMember(...args),
}));

describe("members special route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /members/special creates member for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockCreateSpecialMember.mockResolvedValue({ member_id: "m9", full_name: "สมาชิกพิเศษ" });

    const response = await membersSpecialPOST(
      new Request("http://localhost/api/v1/members/special", {
        method: "POST",
        body: JSON.stringify({
          full_name: "สมาชิกพิเศษ",
          phone: "0800000000",
          membership_name: "VIP 1 เดือน",
          membership_period: "MONTHLY",
          started_at: "2026-03-21T00:00:00.000Z",
          expires_at: "2026-04-20T23:59:59.000Z",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateSpecialMember).toHaveBeenCalledTimes(1);
  });

  it("POST /members/special returns 403 for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await membersSpecialPOST(
      new Request("http://localhost/api/v1/members/special", {
        method: "POST",
        body: JSON.stringify({
          full_name: "สมาชิกพิเศษ",
          membership_name: "VIP 1 เดือน",
          membership_period: "MONTHLY",
          started_at: "2026-03-21T00:00:00.000Z",
          expires_at: "2026-04-20T23:59:59.000Z",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: "FORBIDDEN",
      message: "สิทธิ์ไม่เพียงพอสำหรับการเพิ่มสมาชิกพิเศษ",
    });
    expect(mockCreateSpecialMember).not.toHaveBeenCalled();
  });
});