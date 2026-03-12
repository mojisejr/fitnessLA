import { realAppAdapter } from "@/features/adapters/real-app-adapter";
import { clearAuthState } from "@/features/auth/auth-storage";
import type { CreateOrderRequest } from "@/lib/contracts";

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

/**
 * Phase 4: Response Shape Alignment Tests
 *
 * Goal: Mock `fetch` ให้คืน response body ตาม API Contract ของ Agent A
 * และยืนยันว่า real adapter map response กลับมาได้ครบทุก field
 * (ป้องกัน silent field-drift เมื่อ Backend เปลี่ยน)
 */
describe("real-app-adapter — response shape alignment", () => {
  function mockFetchOk(body: unknown): void {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  function mockFetchError(status: number, body: unknown): void {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  function mockFetchNonJson(status: number): void {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Internal Server Error", {
        status,
        headers: { "Content-Type": "text/plain" },
      }),
    );
  }

  beforeEach(() => {
    clearAuthState();
    signInUsernameMock.mockReset();
    signInUsernameMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 4A: ShiftCloseResult ────────────────────────────────────────────────

  it("4A-1: closeShift returns all ShiftCloseResult fields", async () => {
    const mockResponse = {
      shift_id: "201",
      expected_cash: 2000,
      actual_cash: 2100,
      difference: 100,
      status: "CLOSED",
      journal_entry_id: "JE-001",
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.closeShift({
      activeShift: { shift_id: "201", opened_at: "2026-03-10T08:00:00Z", starting_cash: 500 },
      actualCash: 2100,
    });

    expect(result.shift_id).toBe("201");
    expect(result.expected_cash).toBe(2000);
    expect(result.actual_cash).toBe(2100);
    expect(result.difference).toBe(100);
    expect(result.status).toBe("CLOSED");
    expect(result.journal_entry_id).toBe("JE-001");
  });

  it("4A-2: closeShift handles negative difference (cash shortage)", async () => {
    const mockResponse = {
      shift_id: "202",
      expected_cash: 2000,
      actual_cash: 1850,
      difference: -150,
      status: "CLOSED",
      journal_entry_id: "JE-002",
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.closeShift({
      activeShift: { shift_id: "202", opened_at: "2026-03-10T08:00:00Z", starting_cash: 500 },
      actualCash: 1850,
    });

    expect(result.difference).toBe(-150);
    expect(result.actual_cash).toBe(1850);
  });

  // ── 4B: DailySummary ───────────────────────────────────────────────────

  it("4B-3: getDailySummary returns full DailySummary shape", async () => {
    const mockResponse = {
      total_sales: 15000,
      sales_by_method: {
        CASH: 8000,
        PROMPTPAY: 5000,
        CREDIT_CARD: 2000,
      },
      total_expenses: 1200,
      net_cash_flow: 13800,
      shift_discrepancies: -50,
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.getDailySummary("2026-03-10");

    expect(result.total_sales).toBe(15000);
    expect(result.sales_by_method.CASH).toBe(8000);
    expect(result.sales_by_method.PROMPTPAY).toBe(5000);
    expect(result.sales_by_method.CREDIT_CARD).toBe(2000);
    expect(result.total_expenses).toBe(1200);
    expect(result.net_cash_flow).toBe(13800);
    expect(result.shift_discrepancies).toBe(-50);
  });

  // ── 4C: OrderResult ────────────────────────────────────────────────────

  it("4C-4: createOrder returns full OrderResult shape", async () => {
    const mockResponse = {
      order_id: "ORD-001",
      order_number: "20260310-001",
      total_amount: 350,
      tax_doc_number: "TAX-20260310-001",
      status: "COMPLETED",
    };
    mockFetchOk(mockResponse);

    const request: CreateOrderRequest = {
      shift_id: "301",
      items: [{ product_id: "P001", quantity: 1 }],
      payment_method: "CASH",
    };

    const result = await realAppAdapter.createOrder(request);

    expect(result.order_id).toBe("ORD-001");
    expect(result.order_number).toBe("20260310-001");
    expect(result.total_amount).toBe(350);
    expect(result.tax_doc_number).toBe("TAX-20260310-001");
    expect(result.status).toBe("COMPLETED");
  });

  // ── 4D: UserSession ────────────────────────────────────────────────────

  it("4D-5: authenticateUser maps all UserSession fields", async () => {
    const mockResponse = {
      user_id: "U01",
      username: "cashier01",
      full_name: "สมชาย ใจดี",
      role: "CASHIER",
      active_shift_id: "301",
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.authenticateUser("cashier01", "any");

    expect(result.user_id).toBe("U01");
    expect(result.username).toBe("cashier01");
    expect(result.full_name).toBe("สมชาย ใจดี");
    expect(result.role).toBe("CASHIER");
    expect(result.active_shift_id).toBe("301");
  });

  it("4D-6: authenticateUser maps active_shift_id as null (not undefined) when no active shift", async () => {
    const mockResponse = {
      user_id: "U02",
      username: "admin01",
      full_name: "วิชัย บริหาร",
      role: "ADMIN",
      active_shift_id: null,
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.authenticateUser("admin01", "any");

    expect(result.active_shift_id).toBeNull();
    expect(result.active_shift_id).not.toBeUndefined();
  });

  // ── 4E: Error Handling ────────────────────────────────────────────────

  it("4E-7: fetchJson throws body as object when backend returns 4xx", async () => {
    mockFetchError(422, {
      code: "SHIFT_ALREADY_OPEN",
      message: "มีกะที่เปิดอยู่แล้ว",
    });

    await expect(
      realAppAdapter.openShift(500),
    ).rejects.toMatchObject({
      code: "SHIFT_ALREADY_OPEN",
      message: "มีกะที่เปิดอยู่แล้ว",
    });
  });

  it("4E-8: fetchJson throws fallback object when backend returns non-JSON", async () => {
    mockFetchNonJson(500);

    await expect(
      realAppAdapter.openShift(500),
    ).rejects.toMatchObject({
      message: "Request failed",
    });
  });

  // ── 4F: COA ───────────────────────────────────────────────────────────

  it("4F-9: listChartOfAccounts returns full account list shape", async () => {
    const mockResponse = [
      {
        account_id: "coa-1",
        account_code: "4101",
        account_name: "Membership Revenue",
        account_type: "REVENUE",
        is_active: true,
        description: "รายได้ค่าสมาชิก",
      },
    ];
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.listChartOfAccounts();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      account_id: "coa-1",
      account_code: "4101",
      account_name: "Membership Revenue",
      account_type: "REVENUE",
      is_active: true,
    });
  });

  it("4F-10: createChartOfAccount returns created account shape", async () => {
    const mockResponse = {
      account_id: "coa-2",
      account_code: "5209",
      account_name: "Utilities Expense",
      account_type: "EXPENSE",
      is_active: true,
      description: "ค่าน้าและไฟ",
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.createChartOfAccount({
      account_code: "5209",
      account_name: "Utilities Expense",
      account_type: "EXPENSE",
      description: "ค่าน้าและไฟ",
    });

    expect(result).toMatchObject({
      account_id: "coa-2",
      account_code: "5209",
      account_name: "Utilities Expense",
      account_type: "EXPENSE",
      is_active: true,
    });
  });

  it("4F-11: toggleChartOfAccount returns updated account shape", async () => {
    const mockResponse = {
      account_id: "coa-3",
      account_code: "5201",
      account_name: "Cleaning Supplies",
      account_type: "EXPENSE",
      is_active: false,
      locked_reason: "ใช้งานแล้ว",
    };
    mockFetchOk(mockResponse);

    const result = await realAppAdapter.toggleChartOfAccount("coa-3");

    expect(result).toMatchObject({
      account_id: "coa-3",
      account_code: "5201",
      account_name: "Cleaning Supplies",
      account_type: "EXPENSE",
      is_active: false,
      locked_reason: "ใช้งานแล้ว",
    });
  });
});
