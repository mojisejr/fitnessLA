import { describe, expect, it } from "vitest";

import {
  canAccessPosProductInventory,
  canDecreaseProductStock,
  canDeleteProducts,
  canManageProducts,
  canManageUsers,
  toAppRole,
} from "../../src/lib/roles";

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

  it("only allows owner and admin to manage POS products", () => {
    expect(canManageProducts("OWNER")).toBe(true);
    expect(canManageProducts("ADMIN")).toBe(true);
    expect(canManageProducts("CASHIER")).toBe(false);
    expect(canManageProducts("staff")).toBe(false);
  });

  it("allows cashier to access POS inventory but not destructive product actions", () => {
    expect(canAccessPosProductInventory("OWNER")).toBe(true);
    expect(canAccessPosProductInventory("ADMIN")).toBe(true);
    expect(canAccessPosProductInventory("CASHIER")).toBe(true);
    expect(canDeleteProducts("OWNER")).toBe(true);
    expect(canDeleteProducts("ADMIN")).toBe(false);
    expect(canDecreaseProductStock("OWNER")).toBe(true);
    expect(canDecreaseProductStock("CASHIER")).toBe(false);
  });
});
