import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as adminUsersBulkDeletePOST } from "../../src/app/api/v1/admin/users/bulk-delete/route";

const mockResolveSessionFromRequest = vi.fn();
const mockDeleteManagedUsers = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/staff/services", () => ({
  deleteManagedUsers: (...args: unknown[]) => mockDeleteManagedUsers(...args),
}));

describe("admin users bulk delete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST bulk-delete removes selected users for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });
    mockDeleteManagedUsers.mockResolvedValue({
      deleted_count: 2,
      deleted_users: [
        { user_id: "user-1", full_name: "Cashier One", username: "cashier.one", role: "CASHIER" },
        { user_id: "user-2", full_name: "Admin Two", username: "admin.two", role: "ADMIN" },
      ],
    });

    const response = await adminUsersBulkDeletePOST(
      new Request("http://localhost/api/v1/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: ["user-1", "user-2"] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deleted_count).toBe(2);
    expect(mockDeleteManagedUsers).toHaveBeenCalledWith(["user-1", "user-2"]);
  });

  it("POST bulk-delete validates empty request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "owner-1", role: "OWNER" });

    const response = await adminUsersBulkDeletePOST(
      new Request("http://localhost/api/v1/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});