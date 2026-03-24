import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as dailySummaryGET } from "../../src/app/api/v1/reports/daily-summary/route";
import { POST as createOrderPOST } from "../../src/app/api/v1/orders/route";

const mockResolveSessionFromRequest = vi.fn();
const mockGetDailySummaryByDate = vi.fn();
const mockCreateOrderWithJournal = vi.fn();
const mockListProducts = vi.fn();
const mockGetActiveShiftByStaff = vi.fn();
const mockGetShiftInventorySummaryByShiftId = vi.fn();
const mockOpenShiftWithJournal = vi.fn();
const mockPostExpenseWithJournal = vi.fn();
const mockCloseActiveShiftWithDifference = vi.fn();
const mockGetShiftSummaryByDate = vi.fn();
const mockGetGeneralLedgerReport = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  getDailySummaryByDate: (...args: unknown[]) => mockGetDailySummaryByDate(...args),
  createOrderWithJournal: (...args: unknown[]) => mockCreateOrderWithJournal(...args),
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  getActiveShiftByStaff: (...args: unknown[]) => mockGetActiveShiftByStaff(...args),
  getShiftInventorySummaryByShiftId: (...args: unknown[]) => mockGetShiftInventorySummaryByShiftId(...args),
  openShiftWithJournal: (...args: unknown[]) => mockOpenShiftWithJournal(...args),
  postExpenseWithJournal: (...args: unknown[]) => mockPostExpenseWithJournal(...args),
  closeActiveShiftWithDifference: (...args: unknown[]) => mockCloseActiveShiftWithDifference(...args),
  getShiftSummaryByDate: (...args: unknown[]) => mockGetShiftSummaryByDate(...args),
  getGeneralLedgerReport: (...args: unknown[]) => mockGetGeneralLedgerReport(...args),
}));

describe("daily-summary route with period support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
  });

  it("accepts period=DAY and date param", async () => {
    const mockSummary = {
      report_period: "DAY",
      range_start: "2026-03-21",
      range_end: "2026-03-21",
      sales_by_category: [],
      total_sales: 1000,
      sales_by_method: { CASH: 500, PROMPTPAY: 300, CREDIT_CARD: 200 },
      total_expenses: 100,
      net_cash_flow: 400,
      shift_discrepancies: 0,
      sales_rows: [],
      shift_rows: [],
    };
    mockGetDailySummaryByDate.mockResolvedValue(mockSummary);

    const response = await dailySummaryGET(
      new Request("http://localhost/api/v1/reports/daily-summary?period=DAY&date=2026-03-21"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.report_period).toBe("DAY");
    expect(body.range_start).toBe("2026-03-21");
    expect(mockGetDailySummaryByDate).toHaveBeenCalledWith(
      expect.objectContaining({ period: "DAY", date: "2026-03-21" }),
    );
  });

  it("accepts period=CUSTOM with start_date and end_date", async () => {
    mockGetDailySummaryByDate.mockResolvedValue({
      report_period: "CUSTOM",
      range_start: "2026-03-01",
      range_end: "2026-03-21",
      sales_by_category: [],
      total_sales: 50000,
      sales_by_method: { CASH: 20000, PROMPTPAY: 15000, CREDIT_CARD: 15000 },
      total_expenses: 5000,
      net_cash_flow: 15000,
      shift_discrepancies: 0,
      sales_rows: [],
      shift_rows: [],
    });

    const response = await dailySummaryGET(
      new Request("http://localhost/api/v1/reports/daily-summary?period=CUSTOM&start_date=2026-03-01&end_date=2026-03-21"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.report_period).toBe("CUSTOM");
    expect(mockGetDailySummaryByDate).toHaveBeenCalledWith(
      expect.objectContaining({ period: "CUSTOM", start_date: "2026-03-01", end_date: "2026-03-21" }),
    );
  });

  it("returns 400 when CUSTOM period missing dates", async () => {
    const response = await dailySummaryGET(
      new Request("http://localhost/api/v1/reports/daily-summary?period=CUSTOM"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 for unauthenticated request", async () => {
    mockResolveSessionFromRequest.mockResolvedValue(null);

    const response = await dailySummaryGET(
      new Request("http://localhost/api/v1/reports/daily-summary?date=2026-03-21"),
    );

    expect(response.status).toBe(401);
  });
});

describe("orders route with trainer support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveSessionFromRequest.mockResolvedValue({
      user_id: "u1",
      role: "STAFF",
      active_shift_id: "shift-1",
    });
  });

  it("accepts trainer_id in order items", async () => {
    mockCreateOrderWithJournal.mockResolvedValue({
      order_id: "o1",
      order_number: "ORD-001",
      tax_doc_number: "TAX-001",
      total_amount: 500,
      payment_method: "CASH",
      created_at: "2026-03-21T00:00:00.000Z",
    });

    const response = await createOrderPOST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift-1",
          items: [
            { product_id: "p1", quantity: 1, trainer_id: "t1" },
          ],
          payment_method: "CASH",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.order_number).toBe("ORD-001");
    expect(mockCreateOrderWithJournal).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ product_id: "p1", trainer_id: "t1" }),
        ]),
      }),
    );
  });

  it("handles TRAINER_REQUIRED error", async () => {
    mockCreateOrderWithJournal.mockRejectedValue(new Error("TRAINER_REQUIRED"));

    const response = await createOrderPOST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift-1",
          items: [{ product_id: "p1", quantity: 1 }],
          payment_method: "CASH",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("TRAINER_REQUIRED");
  });

  it("handles TRAINER_NOT_FOUND error", async () => {
    mockCreateOrderWithJournal.mockRejectedValue(new Error("TRAINER_NOT_FOUND"));

    const response = await createOrderPOST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift-1",
          items: [{ product_id: "p1", quantity: 1, trainer_id: "nonexistent" }],
          payment_method: "CASH",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("TRAINER_NOT_FOUND");
  });

  it("handles TRAINING_SINGLE_QUANTITY error", async () => {
    mockCreateOrderWithJournal.mockRejectedValue(new Error("TRAINING_SINGLE_QUANTITY"));

    const response = await createOrderPOST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: "shift-1",
          items: [{ product_id: "p1", quantity: 2, trainer_id: "t1" }],
          payment_method: "CASH",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("TRAINING_SINGLE_QUANTITY");
  });
});
