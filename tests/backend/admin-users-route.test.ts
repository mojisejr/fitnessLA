import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as adminUsersPOST } from "../../src/app/api/v1/admin/users/route";

const mockResolveSessionFromRequest = vi.fn();
const mockHashPassword = vi.fn();
const mockUserCreate = vi.fn();
const mockAccountCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("better-auth/crypto", () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}));

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe("admin users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: { create: mockUserCreate },
        account: { create: mockAccountCreate },
      }),
    );
  });

  it("POST /admin/users creates a login-ready user for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockHashPassword.mockResolvedValue("hashed-password");
    mockUserCreate.mockResolvedValue({
      id: "user-1",
      username: "smoke.owner.user",
      phone: "0812345678",
      name: "Smoke Owner User",
      email: "smoke.owner.user@fitnessla.local",
      role: "CASHIER",
    });
    mockAccountCreate.mockResolvedValue({ id: "acc-1" });

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
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockHashPassword).toHaveBeenCalledWith("SmokePass123!");
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: "smoke.owner.user",
          phone: "0812345678",
          name: "Smoke Owner User",
          email: "smoke.owner.user@fitnessla.local",
          role: "CASHIER",
          emailVerified: true,
          isActive: true,
        }),
      }),
    );
    expect(mockAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: "user-1",
          providerId: "credential",
          userId: "user-1",
          password: "hashed-password",
        }),
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
    expect(mockHashPassword).not.toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled();
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
    expect(mockHashPassword).not.toHaveBeenCalled();
  });
});