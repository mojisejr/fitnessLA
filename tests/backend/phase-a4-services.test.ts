import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ShiftState = {
  id: string;
  staffId: string;
  responsibleName: string | null;
  status: "OPEN" | "CLOSED";
  startTime: Date;
  endTime: Date | null;
  startingCash: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
};

type OrderState = {
  id: string;
  orderNumber: string;
  shiftId: string;
  paymentMethod: "CASH" | "PROMPTPAY" | "CREDIT_CARD";
  totalAmount: number;
  status: "COMPLETED";
  createdAt: Date;
  customerName: string | null;
  items: Array<{
    quantity: number;
    productId: string;
    productSku: string;
    productName: string;
    productType: "GOODS" | "SERVICE" | "MEMBERSHIP";
  }>;
};

type UserState = {
  id: string;
  name: string;
  username: string;
};

type ExpenseState = {
  amount: number;
  status: "POSTED";
  createdAt: Date;
};

type State = {
  shifts: ShiftState[];
  chartOfAccounts: Array<{ id: string; code: string }>;
  journalEntries: Array<{ id: string; sourceType: string; sourceId: string }>;
  journalLines: Array<{ id: string; journalEntryId: string; debit: number; credit: number }>;
  orders: OrderState[];
  users: UserState[];
  expenses: ExpenseState[];
  generalLedgerLines: Array<{
    id: string;
    date: Date;
    description: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
};

const mocked = vi.hoisted(() => {
  const state: State = {
    shifts: [],
    chartOfAccounts: [],
    journalEntries: [],
    journalLines: [],
    orders: [],
    users: [],
    expenses: [],
    generalLedgerLines: [],
  };

  let idCounter = 1;

  const nextId = (prefix: string) => {
    idCounter += 1;
    return `${prefix}_${idCounter}`;
  };

  const txMock = {
    shift: {
      findFirst: async ({ where }: { where: { staffId?: string; status: "OPEN"; endTime: null } }) => {
        const found = state.shifts
          .filter(
            (shift) =>
              (!where.staffId || shift.staffId === where.staffId) &&
              shift.status === where.status &&
              shift.endTime === null,
          )
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

        if (!found) {
          return null;
        }

        return {
          ...found,
          startingCash: new Prisma.Decimal(found.startingCash),
          expectedCash: found.expectedCash === null ? null : new Prisma.Decimal(found.expectedCash),
          responsibleName: found.responsibleName,
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: {
          status: "CLOSED";
          endTime: Date;
          expectedCash: Prisma.Decimal;
          actualCash: Prisma.Decimal;
          difference: Prisma.Decimal;
          responsibleName?: string;
        };
      }) => {
        const target = state.shifts.find((shift) => shift.id === where.id);
        if (!target) {
          throw new Error("SHIFT_NOT_FOUND");
        }

        target.status = data.status;
        target.endTime = data.endTime;
        target.expectedCash = Number(data.expectedCash);
        target.actualCash = Number(data.actualCash);
        target.difference = Number(data.difference);
        target.responsibleName = data.responsibleName ?? target.responsibleName;

        return {
          ...target,
          startingCash: new Prisma.Decimal(target.startingCash),
          expectedCash: target.expectedCash === null ? null : new Prisma.Decimal(target.expectedCash),
          actualCash: target.actualCash === null ? null : new Prisma.Decimal(target.actualCash),
          difference: target.difference === null ? null : new Prisma.Decimal(target.difference),
          responsibleName: target.responsibleName,
        };
      },
      findMany: async ({
        where,
      }: {
        where: {
          status: "CLOSED";
          endTime: { gte: Date; lt: Date };
          responsibleName?: string;
        };
      }) => {
        return state.shifts
          .filter(
            (shift) =>
              shift.status === where.status &&
              shift.endTime !== null &&
              shift.endTime >= where.endTime.gte &&
              shift.endTime < where.endTime.lt &&
              (where.responsibleName ? shift.responsibleName === where.responsibleName : true),
          )
          .map((shift) => ({
            id: shift.id,
            endTime: shift.endTime,
            expectedCash:
              shift.expectedCash === null ? null : new Prisma.Decimal(shift.expectedCash),
            actualCash: shift.actualCash === null ? null : new Prisma.Decimal(shift.actualCash),
            difference:
              shift.difference === null ? null : new Prisma.Decimal(shift.difference),
            staffId: shift.staffId,
            responsibleName: shift.responsibleName,
          }));
      },
    },
    chartOfAccount: {
      findUnique: async ({ where }: { where: { code: string } }) => {
        return state.chartOfAccounts.find((account) => account.code === where.code) ?? null;
      },
      upsert: async ({
        where,
      }: {
        where: { code: string };
        update: { name: string; type: string; normalBalance: string };
        create: { code: string; name: string; type: string; normalBalance: string };
      }) => {
        const existing = state.chartOfAccounts.find((account) => account.code === where.code);
        if (existing) {
          return existing;
        }

        const created = { id: nextId("coa"), code: where.code };
        state.chartOfAccounts.push(created);
        return created;
      },
    },
    journalEntry: {
      create: async ({ data }: { data: { sourceType: string; sourceId: string } }) => {
        const created = {
          id: nextId("je"),
          sourceType: data.sourceType,
          sourceId: data.sourceId,
        };
        state.journalEntries.push(created);
        return created;
      },
    },
    journalLine: {
      createMany: async ({
        data,
      }: {
        data: Array<{
          journalEntryId: string;
          debit: Prisma.Decimal;
          credit: Prisma.Decimal;
        }>;
      }) => {
        for (const line of data) {
          state.journalLines.push({
            id: nextId("jl"),
            journalEntryId: line.journalEntryId,
            debit: Number(line.debit),
            credit: Number(line.credit),
          });
        }

        return { count: data.length };
      },
    },
  };

  const prismaMock = {
    $transaction: async <T>(callback: (tx: typeof txMock) => Promise<T>) => callback(txMock),
    order: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: {
          status: "COMPLETED";
          createdAt: { gte: Date; lt: Date };
        };
        orderBy?: { createdAt: "desc" | "asc" };
      }) => {
        const rows = state.orders
          .filter(
            (order) =>
              order.status === where.status &&
              order.createdAt >= where.createdAt.gte &&
              order.createdAt < where.createdAt.lt,
          )
          .sort((left, right) =>
            orderBy?.createdAt === "asc"
              ? left.createdAt.getTime() - right.createdAt.getTime()
              : right.createdAt.getTime() - left.createdAt.getTime(),
          );

        return rows.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          customerName: order.customerName,
          paymentMethod: order.paymentMethod,
          totalAmount: new Prisma.Decimal(order.totalAmount),
          shift: {
            id: order.shiftId,
            staffId: state.shifts.find((shift) => shift.id === order.shiftId)?.staffId ?? order.shiftId,
            responsibleName:
              state.shifts.find((shift) => shift.id === order.shiftId)?.responsibleName ?? null,
          },
          items: order.items.map((item) => ({
            quantity: item.quantity,
            totalPrice: new Prisma.Decimal(
              order.totalAmount * (item.quantity / Math.max(order.items.reduce((sum, current) => sum + current.quantity, 0), 1)),
            ),
            product: {
              name: item.productName,
              sku: item.productSku,
            },
          })),
        }));
      },
    },
    orderItem: {
      findMany: async ({
        where,
      }: {
        where: {
          order: { shiftId: string; status: "COMPLETED" };
          product: { productType: "GOODS" };
        };
      }) => {
        const rows: Array<{
          quantity: number;
          product: { id: string; sku: string; name: string };
        }> = [];

        for (const order of state.orders) {
          if (order.shiftId !== where.order.shiftId || order.status !== where.order.status) {
            continue;
          }

          for (const item of order.items) {
            if (item.productType !== where.product.productType) {
              continue;
            }

            rows.push({
              quantity: item.quantity,
              product: {
                id: item.productId,
                sku: item.productSku,
                name: item.productName,
              },
            });
          }
        }

        return rows;
      },
    },
    user: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        return state.users
          .filter((user) => where.id.in.includes(user.id))
          .map((user) => ({ id: user.id, name: user.name, username: user.username }));
      },
    },
    expense: {
      findMany: async ({
        where,
      }: {
        where: {
          status: "POSTED";
          createdAt: { gte: Date; lt: Date };
        };
      }) => {
        return state.expenses
          .filter(
            (expense) =>
              expense.status === where.status &&
              expense.createdAt >= where.createdAt.gte &&
              expense.createdAt < where.createdAt.lt,
          )
          .map((expense) => ({ amount: new Prisma.Decimal(expense.amount) }));
      },
    },
    shift: {
      findMany: txMock.shift.findMany,
      findUnique: async ({ where }: { where: { id: string } }) => {
        const target = state.shifts.find((shift) => shift.id === where.id);
        if (!target) {
          return null;
        }

        return {
          id: target.id,
          staffId: target.staffId,
          status: target.status,
          endTime: target.endTime,
        };
      },
    },
    journalLine: {
      findMany: async ({
        where,
      }: {
        where: { journalEntry: { date: { gte: Date; lt: Date } } };
      }) => {
        return state.generalLedgerLines
          .filter(
            (line) =>
              line.date >= where.journalEntry.date.gte &&
              line.date < where.journalEntry.date.lt,
          )
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .map((line) => ({
            id: line.id,
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
            chartOfAccount: {
              code: line.accountCode,
              name: line.accountName,
            },
            journalEntry: {
              date: line.date,
              description: line.description,
            },
          }));
      },
    },
  };

  const reset = () => {
    state.shifts = [
      {
        id: "shift_1",
        staffId: "u1",
        responsibleName: "Pim Counter",
        status: "OPEN",
        startTime: new Date("2026-03-09T08:00:00.000Z"),
        endTime: null,
        startingCash: 500,
        expectedCash: 900,
        actualCash: null,
        difference: null,
      },
      {
        id: "shift_2",
        staffId: "u2",
        responsibleName: "June Desk",
        status: "CLOSED",
        startTime: new Date("2026-03-09T07:00:00.000Z"),
        endTime: new Date("2026-03-09T11:30:00.000Z"),
        startingCash: 500,
        expectedCash: 600,
        actualCash: 620,
        difference: 20,
      },
    ];

    state.chartOfAccounts = [{ id: "coa_cash", code: "1010" }];
    state.journalEntries = [];
    state.journalLines = [];
    state.orders = [
      {
        id: "ord_1",
        orderNumber: "ORD-2026-0001",
        shiftId: "shift_1",
        paymentMethod: "CASH",
        totalAmount: 500,
        status: "COMPLETED",
        createdAt: new Date("2026-03-09T03:00:00.000Z"),
        customerName: null,
        items: [
          {
            quantity: 2,
            productId: "prod_water",
            productSku: "WATER-001",
            productName: "Mineral Water",
            productType: "GOODS",
          },
        ],
      },
      {
        id: "ord_2",
        orderNumber: "ORD-2026-0002",
        shiftId: "shift_2",
        paymentMethod: "PROMPTPAY",
        totalAmount: 700,
        status: "COMPLETED",
        createdAt: new Date("2026-03-09T04:00:00.000Z"),
        customerName: "Nok Member",
        items: [
          {
            quantity: 1,
            productId: "prod_membership",
            productSku: "MEM-001",
            productName: "สมาชิกรายเดือน",
            productType: "MEMBERSHIP",
          },
        ],
      },
      {
        id: "ord_3",
        orderNumber: "ORD-2026-0003",
        shiftId: "shift_2",
        paymentMethod: "CREDIT_CARD",
        totalAmount: 300,
        status: "COMPLETED",
        createdAt: new Date("2026-03-09T05:00:00.000Z"),
        customerName: "Mild Training",
        items: [
          {
            quantity: 1,
            productId: "prod_pt",
            productSku: "PT-001",
            productName: "เทรนเดี่ยว 1 ครั้ง",
            productType: "SERVICE",
          },
        ],
      },
    ];
    state.users = [
      { id: "u1", name: "Pim Counter", username: "pim.counter" },
      { id: "u2", name: "June Desk", username: "june.desk" },
    ];
    state.expenses = [
      {
        amount: 120,
        status: "POSTED",
        createdAt: new Date("2026-03-09T06:00:00.000Z"),
      },
    ];
    state.generalLedgerLines = [
      {
        id: "gl_1",
        date: new Date("2026-03-09T08:00:00.000Z"),
        description: "Order ORD-2026-0001",
        accountCode: "1010",
        accountName: "Cash",
        debit: 500,
        credit: 0,
      },
      {
        id: "gl_2",
        date: new Date("2026-03-09T08:00:00.000Z"),
        description: "Order ORD-2026-0001",
        accountCode: "4010",
        accountName: "General Revenue",
        debit: 0,
        credit: 500,
      },
      {
        id: "gl_3",
        date: new Date("2026-03-10T08:00:00.000Z"),
        description: "Expense exp_1",
        accountCode: "5010",
        accountName: "Supplies Expense",
        debit: 200,
        credit: 0,
      },
    ];
    idCounter = 1;
  };

  return { prismaMock, state, reset };
});

vi.mock("../../src/lib/prisma", () => ({
  prisma: mocked.prismaMock,
}));

import {
  closeActiveShiftWithDifference,
  getDailySummaryByDate,
  getGeneralLedgerReport,
  getShiftInventorySummaryByShiftId,
  getShiftSummaryByDate,
} from "../../src/features/operations/services";

describe("A-4 services", () => {
  beforeEach(() => {
    mocked.reset();
    vi.clearAllMocks();
  });

  it("closes active shift and posts shortage journal when cash is short", async () => {
    const result = await closeActiveShiftWithDifference("u1", {
      actual_cash: 850,
      closing_note: "counted by cashier",
      responsible_name: "Pim Counter Updated",
    });

    expect(result.status).toBe("CLOSED");
    expect(result.expected_cash).toBe(900);
    expect(result.actual_cash).toBe(850);
    expect(result.difference).toBe(-50);
    expect(result.responsible_name).toBe("Pim Counter Updated");

    const closed = mocked.state.shifts.find((shift) => shift.id === "shift_1");
    expect(closed?.status).toBe("CLOSED");
    expect(closed?.responsibleName).toBe("Pim Counter Updated");
    expect(mocked.state.journalEntries).toHaveLength(1);
    expect(mocked.state.journalLines).toHaveLength(2);

    const debitTotal = mocked.state.journalLines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = mocked.state.journalLines.reduce((sum, line) => sum + line.credit, 0);
    expect(debitTotal).toBe(50);
    expect(creditTotal).toBe(50);
  });

  it("lets another logged-in user close the shared open shift", async () => {
    const result = await closeActiveShiftWithDifference("u2", {
      actual_cash: 910,
      closing_note: "closed by admin",
      responsible_name: "June Desk",
    });

    expect(result.status).toBe("CLOSED");
    expect(result.shift_id).toBe("shift_1");
    expect(result.responsible_name).toBe("June Desk");
    expect(mocked.state.shifts.find((shift) => shift.id === "shift_1")?.status).toBe("CLOSED");
  });

  it("returns daily summary totals grouped by payment method", async () => {
    const summary = await getDailySummaryByDate("2026-03-09");

    expect(summary.total_sales).toBe(1500);
    expect(summary.sales_by_method).toEqual({
      CASH: 500,
      PROMPTPAY: 700,
      CREDIT_CARD: 300,
    });
    expect(summary.total_expenses).toBe(120);
    expect(summary.net_cash_flow).toBe(380);
    expect(summary.shift_discrepancies).toBe(20);
    expect(summary.sales_rows).toHaveLength(3);
    expect(summary.shift_rows).toHaveLength(1);
    expect(summary.sales_rows[0]).toMatchObject({
      order_number: "ORD-2026-0003",
      cashier_name: "June Desk",
      responsible_name: "June Desk",
      payment_method: "CREDIT_CARD",
      total_amount: 300,
    });
    expect(summary.shift_rows[0]).toMatchObject({
      responsible_name: "June Desk",
      difference: 20,
    });
    expect(summary.sales_by_category).toEqual([
      {
        category: "COFFEE",
        label: "กาแฟและเครื่องดื่ม",
        total_amount: 500,
        receipt_count: 1,
        item_count: 2,
      },
      {
        category: "MEMBERSHIP",
        label: "สมาชิก",
        total_amount: 700,
        receipt_count: 1,
        item_count: 1,
      },
      {
        category: "FOOD",
        label: "อาหารตามสั่ง",
        total_amount: 0,
        receipt_count: 0,
        item_count: 0,
      },
      {
        category: "TRAINING",
        label: "บริการเทรน",
        total_amount: 300,
        receipt_count: 1,
        item_count: 1,
      },
      {
        category: "COUNTER",
        label: "สินค้าเสริมหน้าเคาน์เตอร์",
        total_amount: 0,
        receipt_count: 0,
        item_count: 0,
      },
    ]);
  });

  it("throws invalid date error when date format is invalid", async () => {
    await expect(getDailySummaryByDate("bad-date")).rejects.toThrow("INVALID_DATE");
  });

  it("returns shift summary with per-shift totals and cash overage/shortage", async () => {
    const summary = await getShiftSummaryByDate("2026-03-09");

    expect(summary.date).toBe("2026-03-09");
    expect(summary.sales_rows).toHaveLength(3);
    expect(summary.shift_rows).toHaveLength(1);
    expect(summary.shift_rows[0]).toMatchObject({
      shift_id: "shift_2",
      responsible_name: "June Desk",
      receipt_count: 2,
      sales_by_method: {
        CASH: 0,
        PROMPTPAY: 700,
        CREDIT_CARD: 300,
      },
      total_sales: 1000,
      difference: 20,
    });
    expect(summary.totals).toMatchObject({
      receipt_count: 2,
      sales_by_method: {
        CASH: 0,
        PROMPTPAY: 700,
        CREDIT_CARD: 300,
      },
      total_sales: 1000,
      cash_overage: 20,
      cash_shortage: 0,
    });
  });

  it("filters shift summary by responsible_name", async () => {
    const summary = await getShiftSummaryByDate("2026-03-09", "Pim Counter");

    expect(summary.sales_rows).toHaveLength(0);
    expect(summary.shift_rows).toHaveLength(0);
    expect(summary.totals).toMatchObject({
      receipt_count: 0,
      total_sales: 0,
      cash_overage: 0,
      cash_shortage: 0,
    });
  });

  it("returns GL rows in date range", async () => {
    const rows = await getGeneralLedgerReport("2026-03-09", "2026-03-09");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "2026-03-09",
      account_code: "1010",
      debit: 500,
      credit: 0,
    });

    const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it("throws invalid date range when start_date is after end_date", async () => {
    await expect(getGeneralLedgerReport("2026-03-10", "2026-03-09")).rejects.toThrow(
      "INVALID_DATE_RANGE",
    );
  });

  it("returns shift inventory summary with sold aggregates for GOODS products", async () => {
    mocked.state.orders.push({
      id: "ord_4",
      orderNumber: "ORD-2026-0004",
      shiftId: "shift_1",
      paymentMethod: "CASH",
      totalAmount: 40,
      status: "COMPLETED",
      createdAt: new Date("2026-03-09T06:00:00.000Z"),
      customerName: null,
      items: [
        {
          quantity: 1,
          productId: "prod_water",
          productSku: "WATER-001",
          productName: "Mineral Water",
          productType: "GOODS",
        },
        {
          quantity: 2,
          productId: "prod_towel",
          productSku: "TOWEL-001",
          productName: "Gym Towel",
          productType: "GOODS",
        },
      ],
    });

    const rows = await getShiftInventorySummaryByShiftId("u1", "CASHIER", "shift_1");

    expect(rows).toEqual([
      {
        product_id: "prod_towel",
        sku: "TOWEL-001",
        name: "Gym Towel",
        opening_stock: 2,
        sold_quantity: 2,
        remaining_stock: 0,
      },
      {
        product_id: "prod_water",
        sku: "WATER-001",
        name: "Mineral Water",
        opening_stock: 3,
        sold_quantity: 3,
        remaining_stock: 0,
      },
    ]);
  });

  it("lets cashier view the currently open shared shift inventory", async () => {
    const rows = await getShiftInventorySummaryByShiftId("u2", "CASHIER", "shift_1");

    expect(rows).toEqual([
      {
        product_id: "prod_water",
        sku: "WATER-001",
        name: "Mineral Water",
        opening_stock: 2,
        sold_quantity: 2,
        remaining_stock: 0,
      },
    ]);
  });

  it("throws owner mismatch for cashier accessing another shift", async () => {
    await expect(
      getShiftInventorySummaryByShiftId("u1", "CASHIER", "shift_2"),
    ).rejects.toThrow("SHIFT_OWNER_MISMATCH");
  });

  it("returns empty array when shift has no GOODS movement", async () => {
    const rows = await getShiftInventorySummaryByShiftId("u2", "ADMIN", "shift_2");
    expect(rows).toEqual([]);
  });
});
