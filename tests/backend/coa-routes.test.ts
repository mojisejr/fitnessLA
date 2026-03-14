import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as coaGET, POST as coaPOST } from "../../src/app/api/v1/coa/route";
import { PATCH as coaTogglePATCH } from "../../src/app/api/v1/coa/[accountId]/toggle/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListChartOfAccounts = vi.fn();
const mockCreateChartOfAccount = vi.fn();
const mockToggleChartOfAccount = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listChartOfAccounts: (...args: unknown[]) => mockListChartOfAccounts(...args),
  createChartOfAccount: (...args: unknown[]) => mockCreateChartOfAccount(...args),
  toggleChartOfAccount: (...args: unknown[]) => mockToggleChartOfAccount(...args),
}));

describe("phase 2 coa routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns coa list with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListChartOfAccounts.mockResolvedValue([
      {
        account_id: "coa_1",
        account_code: "4101",
        account_name: "Membership Revenue",
        account_type: "REVENUE",
        is_active: true,
      },
    ]);

    const response = await coaGET(new Request("http://localhost/api/v1/coa"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0]).toMatchObject({
      account_code: "4101",
      account_type: "REVENUE",
    });
  });

  it("creates account with 201", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockCreateChartOfAccount.mockResolvedValue({
      account_id: "coa_2",
      account_code: "5209",
      account_name: "Utilities Expense",
      account_type: "EXPENSE",
      is_active: true,
    });

    const response = await coaPOST(
      new Request("http://localhost/api/v1/coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_code: "5209",
          account_name: "Utilities Expense",
          account_type: "EXPENSE",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      account_id: "coa_2",
      account_code: "5209",
    });
  });

  it("returns 403 when cashier creates account", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });

    const response = await coaPOST(
      new Request("http://localhost/api/v1/coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_code: "5209",
          account_name: "Utilities Expense",
          account_type: "EXPENSE",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid create payload", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });

    const response = await coaPOST(
      new Request("http://localhost/api/v1/coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_code: "52",
          account_name: "x",
          account_type: "EXPENSE",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("toggles account status with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockToggleChartOfAccount.mockResolvedValue({
      account_id: "coa_3",
      account_code: "5201",
      account_name: "Cleaning Supplies",
      account_type: "EXPENSE",
      is_active: false,
    });

    const response = await coaTogglePATCH(
      new Request("http://localhost/api/v1/coa/coa_3/toggle", {
        method: "PATCH",
      }),
      {
        params: Promise.resolve({ accountId: "coa_3" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      account_id: "coa_3",
      is_active: false,
    });
  });

  it("returns 409 when account is locked", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockToggleChartOfAccount.mockRejectedValue(new Error("ACCOUNT_LOCKED"));

    const response = await coaTogglePATCH(
      new Request("http://localhost/api/v1/coa/coa_3/toggle", {
        method: "PATCH",
      }),
      {
        params: Promise.resolve({ accountId: "coa_3" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("ACCOUNT_LOCKED");
  });
});
