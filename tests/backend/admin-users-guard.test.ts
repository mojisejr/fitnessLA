import { describe, expect, it } from "vitest";

import { canManageUsers, toAppRole } from "../../src/lib/roles";

describe("admin users role guard", () => {
  it("accepts OWNER and ADMIN", () => {
    expect(canManageUsers("OWNER")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(true);
  });

  it("rejects CASHIER and unknown roles", () => {
    expect(canManageUsers("CASHIER")).toBe(false);
    expect(canManageUsers("staff")).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });

  it("normalizes role values from header", () => {
    expect(toAppRole("owner")).toBe("OWNER");
    expect(toAppRole("Admin")).toBe("ADMIN");
    expect(toAppRole("cashier")).toBe("CASHIER");
  });
});
