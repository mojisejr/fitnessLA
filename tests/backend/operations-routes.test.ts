import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as productsGET } from "../../src/app/api/v1/products/route";
import { GET as activeShiftGET } from "../../src/app/api/v1/shifts/active/route";
import { GET as shiftInventorySummaryGET } from "../../src/app/api/v1/shifts/[shiftId]/inventory-summary/route";
import { POST as openShiftPOST } from "../../src/app/api/v1/shifts/open/route";
import { POST as createOrderPOST } from "../../src/app/api/v1/orders/route";
import { POST as createExpensePOST } from "../../src/app/api/v1/expenses/route";
import { POST as closeShiftPOST } from "../../src/app/api/v1/shifts/close/route";
import { GET as dailySummaryGET } from "../../src/app/api/v1/reports/daily-summary/route";
import { GET as shiftSummaryGET } from "../../src/app/api/v1/reports/shift-summary/route";
import { GET as generalLedgerGET } from "../../src/app/api/v1/reports/gl/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListProducts = vi.fn();
const mockGetActiveShiftByStaff = vi.fn();
const mockGetShiftInventorySummaryByShiftId = vi.fn();
const mockOpenShiftWithJournal = vi.fn();
const mockCreateOrderWithJournal = vi.fn();
const mockPostExpenseWithJournal = vi.fn();
const mockCloseActiveShiftWithDifference = vi.fn();
const mockGetDailySummaryByDate = vi.fn();
const mockGetShiftSummaryByDate = vi.fn();
const mockGetGeneralLedgerReport = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  getActiveShiftByStaff: (...args: unknown[]) => mockGetActiveShiftByStaff(...args),
  getShiftInventorySummaryByShiftId: (...args: unknown[]) =>
    mockGetShiftInventorySummaryByShiftId(...args),
  openShiftWithJournal: (...args: unknown[]) => mockOpenShiftWithJournal(...args),
  createOrderWithJournal: (...args: unknown[]) => mockCreateOrderWithJournal(...args),
  postExpenseWithJournal: (...args: unknown[]) => mockPostExpenseWithJournal(...args),
  closeActiveShiftWithDifference: (...args: unknown[]) =>
    mockCloseActiveShiftWithDifference(...args),
  getDailySummaryByDate: (...args: unknown[]) => mockGetDailySummaryByDate(...args),
  getShiftSummaryByDate: (...args: unknown[]) => mockGetShiftSummaryByDate(...args),
  getGeneralLedgerReport: (...args: unknown[]) => mockGetGeneralLedgerReport(...args),
}));

describe("A-2 operations routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns products with 200", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListProducts.mockResolvedValue([
      {
        product_id: "p1",
        sku: "PT-001",
        name: "Personal Training Session",
        price: 1500,
        product_type: "SERVICE",
      },
    ]);

    const response = await productsGET(new Request("http://localhost/api/v1/products"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject({
      product_id: "p1",
      sku: "PT-001",
      product_type: "SERVICE",
    });
  });

  it("returns 404 when no active shift", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockGetActiveShiftByStaff.mockResolvedValue(null);

    const response = await activeShiftGET(new Request("http://localhost/api/v1/shifts/active"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("SHIFT_NOT_FOUND");
  });

  it("returns active shift with persisted responsible_name", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockGetActiveShiftByStaff.mockResolvedValue({
      shift_id: "shift_1",
      opened_at: "2026-03-08T16:00:00.000Z",
      starting_cash: 500,
      status: "OPEN",
      responsible_name: "Pim Counter",
    });

    const response = await activeShiftGET(new Request("http://localhost/api/v1/shifts/active"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      shift_id: "shift_1",
      responsible_name: "Pim Counter",
    });
  });

  it("returns shift inventory summary for active cashier shift", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockGetShiftInventorySummaryByShiftId.mockResolvedValue([
      {
        product_id: "p_goods_1",
        sku: "WATER-001",
        name: "Mineral Water",
        opening_stock: 3,
        sold_quantity: 3,
        remaining_stock: 0,
      },
    ]);

    const response = await shiftInventorySummaryGET(
      new Request("http://localhost/api/v1/shifts/shift_1/inventory-summary"),
      { params: Promise.resolve({ shiftId: "shift_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetShiftInventorySummaryByShiftId).toHaveBeenCalledWith(
      "u1",
      "CASHIER",
      "shift_1",
    );
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      sku: "WATER-001",
      sold_quantity: 3,
    });
  });

  it("returns 403 when cashier requests another shift inventory summary", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockGetShiftInventorySummaryByShiftId.mockRejectedValue(new Error("SHIFT_OWNER_MISMATCH"));

    const response = await shiftInventorySummaryGET(
      new Request("http://localhost/api/v1/shifts/shift_2/inventory-summary"),
      { params: Promise.resolve({ shiftId: "shift_2" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("SHIFT_OWNER_MISMATCH");
  });

  it("returns 404 when shift inventory summary shift is missing", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockGetShiftInventorySummaryByShiftId.mockRejectedValue(new Error("SHIFT_NOT_FOUND"));

    const response = await shiftInventorySummaryGET(
      new Request("http://localhost/api/v1/shifts/missing/inventory-summary"),
      { params: Promise.resolve({ shiftId: "missing" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("SHIFT_NOT_FOUND");
  });

  it("returns 401 when inventory summary is requested without session", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await shiftInventorySummaryGET(
      new Request("http://localhost/api/v1/shifts/shift_1/inventory-summary"),
      { params: Promise.resolve({ shiftId: "shift_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 500 when inventory summary service throws unexpected error", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockGetShiftInventorySummaryByShiftId.mockRejectedValue(new Error("DB_TIMEOUT"));

    const response = await shiftInventorySummaryGET(
      new Request("http://localhost/api/v1/shifts/shift_1/inventory-summary"),
      { params: Promise.resolve({ shiftId: "shift_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("opens shift and returns journal reference", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockOpenShiftWithJournal.mockResolvedValue({
      shift_id: "shift_1",
      opened_at: "2026-03-08T16:00:00.000Z",
      journal_entry_id: "journal_1",
      responsible_name: "Persisted Pim",
    });

    const response = await openShiftPOST(
      new Request("http://localhost/api/v1/shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starting_cash: 500, responsible_name: "Pim Counter" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockOpenShiftWithJournal).toHaveBeenCalledWith("u1", 500, "Pim Counter");
    expect(body).toMatchObject({
      shift_id: "shift_1",
      journal_entry_id: "journal_1",
      responsible_name: "Persisted Pim",
    });
  });

  it("creates order with 201", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockCreateOrderWithJournal.mockResolvedValue({
      order_id: "o1",
      order_number: "ORD-2026-0001",
      total_amount: 1500,
      tax_doc_number: "INV-2026-0001",
      status: "COMPLETED",
    });

    const response = await createOrderPOST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift_1",
          items: [{ product_id: "p1", quantity: 1 }],
          payment_method: "CASH",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      order_id: "o1",
      order_number: "ORD-2026-0001",
      tax_doc_number: "INV-2026-0001",
    });
  });

  it("returns 409 when order shift is not open", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockCreateOrderWithJournal.mockRejectedValue(new Error("SHIFT_NOT_OPEN"));

    const response = await createOrderPOST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift_1",
          items: [{ product_id: "p1", quantity: 1 }],
          payment_method: "CASH",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("SHIFT_NOT_OPEN");
  });

  it("creates expense with 201", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockPostExpenseWithJournal.mockResolvedValue({
      expense_id: "exp_1",
      status: "POSTED",
    });

    const response = await createExpensePOST(
      new Request("http://localhost/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift_1",
          account_id: "coa_5010",
          amount: 120,
          description: "Cleaning supplies",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      expense_id: "exp_1",
      status: "POSTED",
    });
  });

  it("closes shift and returns discrepancy payload", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockCloseActiveShiftWithDifference.mockResolvedValue({
      shift_id: "shift_1",
      expected_cash: 2600,
      actual_cash: 2550,
      difference: -50,
      status: "CLOSED",
      journal_entry_id: "je_1",
      responsible_name: "Persisted Pim",
    });

    const response = await closeShiftPOST(
      new Request("http://localhost/api/v1/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_cash: 2550, closing_note: "counted at close", responsible_name: "Pim Counter" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockCloseActiveShiftWithDifference).toHaveBeenCalledWith("u1", {
      actual_cash: 2550,
      closing_note: "counted at close",
      responsible_name: "Pim Counter",
    });
    expect(body).toMatchObject({
      shift_id: "shift_1",
      difference: -50,
      status: "CLOSED",
      responsible_name: "Persisted Pim",
    });
  });

  it("returns 403 when cashier requests daily summary", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });

    const response = await dailySummaryGET(
      new Request("http://localhost/api/v1/reports/daily-summary?date=2026-03-09"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns daily summary for admin", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockGetDailySummaryByDate.mockResolvedValue({
      total_sales: 8420,
      sales_by_method: {
        CASH: 3120,
        PROMPTPAY: 2580,
        CREDIT_CARD: 2720,
      },
      total_expenses: 640,
      net_cash_flow: 2480,
      shift_discrepancies: -60,
      sales_rows: [],
    });

    const response = await dailySummaryGET(
      new Request("http://localhost/api/v1/reports/daily-summary?date=2026-03-09"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      total_sales: 8420,
      net_cash_flow: 2480,
      shift_discrepancies: -60,
    });
  });

  it("returns 403 when cashier requests shift summary", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });

    const response = await shiftSummaryGET(
      new Request("http://localhost/api/v1/reports/shift-summary?date=2026-03-09"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 when shift-summary date is invalid", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await shiftSummaryGET(
      new Request("http://localhost/api/v1/reports/shift-summary?date=20260309"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when shift-summary responsible_name is empty", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await shiftSummaryGET(
      new Request("http://localhost/api/v1/reports/shift-summary?date=2026-03-09&responsible_name=%20%20"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns shift summary for admin with optional responsible_name", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockGetShiftSummaryByDate.mockResolvedValue({
      date: "2026-03-09",
      sales_rows: [],
      shift_rows: [
        {
          shift_id: "shift_1",
          closed_at: "2026-03-09T11:30:00.000Z",
          responsible_name: "Pim Counter",
          expected_cash: 1000,
          actual_cash: 980,
          difference: -20,
          receipt_count: 3,
          sales_by_method: {
            CASH: 980,
            PROMPTPAY: 200,
            CREDIT_CARD: 0,
          },
          total_sales: 1180,
        },
      ],
      totals: {
        receipt_count: 3,
        sales_by_method: {
          CASH: 980,
          PROMPTPAY: 200,
          CREDIT_CARD: 0,
        },
        total_sales: 1180,
        cash_overage: 0,
        cash_shortage: 20,
      },
    });

    const response = await shiftSummaryGET(
      new Request(
        "http://localhost/api/v1/reports/shift-summary?date=2026-03-09&responsible_name=Pim%20Counter",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetShiftSummaryByDate).toHaveBeenCalledWith("2026-03-09", "Pim Counter");
    expect(body).toMatchObject({
      date: "2026-03-09",
      totals: {
        total_sales: 1180,
      },
    });
    expect(body.shift_rows[0]).toMatchObject({
      responsible_name: "Pim Counter",
      receipt_count: 3,
    });
  });

  it("returns GL CSV report for owner", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockGetGeneralLedgerReport.mockResolvedValue([
      {
        date: "2026-03-09",
        account_code: "1010",
        account_name: "Cash",
        debit: 3000,
        credit: 0,
        description: "Order ORD-2026-0001",
      },
      {
        date: "2026-03-09",
        account_code: "4010",
        account_name: "General Revenue",
        debit: 0,
        credit: 3000,
        description: "Order ORD-2026-0001",
      },
    ]);

    const response = await generalLedgerGET(
      new Request("http://localhost/api/v1/reports/gl?start_date=2026-03-09&end_date=2026-03-09"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(body).toContain("Date,Account Code,Account Name,Debit,Credit,Description");
    expect(body).toContain("2026-03-09,1010,Cash,3000.00,0.00,Order ORD-2026-0001");
    expect(body).toContain("2026-03-09,4010,General Revenue,0.00,3000.00,Order ORD-2026-0001");
  });

  it("returns 400 when GL date params are invalid", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });

    const response = await generalLedgerGET(
      new Request("http://localhost/api/v1/reports/gl?start_date=20260309&end_date=2026-03-09"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});
