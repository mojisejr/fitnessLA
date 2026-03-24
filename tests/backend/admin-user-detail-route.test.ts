import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as adminUserDelete } from "../../src/app/api/v1/admin/users/[userId]/route";

const mockResolveSessionFromRequest = vi.fn();
const mockDeleteManagedUser = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/staff/services", () => ({
  deleteManagedUser: (...args: unknown[]) => mockDeleteManagedUser(...args),
  updateManagedUserSettings: vi.fn(),
}));

describe("admin user detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DELETE removes a managed user for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });
    mockDeleteManagedUser.mockResolvedValue({
      user_id: "user-1",
      full_name: "Cashier One",
      username: "cashier.one",
      role: "CASHIER",
    });

    const response = await adminUserDelete(
      new Request("http://localhost/api/v1/admin/users/user-1", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "user-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      user_id: "user-1",
      username: "cashier.one",
    });
  });

  it("DELETE rejects non-owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "admin-1", role: "ADMIN" });

    const response = await adminUserDelete(
      new Request("http://localhost/api/v1/admin/users/user-1", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "user-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(mockDeleteManagedUser).not.toHaveBeenCalled();
  });
});