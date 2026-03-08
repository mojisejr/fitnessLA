import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as productsGET } from "../../src/app/api/v1/products/route";
import { GET as activeShiftGET } from "../../src/app/api/v1/shifts/active/route";
import { POST as openShiftPOST } from "../../src/app/api/v1/shifts/open/route";
import { POST as createOrderPOST } from "../../src/app/api/v1/orders/route";
import { POST as createExpensePOST } from "../../src/app/api/v1/expenses/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListProducts = vi.fn();
const mockGetActiveShiftByStaff = vi.fn();
const mockOpenShiftWithJournal = vi.fn();
const mockCreateOrderWithJournal = vi.fn();
const mockPostExpenseWithJournal = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  getActiveShiftByStaff: (...args: unknown[]) => mockGetActiveShiftByStaff(...args),
  openShiftWithJournal: (...args: unknown[]) => mockOpenShiftWithJournal(...args),
  createOrderWithJournal: (...args: unknown[]) => mockCreateOrderWithJournal(...args),
  postExpenseWithJournal: (...args: unknown[]) => mockPostExpenseWithJournal(...args),
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

  it("opens shift and returns journal reference", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockOpenShiftWithJournal.mockResolvedValue({
      shift_id: "shift_1",
      opened_at: "2026-03-08T16:00:00.000Z",
      journal_entry_id: "journal_1",
    });

    const response = await openShiftPOST(
      new Request("http://localhost/api/v1/shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starting_cash: 500 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      shift_id: "shift_1",
      journal_entry_id: "journal_1",
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
});
