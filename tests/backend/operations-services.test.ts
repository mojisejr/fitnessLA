import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ShiftState = {
  id: string;
  staffId: string;
  status: string;
  endTime: Date | null;
  startingCash: number;
  expectedCash: number | null;
};

type State = {
  shifts: ShiftState[];
  products: Array<{
    id: string;
    isActive: boolean;
    price: number;
    revenueAccountId: string | null;
    sku: string;
    productType: "GOODS" | "SERVICE" | "MEMBERSHIP";
    trackStock: boolean;
    stockOnHand: number | null;
    membershipPeriod?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
    membershipDurationDays?: number | null;
  }>;
  trainers: Array<{ id: string; isActive: boolean }>;
  chartOfAccounts: Array<{ id: string; code: string; type?: string; isActive?: boolean }>;
  documentSequences: Array<{ id: string; type: string; prefix: string; currentNo: number }>;
  orders: Array<{ id: string; orderNumber: string }>;
  orderItems: Array<{ id: string; orderId: string; productId: string }>;
  memberSubscriptions: Array<{ id: string; memberCode: string; membershipProductId: string; fullName: string }>;
  trainingServiceEnrollments: Array<{ id: string; orderId: string; orderItemId: string; packageProductId: string; startedAt: Date; expiresAt: Date | null; sessionLimit: number | null; sessionsRemaining: number | null; status: string }>;
  taxDocuments: Array<{ id: string; docNumber: string }>;
  journalEntries: Array<{ id: string; sourceType: string }>;
  journalLines: Array<{
    id: string;
    journalEntryId: string;
    chartOfAccountId: string;
    debit: number;
    credit: number;
  }>;
  expenses: Array<{ id: string; shiftId: string; amount: number }>;
};

function cloneState(state: State): State {
  return {
    shifts: state.shifts.map((item) => ({ ...item })),
    products: state.products.map((item) => ({ ...item })),
    trainers: state.trainers.map((item) => ({ ...item })),
    chartOfAccounts: state.chartOfAccounts.map((item) => ({ ...item })),
    documentSequences: state.documentSequences.map((item) => ({ ...item })),
    orders: state.orders.map((item) => ({ ...item })),
    orderItems: state.orderItems.map((item) => ({ ...item })),
    memberSubscriptions: state.memberSubscriptions.map((item) => ({ ...item })),
    trainingServiceEnrollments: state.trainingServiceEnrollments.map((item) => ({ ...item })),
    taxDocuments: state.taxDocuments.map((item) => ({ ...item })),
    journalEntries: state.journalEntries.map((item) => ({ ...item })),
    journalLines: state.journalLines.map((item) => ({ ...item })),
    expenses: state.expenses.map((item) => ({ ...item })),
  };
}

const mocked = vi.hoisted(() => {
  const state: State = {
    shifts: [],
    products: [],
    trainers: [],
    chartOfAccounts: [],
    documentSequences: [],
    orders: [],
    orderItems: [],
    memberSubscriptions: [],
    trainingServiceEnrollments: [],
    taxDocuments: [],
    journalEntries: [],
    journalLines: [],
    expenses: [],
  };

  let idCounter = 1;
  let transactionQueue = Promise.resolve();

  const nextId = (prefix: string): string => {
    idCounter += 1;
    return `${prefix}_${idCounter}`;
  };

  const txMock = {
    shift: {
      findFirst: async ({ where }: { where: { status: string; endTime: null } }) => {
        const shift = state.shifts
          .filter((item) => item.status === where.status && item.endTime === where.endTime)
          .sort((left, right) => right.id.localeCompare(left.id))[0];

        if (!shift) {
          return null;
        }

        return {
          ...shift,
          startingCash: new Prisma.Decimal(shift.startingCash),
          expectedCash:
            shift.expectedCash === null ? null : new Prisma.Decimal(shift.expectedCash),
        };
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const shift = state.shifts.find((item) => item.id === where.id);
        if (!shift) {
          return null;
        }

        return {
          ...shift,
          startingCash: new Prisma.Decimal(shift.startingCash),
          expectedCash:
            shift.expectedCash === null ? null : new Prisma.Decimal(shift.expectedCash),
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { expectedCash: Prisma.Decimal };
      }) => {
        const target = state.shifts.find((item) => item.id === where.id);
        if (!target) {
          throw new Error("SHIFT_NOT_FOUND");
        }

        target.expectedCash = Number(data.expectedCash);

        return {
          ...target,
          startingCash: new Prisma.Decimal(target.startingCash),
          expectedCash:
            target.expectedCash === null ? null : new Prisma.Decimal(target.expectedCash),
        };
      },
    },
    product: {
      findMany: async ({
        where,
      }: {
        where: { id: { in: string[] }; isActive: boolean };
      }) => {
        return state.products
          .filter((item) => where.id.in.includes(item.id) && item.isActive === where.isActive)
          .map((item) => ({
            id: item.id,
            isActive: item.isActive,
            sku: item.sku,
            name: item.sku,
            price: new Prisma.Decimal(item.price),
            revenueAccountId: item.revenueAccountId,
            productType: item.productType,
            trackStock: item.trackStock,
            stockOnHand: item.stockOnHand,
            membershipPeriod: item.membershipPeriod ?? null,
            membershipDurationDays: item.membershipDurationDays ?? null,
          }));
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { stockOnHand: number };
      }) => {
        const target = state.products.find((item) => item.id === where.id);
        if (!target) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        target.stockOnHand = data.stockOnHand;

        return {
          id: target.id,
          stockOnHand: target.stockOnHand,
        };
      },
    },
    trainer: {
      findMany: async ({
        where,
      }: {
        where: { id: { in: string[] }; isActive: boolean };
        select: { id: true };
      }) => {
        return state.trainers
          .filter((item) => where.id.in.includes(item.id) && item.isActive === where.isActive)
          .map((item) => ({ id: item.id }));
      },
    },
    chartOfAccount: {
      findUnique: async ({ where }: { where: { code?: string; id?: string } }) => {
        if (where.code) {
          return state.chartOfAccounts.find((item) => item.code === where.code) ?? null;
        }

        if (where.id) {
          return state.chartOfAccounts.find((item) => item.id === where.id) ?? null;
        }

        return null;
      },
    },
    documentSequence: {
      upsert: async ({
        where,
        create,
      }: {
        where: { type: string };
        create: { type: string; prefix: string };
      }) => {
        const existing = state.documentSequences.find((item) => item.type === where.type);
        if (existing) {
          return existing;
        }

        const created = {
          id: nextId("seq"),
          type: create.type,
          prefix: create.prefix,
          currentNo: 0,
        };
        state.documentSequences.push(created);
        return created;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { currentNo: number };
      }) => {
        const target = state.documentSequences.find((item) => item.id === where.id);
        if (!target) {
          throw new Error("SEQUENCE_NOT_FOUND");
        }
        target.currentNo = data.currentNo;
        return target;
      },
    },
    $queryRaw: async (
      _strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<Array<{ id: string; prefix: string; currentNo: number }>> => {
      const type = String(values[0]);
      const seq = state.documentSequences.find((item) => item.type === type);
      if (!seq) {
        return [];
      }
      return [{ id: seq.id, prefix: seq.prefix, currentNo: seq.currentNo }];
    },
    order: {
      create: async ({
        data,
      }: {
        data: {
          orderNumber: string;
          items?: { create: Array<{ productId: string }> };
        };
      }) => {
        const created = {
          id: nextId("ord"),
          orderNumber: data.orderNumber,
        };
        state.orders.push(created);

        const createdItems = (data.items?.create ?? []).map((item) => {
          const createdItem = { id: nextId("item"), orderId: created.id, productId: item.productId };
          state.orderItems.push(createdItem);
          return { id: createdItem.id, productId: createdItem.productId };
        });

        return {
          ...created,
          items: createdItems,
        };
      },
    },
    orderItem: {
      createMany: async ({ data }: { data: Array<{ orderId: string; productId: string }> }) => {
        for (const item of data) {
          state.orderItems.push({ id: nextId("item"), orderId: item.orderId, productId: item.productId });
        }
        return { count: data.length };
      },
      findMany: async ({ where }: { where: { orderId: string }; select: { id: true; productId: true } }) => {
        return state.orderItems
          .filter((item) => item.orderId === where.orderId)
          .map((item) => ({ id: item.id, productId: item.productId }));
      },
    },
    trainingServiceEnrollment: {
      create: async ({ data }: { data: { orderId: string; orderItemId: string; packageProductId: string; startedAt: Date; expiresAt: Date | null; sessionLimit: number | null; sessionsRemaining: number | null; status: string } }) => {
        const created = {
          id: nextId("enr"),
          orderId: data.orderId,
          orderItemId: data.orderItemId,
          packageProductId: data.packageProductId,
          startedAt: data.startedAt,
          expiresAt: data.expiresAt,
          sessionLimit: data.sessionLimit,
          sessionsRemaining: data.sessionsRemaining,
          status: data.status,
        };
        state.trainingServiceEnrollments.push(created);
        return created;
      },
    },
    memberSubscription: {
      create: async ({ data }: { data: { memberCode: string; membershipProductId: string; fullName: string } }) => {
        const created = {
          id: nextId("mem"),
          memberCode: data.memberCode,
          membershipProductId: data.membershipProductId,
          fullName: data.fullName,
        };
        state.memberSubscriptions.push(created);
        return created;
      },
    },
    taxDocument: {
      create: async ({ data }: { data: { docNumber: string } }) => {
        const created = { id: nextId("tax"), docNumber: data.docNumber };
        state.taxDocuments.push(created);
        return created;
      },
    },
    journalEntry: {
      create: async ({ data }: { data: { sourceType: string } }) => {
        const created = { id: nextId("je"), sourceType: data.sourceType };
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
          chartOfAccountId: string;
          debit: Prisma.Decimal;
          credit: Prisma.Decimal;
        }>;
      }) => {
        for (const line of data) {
          state.journalLines.push({
            id: nextId("jl"),
            journalEntryId: line.journalEntryId,
            chartOfAccountId: line.chartOfAccountId,
            debit: Number(line.debit),
            credit: Number(line.credit),
          });
        }
        return { count: data.length };
      },
    },
    expense: {
      create: async ({ data }: { data: { shiftId: string; amount: Prisma.Decimal } }) => {
        const created = {
          id: nextId("exp"),
          shiftId: data.shiftId,
          amount: Number(data.amount),
        };
        state.expenses.push(created);
        return created;
      },
    },
  };

  const prismaMock = {
    product: txMock.product,
    trainer: txMock.trainer,
    chartOfAccount: txMock.chartOfAccount,
    $transaction: async <T>(callback: (tx: typeof txMock) => Promise<T>) => {
      const run = async () => {
        const snapshot = cloneState(state);
        try {
          return await callback(txMock);
        } catch (error) {
          state.shifts = snapshot.shifts;
          state.products = snapshot.products;
          state.trainers = snapshot.trainers;
          state.chartOfAccounts = snapshot.chartOfAccounts;
          state.documentSequences = snapshot.documentSequences;
          state.orders = snapshot.orders;
          state.orderItems = snapshot.orderItems;
          state.memberSubscriptions = snapshot.memberSubscriptions;
          state.trainingServiceEnrollments = snapshot.trainingServiceEnrollments;
          state.taxDocuments = snapshot.taxDocuments;
          state.journalEntries = snapshot.journalEntries;
          state.journalLines = snapshot.journalLines;
          state.expenses = snapshot.expenses;
          throw error;
        }
      };

      const result = transactionQueue.then(run);
      transactionQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };

  const reset = () => {
    state.shifts = [
      {
        id: "shift_1",
        staffId: "u1",
        status: "OPEN",
        endTime: null,
        startingCash: 500,
        expectedCash: null,
      },
    ];
    state.products = [
      { id: "p1", isActive: true, price: 1500, revenueAccountId: null, sku: "WATER-01", productType: "GOODS", trackStock: false, stockOnHand: 10, membershipDurationDays: null, membershipPeriod: null },
      { id: "p2", isActive: true, price: 500, revenueAccountId: "coa_rev_pt", sku: "SAUNA-01", productType: "SERVICE", trackStock: false, stockOnHand: null, membershipDurationDays: null, membershipPeriod: null },
      { id: "p3", isActive: true, price: 3500, revenueAccountId: "coa_rev_pt", sku: "PT-10", productType: "SERVICE", trackStock: false, stockOnHand: null, membershipDurationDays: 30, membershipPeriod: null },
      { id: "p4", isActive: true, price: 6500, revenueAccountId: "coa_rev_pt", sku: "PT-20", productType: "SERVICE", trackStock: false, stockOnHand: null, membershipDurationDays: 60, membershipPeriod: null },
      { id: "p5", isActive: true, price: 4500, revenueAccountId: "coa_rev_pt", sku: "PT-MONTH", productType: "SERVICE", trackStock: false, stockOnHand: null, membershipDurationDays: 30, membershipPeriod: null },
      { id: "p6", isActive: true, price: 2200, revenueAccountId: null, sku: "MBR-MONTH", productType: "MEMBERSHIP", trackStock: false, stockOnHand: null, membershipDurationDays: 30, membershipPeriod: "MONTHLY" },
    ];
    state.trainers = [{ id: "trainer_1", isActive: true }];
    state.chartOfAccounts = [
      { id: "coa_cash", code: "1010", type: "ASSET", isActive: true },
      { id: "coa_rev", code: "4010", type: "REVENUE", isActive: true },
      { id: "coa_rev_pt", code: "4110", type: "REVENUE", isActive: true },
      { id: "coa_exp", code: "5010", type: "EXPENSE", isActive: true },
    ];
    state.documentSequences = [];
    state.orders = [];
    state.orderItems = [];
    state.memberSubscriptions = [];
    state.trainingServiceEnrollments = [];
    state.taxDocuments = [];
    state.journalEntries = [];
    state.journalLines = [];
    state.expenses = [];
    idCounter = 1;
    transactionQueue = Promise.resolve();
  };

  return { prismaMock, state, reset };
});

vi.mock("../../src/lib/prisma", () => ({
  prisma: mocked.prismaMock,
}));

import { createOrderWithJournal, postExpenseWithJournal } from "../../src/features/operations/services";

describe("A-3 operations services", () => {
  beforeEach(() => {
    mocked.reset();
    vi.clearAllMocks();
  });

  it("rolls back order and sequence on journal failure", async () => {
    await expect(
      createOrderWithJournal("u1", {
        shift_id: "shift_1",
        items: [{ product_id: "p1", quantity: 1 }],
        payment_method: "CASH",
        simulate_journal_failure: true,
      }),
    ).rejects.toThrow("SIMULATED_JOURNAL_FAILURE");

    expect(mocked.state.orders).toHaveLength(0);
    expect(mocked.state.orderItems).toHaveLength(0);
    expect(mocked.state.taxDocuments).toHaveLength(0);
    expect(mocked.state.documentSequences).toHaveLength(0);
  });

  it("produces unique sequential document numbers for 10 concurrent orders", async () => {
    const jobs = Array.from({ length: 10 }, () =>
      createOrderWithJournal("u1", {
        shift_id: "shift_1",
        items: [{ product_id: "p1", quantity: 1 }],
        payment_method: "CASH",
      }),
    );

    const results = await Promise.all(jobs);
    const orderNumbers = results.map((result) => result.order_number);
    const taxNumbers = results.map((result) => result.tax_doc_number);

    expect(new Set(orderNumbers).size).toBe(10);
    expect(new Set(taxNumbers).size).toBe(10);
    expect(orderNumbers[0].endsWith("0001")).toBe(true);
    expect(orderNumbers[9].endsWith("0010")).toBe(true);
  });

  it("posts expense and deducts expected cash", async () => {
    const result = await postExpenseWithJournal("u1", {
      shift_id: "shift_1",
      account_id: "coa_exp",
      amount: 100,
      description: "Cleaning",
    });

    expect(result.status).toBe("POSTED");
    expect(mocked.state.expenses).toHaveLength(1);
    expect(mocked.state.shifts[0]?.expectedCash).toBe(400);
  });

  it("allows another logged-in user to post into the shared open shift", async () => {
    const result = await postExpenseWithJournal("u2", {
      shift_id: "shift_1",
      account_id: "coa_exp",
      amount: 75,
      description: "Shared shift expense",
    });

    expect(result.status).toBe("POSTED");
    expect(mocked.state.expenses).toHaveLength(1);
    expect(mocked.state.shifts[0]?.expectedCash).toBe(425);
  });

  it("credits mixed revenue accounts per product mapping with fallback to 4010", async () => {
    const result = await createOrderWithJournal("u1", {
      shift_id: "shift_1",
      items: [
        { product_id: "p1", quantity: 1 },
        { product_id: "p2", quantity: 2 },
      ],
      payment_method: "CASH",
    });

    expect(result.total_amount).toBe(2500);

    const entry = mocked.state.journalEntries[0];
    const lines = mocked.state.journalLines.filter((line) => line.journalEntryId === entry?.id);

    expect(lines).toHaveLength(3);

    const cashLine = lines.find((line) => line.chartOfAccountId === "coa_cash");
    const fallbackRevenueLine = lines.find((line) => line.chartOfAccountId === "coa_rev");
    const mappedRevenueLine = lines.find((line) => line.chartOfAccountId === "coa_rev_pt");

    expect(cashLine?.debit).toBe(2500);
    expect(cashLine?.credit).toBe(0);

    expect(fallbackRevenueLine?.debit).toBe(0);
    expect(fallbackRevenueLine?.credit).toBe(1500);

    expect(mappedRevenueLine?.debit).toBe(0);
    expect(mappedRevenueLine?.credit).toBe(1000);
  });

  it("sets PT-10 enrollment expiry to 30 days from service start date", async () => {
    const serviceStartDate = "2026-03-21T00:00:00.000Z";

    await createOrderWithJournal("u1", {
      shift_id: "shift_1",
      items: [{ product_id: "p3", quantity: 1, trainer_id: "trainer_1", service_start_date: serviceStartDate }],
      payment_method: "CASH",
      customer_info: { name: "PT-10 member" },
    });

    expect(mocked.state.trainingServiceEnrollments).toHaveLength(1);
    expect(mocked.state.trainingServiceEnrollments[0]).toMatchObject({
      packageProductId: "p3",
      sessionLimit: 10,
      sessionsRemaining: 10,
      status: "ACTIVE",
    });
    expect(mocked.state.trainingServiceEnrollments[0]?.startedAt.toISOString()).toBe(serviceStartDate);
    expect(mocked.state.trainingServiceEnrollments[0]?.expiresAt?.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("sets PT-20 enrollment expiry to 60 days from service start date", async () => {
    const serviceStartDate = "2026-03-21T00:00:00.000Z";

    await createOrderWithJournal("u1", {
      shift_id: "shift_1",
      items: [{ product_id: "p4", quantity: 1, trainer_id: "trainer_1", service_start_date: serviceStartDate }],
      payment_method: "CASH",
      customer_info: { name: "PT-20 member" },
    });

    expect(mocked.state.trainingServiceEnrollments).toHaveLength(1);
    expect(mocked.state.trainingServiceEnrollments[0]).toMatchObject({
      packageProductId: "p4",
      sessionLimit: 20,
      sessionsRemaining: 20,
      status: "ACTIVE",
    });
    expect(mocked.state.trainingServiceEnrollments[0]?.startedAt.toISOString()).toBe(serviceStartDate);
    expect(mocked.state.trainingServiceEnrollments[0]?.expiresAt?.toISOString()).toBe("2026-05-20T00:00:00.000Z");
  });

  it("sets PT-MONTH enrollment expiry to 30 days from service start date", async () => {
    const serviceStartDate = "2026-03-21T00:00:00.000Z";

    await createOrderWithJournal("u1", {
      shift_id: "shift_1",
      items: [{ product_id: "p5", quantity: 1, trainer_id: "trainer_1", service_start_date: serviceStartDate }],
      payment_method: "CASH",
      customer_info: { name: "PT monthly member" },
    });

    expect(mocked.state.trainingServiceEnrollments).toHaveLength(1);
    expect(mocked.state.trainingServiceEnrollments[0]).toMatchObject({
      packageProductId: "p5",
      sessionLimit: null,
      sessionsRemaining: null,
      status: "ACTIVE",
    });
    expect(mocked.state.trainingServiceEnrollments[0]?.startedAt.toISOString()).toBe(serviceStartDate);
    expect(mocked.state.trainingServiceEnrollments[0]?.expiresAt?.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("allows another logged-in user to sell on the shared open shift", async () => {
    const result = await createOrderWithJournal("u2", {
      shift_id: "shift_1",
      items: [{ product_id: "p1", quantity: 1 }],
      payment_method: "CASH",
    });

    expect(result.status).toBe("COMPLETED");
    expect(mocked.state.orders).toHaveLength(1);
    expect(mocked.state.shifts[0]?.expectedCash).toBe(2000);
  });

  it("creates membership sale with cash and updates expected cash once", async () => {
    const result = await createOrderWithJournal("u1", {
      shift_id: "shift_1",
      items: [{ product_id: "p6", quantity: 1 }],
      payment_method: "CASH",
      customer_info: { name: "Member Cash" },
    });

    expect(result.status).toBe("COMPLETED");
    expect(mocked.state.orders).toHaveLength(1);
    expect(mocked.state.shifts[0]?.expectedCash).toBe(2700);
  });
});
