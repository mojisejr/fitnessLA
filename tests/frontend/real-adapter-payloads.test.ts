import { realAppAdapter } from "@/features/adapters/real-app-adapter";
import { clearAuthState } from "@/features/auth/auth-storage";
import type { CreateOrderRequest } from "@/lib/contracts";
import type { CreateAdminUserInput } from "@/features/adapters/types";

const { signInUsernameMock } = vi.hoisted(() => ({
  signInUsernameMock: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      username: signInUsernameMock,
    },
  },
}));

/** Minimal 200 JSON response for fetchJson to parse */
function mockJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("real-app-adapter — request payload shapes", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    clearAuthState();
    signInUsernameMock.mockReset();
    signInUsernameMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Spy on global.fetch and resolve with given body */
  function spyFetch(responseBody: unknown) {
    fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse(responseBody));
    return fetchSpy;
  }

  // ── 2A: Authentication ─────────────────────────────────────────────────

  it("2A-1: authenticateUser signs in with username/password then GETs /api/auth/session", async () => {
    spyFetch({
      user_id: "1",
      username: "admin",
      full_name: "Admin",
      role: "ADMIN",
      active_shift_id: null,
    });

    await realAppAdapter.authenticateUser("admin", "any-password");

    expect(signInUsernameMock).toHaveBeenCalledWith({
      username: "admin",
      password: "any-password",
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/session");
    expect(init.credentials).toBe("include");
  });

  it("2A-2: authenticateUser does NOT send password via fetch body", async () => {
    spyFetch({
      user_id: "1",
      username: "admin",
      full_name: "Admin",
      role: "ADMIN",
      active_shift_id: null,
    });

    await realAppAdapter.authenticateUser("admin", "super-secret-password");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("2A-3: authenticateUser throws INVALID_CREDENTIALS for empty username without fetching", async () => {
    const spy = spyFetch({});

    await expect(
      realAppAdapter.authenticateUser("", "any-password"),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

    expect(spy).not.toHaveBeenCalled();
  });

  // ── 2B: Shift Operations ───────────────────────────────────────────────

  it("2B-4: openShift POSTs /api/v1/shifts/open with starting_cash and responsible_name", async () => {
    spyFetch({ shift_id: "101", opened_at: "2026-03-10T08:00:00Z" });

    await realAppAdapter.openShift(500, "Pim Counter");

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/shifts/open");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ starting_cash: 500, responsible_name: "Pim Counter" });
  });

  it("2B-5: closeShift POSTs /api/v1/shifts/close with actual_cash and responsible_name", async () => {
    spyFetch({
      shift_id: "101",
      expected_cash: 2000,
      actual_cash: 2100,
      difference: 100,
      status: "CLOSED",
      journal_entry_id: "je-1",
    });

    await realAppAdapter.closeShift({
      activeShift: {
        shift_id: "101",
        opened_at: "2026-03-10T08:00:00Z",
        starting_cash: 500,
      },
      actualCash: 2100,
      responsibleName: "Pim Counter",
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/shifts/close");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ actual_cash: 2100, closing_note: undefined, responsible_name: "Pim Counter" });
  });

  // ── 2C: Orders ─────────────────────────────────────────────────────────

  it("2C-6: createOrder body contains shift_id, items, and payment_method", async () => {
    spyFetch({
      order_id: "ord-1",
      order_number: "ORD001",
      total_amount: 100,
      tax_doc_number: "TAX001",
      status: "COMPLETED",
    });

    const request: CreateOrderRequest = {
      shift_id: "101",
      items: [{ product_id: "p-1", quantity: 2 }],
      payment_method: "CASH",
    };
    await realAppAdapter.createOrder(request);

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toHaveProperty("shift_id");
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("payment_method");
  });

  it("2C-7: createOrder sets Content-Type: application/json header", async () => {
    spyFetch({
      order_id: "ord-1",
      order_number: "ORD001",
      total_amount: 100,
      tax_doc_number: "TAX001",
      status: "COMPLETED",
    });

    await realAppAdapter.createOrder({
      shift_id: "101",
      items: [{ product_id: "p-1", quantity: 1 }],
      payment_method: "PROMPTPAY",
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("2C-7b: listMembers GETs the members endpoint with credentials included", async () => {
    spyFetch([]);

    await realAppAdapter.listMembers();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/members");
    expect(init.credentials).toBe("include");
  });

  // ── 2D: Expenses ───────────────────────────────────────────────────────

  it("2D-8: createExpense with file sends FormData with receipt_file field", async () => {
    spyFetch({ expense_id: "exp-1", status: "POSTED" });

    const file = new File(["receipt data"], "receipt.jpg", {
      type: "image/jpeg",
    });
    await realAppAdapter.createExpense({
      shift_id: "101",
      account_id: "acc-1",
      amount: 200,
      description: "Stationery",
      receiptName: "receipt.jpg",
      receiptFile: file,
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;
    expect(formData.get("shift_id")).toBe("101");
    expect(formData.get("account_id")).toBe("acc-1");
    expect(formData.get("amount")).toBe("200");
    expect(formData.get("description")).toBe("Stationery");
    expect(formData.get("receipt_file")).toBeInstanceOf(File);
    expect(formData.get("receipt_url")).toBeNull();
  });

  it("2D-9: createExpense without file sends FormData with receipt_url field", async () => {
    spyFetch({ expense_id: "exp-2", status: "POSTED" });

    await realAppAdapter.createExpense({
      shift_id: "101",
      account_id: "acc-1",
      amount: 150,
      description: "Parking",
      receiptName: "https://cdn.example.com/parking-receipt.pdf",
      receiptFile: null,
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const formData = init.body as FormData;
    expect(formData.get("receipt_url")).toBe(
      "https://cdn.example.com/parking-receipt.pdf",
    );
    expect(formData.get("receipt_file")).toBeNull();
  });

  it("2D-10: createExpense does NOT set Content-Type header (browser auto-sets multipart boundary)", async () => {
    spyFetch({ expense_id: "exp-3", status: "POSTED" });

    await realAppAdapter.createExpense({
      shift_id: "101",
      account_id: "acc-1",
      amount: 100,
      description: "Misc",
      receiptName: "misc.png",
      receiptFile: null,
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has("content-type")).toBe(false);
  });

  // ── 2E: Report & Admin ──────────────────────────────────────────────────

  it("2E-11: getDailySummary GETs correct URL with date query param", async () => {
    spyFetch({
      total_sales: 0,
      sales_by_method: { CASH: 0, PROMPTPAY: 0, CREDIT_CARD: 0 },
      total_expenses: 0,
      net_cash_flow: 0,
      shift_discrepancies: 0,
    });

    await realAppAdapter.getDailySummary({ period: "DAY", date: "2026-03-10" });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/reports/daily-summary?period=DAY&date=2026-03-10");
  });

  it("2E-12: createAdminUser POSTs /api/v1/admin/users with full_name, username, email, role", async () => {
    spyFetch({
      user_id: "new-1",
      username: "jsmith",
      full_name: "John Smith",
      email: "jsmith@example.com",
      role: "CASHIER",
    });

    const input: CreateAdminUserInput = {
      full_name: "John Smith",
      username: "jsmith",
      email: "jsmith@example.com",
      role: "CASHIER",
    };
    await realAppAdapter.createAdminUser(input);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/admin/users");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      full_name: "John Smith",
      username: "jsmith",
      email: "jsmith@example.com",
      role: "CASHIER",
    });
  });
});
