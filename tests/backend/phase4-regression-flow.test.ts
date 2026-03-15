import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as openShiftPOST } from "../../src/app/api/v1/shifts/open/route";
import { POST as createOrderPOST } from "../../src/app/api/v1/orders/route";
import { POST as createExpensePOST } from "../../src/app/api/v1/expenses/route";
import { POST as closeShiftPOST } from "../../src/app/api/v1/shifts/close/route";
import { GET as dailySummaryGET } from "../../src/app/api/v1/reports/daily-summary/route";
import { GET as shiftSummaryGET } from "../../src/app/api/v1/reports/shift-summary/route";
import { GET as generalLedgerGET } from "../../src/app/api/v1/reports/gl/route";

type FlowState = {
  shiftId: string | null;
  expectedCash: number;
  totalSales: number;
  totalExpenses: number;
  closedDifference: number;
};

const mockResolveSessionFromRequest = vi.fn();

const flow = vi.hoisted(() => {
  const state: FlowState = {
    shiftId: null,
    expectedCash: 500,
    totalSales: 0,
    totalExpenses: 0,
    closedDifference: 0,
  };

  const reset = () => {
    state.shiftId = null;
    state.expectedCash = 500;
    state.totalSales = 0;
    state.totalExpenses = 0;
    state.closedDifference = 0;
  };

  return { state, reset };
});

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  openShiftWithJournal: async (_staffId: string, startingCash: number, responsibleName: string) => {
    flow.state.shiftId = "shift_flow_1";
    flow.state.expectedCash = startingCash;

    return {
      shift_id: "shift_flow_1",
      opened_at: "2026-03-15T08:00:00.000Z",
      journal_entry_id: "je_open_1",
      responsible_name: responsibleName,
    };
  },
  createOrderWithJournal: async () => {
    flow.state.totalSales += 1200;
    flow.state.expectedCash += 1200;

    return {
      order_id: "order_flow_1",
      order_number: "ORD-2026-0099",
      total_amount: 1200,
      tax_doc_number: "INV-2026-0099",
      status: "COMPLETED",
    };
  },
  postExpenseWithJournal: async (_staffId: string, input: { amount: number }) => {
    flow.state.totalExpenses += input.amount;
    flow.state.expectedCash -= input.amount;

    return {
      expense_id: "exp_flow_1",
      status: "POSTED",
    };
  },
  closeActiveShiftWithDifference: async (_staffId: string, input: { actual_cash: number; responsible_name: string }) => {
    const difference = Number((input.actual_cash - flow.state.expectedCash).toFixed(2));
    flow.state.closedDifference = difference;

    return {
      shift_id: flow.state.shiftId ?? "shift_flow_1",
      expected_cash: flow.state.expectedCash,
      actual_cash: input.actual_cash,
      difference,
      status: "CLOSED",
      journal_entry_id: "je_close_1",
      responsible_name: input.responsible_name,
    };
  },
  getDailySummaryByDate: async () => ({
    total_sales: flow.state.totalSales,
    sales_by_method: {
      CASH: flow.state.totalSales,
      PROMPTPAY: 0,
      CREDIT_CARD: 0,
    },
    total_expenses: flow.state.totalExpenses,
    net_cash_flow: flow.state.totalSales - flow.state.totalExpenses,
    shift_discrepancies: flow.state.closedDifference,
    sales_rows: [],
    shift_rows: [
      {
        shift_id: flow.state.shiftId ?? "shift_flow_1",
        closed_at: "2026-03-15T12:00:00.000Z",
        responsible_name: "Pim Counter",
        expected_cash: flow.state.expectedCash,
        actual_cash: flow.state.expectedCash + flow.state.closedDifference,
        difference: flow.state.closedDifference,
      },
    ],
  }),
  getShiftSummaryByDate: async () => ({
    date: "2026-03-15",
    sales_rows: [],
    shift_rows: [
      {
        shift_id: flow.state.shiftId ?? "shift_flow_1",
        closed_at: "2026-03-15T12:00:00.000Z",
        responsible_name: "Pim Counter",
        expected_cash: flow.state.expectedCash,
        actual_cash: flow.state.expectedCash + flow.state.closedDifference,
        difference: flow.state.closedDifference,
        receipt_count: 1,
        sales_by_method: {
          CASH: flow.state.totalSales,
          PROMPTPAY: 0,
          CREDIT_CARD: 0,
        },
        total_sales: flow.state.totalSales,
      },
    ],
    totals: {
      receipt_count: 1,
      sales_by_method: {
        CASH: flow.state.totalSales,
        PROMPTPAY: 0,
        CREDIT_CARD: 0,
      },
      total_sales: flow.state.totalSales,
      cash_overage: flow.state.closedDifference > 0 ? flow.state.closedDifference : 0,
      cash_shortage: flow.state.closedDifference < 0 ? Math.abs(flow.state.closedDifference) : 0,
    },
  }),
  getGeneralLedgerReport: async () => [
    {
      date: "2026-03-15",
      account_code: "1010",
      account_name: "Cash",
      debit: 1200,
      credit: 0,
      description: "Order ORD-2026-0099",
    },
    {
      date: "2026-03-15",
      account_code: "4010",
      account_name: "General Revenue",
      debit: 0,
      credit: 1200,
      description: "Order ORD-2026-0099",
    },
  ],
}));

async function runFlowOnce() {
  mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });

  const openResponse = await openShiftPOST(
    new Request("http://localhost/api/v1/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starting_cash: 500, responsible_name: "Pim Counter" }),
    }),
  );
  expect(openResponse.status).toBe(201);

  const orderResponse = await createOrderPOST(
    new Request("http://localhost/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift_id: "shift_flow_1",
        items: [{ product_id: "prod_1", quantity: 1 }],
        payment_method: "CASH",
      }),
    }),
  );
  expect(orderResponse.status).toBe(201);

  const expenseResponse = await createExpensePOST(
    new Request("http://localhost/api/v1/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift_id: "shift_flow_1",
        account_id: "coa_5010",
        amount: 200,
        description: "Cleaning",
      }),
    }),
  );
  expect(expenseResponse.status).toBe(201);

  const closeResponse = await closeShiftPOST(
    new Request("http://localhost/api/v1/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actual_cash: 1450,
        closing_note: "counted",
        responsible_name: "Pim Counter",
      }),
    }),
  );
  const closeBody = await closeResponse.json();
  expect(closeResponse.status).toBe(200);
  expect(closeBody).toMatchObject({
    expected_cash: 1500,
    actual_cash: 1450,
    difference: -50,
  });

  const dailyResponse = await dailySummaryGET(
    new Request("http://localhost/api/v1/reports/daily-summary?date=2026-03-15"),
  );
  const dailyBody = await dailyResponse.json();
  expect(dailyResponse.status).toBe(200);

  const shiftResponse = await shiftSummaryGET(
    new Request("http://localhost/api/v1/reports/shift-summary?date=2026-03-15"),
  );
  const shiftBody = await shiftResponse.json();
  expect(shiftResponse.status).toBe(200);

  const glResponse = await generalLedgerGET(
    new Request("http://localhost/api/v1/reports/gl?start_date=2026-03-15&end_date=2026-03-15"),
  );
  const glText = await glResponse.text();
  expect(glResponse.status).toBe(200);

  return {
    dailySummary: dailyBody,
    shiftSummary: shiftBody,
    glCsv: glText,
  };
}

describe("Phase 4 regression flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flow.reset();
  });

  it("runs backend flow from open -> close -> reports", async () => {
    const result = await runFlowOnce();

    expect(result.dailySummary).toMatchObject({
      total_sales: 1200,
      total_expenses: 200,
      net_cash_flow: 1000,
      shift_discrepancies: -50,
    });
    expect(result.shiftSummary).toMatchObject({
      totals: {
        total_sales: 1200,
        cash_shortage: 50,
      },
    });
    expect(result.glCsv).toContain("Date,Account Code,Account Name,Debit,Credit,Description");
  });

  it("produces deterministic outputs across two identical runs", async () => {
    const round1 = await runFlowOnce();

    flow.reset();
    vi.clearAllMocks();

    const round2 = await runFlowOnce();

    expect(round2.dailySummary).toEqual(round1.dailySummary);
    expect(round2.shiftSummary).toEqual(round1.shiftSummary);
    expect(round2.glCsv).toEqual(round1.glCsv);
  });
});
