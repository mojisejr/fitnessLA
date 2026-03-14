import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ShiftState = {
  id: string;
  staffId: string;
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
  items: Array<{ quantity: number; productName: string }>;
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
      findFirst: async ({ where }: { where: { staffId: string; status: "OPEN"; endTime: null } }) => {
        const found = state.shifts
          .filter(
            (shift) =>
              shift.staffId === where.staffId && shift.status === where.status && shift.endTime === null,
          )
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

        if (!found) {
          return null;
        }

        return {
          ...found,
          startingCash: new Prisma.Decimal(found.startingCash),
          expectedCash: found.expectedCash === null ? null : new Prisma.Decimal(found.expectedCash),
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

        return {
          ...target,
          startingCash: new Prisma.Decimal(target.startingCash),
          expectedCash: target.expectedCash === null ? null : new Prisma.Decimal(target.expectedCash),
          actualCash: target.actualCash === null ? null : new Prisma.Decimal(target.actualCash),
          difference: target.difference === null ? null : new Prisma.Decimal(target.difference),
        };
      },
      findMany: async ({
        where,
      }: {
        where: {
          status: "CLOSED";
          endTime: { gte: Date; lt: Date };
        };
      }) => {
        return state.shifts
          .filter(
            (shift) =>
              shift.status === where.status &&
              shift.endTime !== null &&
              shift.endTime >= where.endTime.gte &&
              shift.endTime < where.endTime.lt,
          )
          .map((shift) => ({
            difference:
              shift.difference === null ? null : new Prisma.Decimal(shift.difference),
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
            staffId: state.shifts.find((shift) => shift.id === order.shiftId)?.staffId ?? order.shiftId,
          },
          items: order.items.map((item) => ({
            quantity: item.quantity,
            product: {
              name: item.productName,
            },
          })),
        }));
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
        items: [{ quantity: 2, productName: "อเมริกาโน่เย็น" }],
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
        items: [{ quantity: 1, productName: "สมาชิกรายเดือน" }],
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
        items: [{ quantity: 1, productName: "เทรนเดี่ยว 1 ครั้ง" }],
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
    });

    expect(result.status).toBe("CLOSED");
    expect(result.expected_cash).toBe(900);
    expect(result.actual_cash).toBe(850);
    expect(result.difference).toBe(-50);

    const closed = mocked.state.shifts.find((shift) => shift.id === "shift_1");
    expect(closed?.status).toBe("CLOSED");
    expect(mocked.state.journalEntries).toHaveLength(1);
    expect(mocked.state.journalLines).toHaveLength(2);

    const debitTotal = mocked.state.journalLines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = mocked.state.journalLines.reduce((sum, line) => sum + line.credit, 0);
    expect(debitTotal).toBe(50);
    expect(creditTotal).toBe(50);
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
      payment_method: "CREDIT_CARD",
      total_amount: 300,
    });
    expect(summary.shift_rows[0]).toMatchObject({
      responsible_name: "ไม่ระบุผู้รับผิดชอบ",
      difference: 20,
    });
  });

  it("throws invalid date error when date format is invalid", async () => {
    await expect(getDailySummaryByDate("bad-date")).rejects.toThrow("INVALID_DATE");
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
});
