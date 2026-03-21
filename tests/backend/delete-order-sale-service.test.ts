import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const state = {
    shift: {
      id: "shift_1",
      startingCash: 500,
      expectedCash: 7500,
    },
    order: {
      id: "ord_1",
      orderNumber: "ORD-2026-0035",
      paymentMethod: "CASH",
      totalAmount: 7000,
      shiftId: "shift_1",
    },
    journalEntry: {
      id: "je_1",
      sourceType: "SALE",
      sourceId: "ord_1",
    },
    journalLines: [
      { id: "jl_1", journalEntryId: "je_1" },
      { id: "jl_2", journalEntryId: "je_1" },
    ],
  };

  const tx = {
    order: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== state.order.id) {
          return null;
        }

        return {
          id: state.order.id,
          orderNumber: state.order.orderNumber,
          paymentMethod: state.order.paymentMethod,
          totalAmount: new Prisma.Decimal(state.order.totalAmount),
          shift: {
            id: state.shift.id,
            startingCash: new Prisma.Decimal(state.shift.startingCash),
            expectedCash: new Prisma.Decimal(state.shift.expectedCash),
          },
        };
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== state.order.id) {
          throw new Error("ORDER_NOT_FOUND");
        }
        return { id: state.order.id };
      }),
    },
    journalEntry: {
      findFirst: vi.fn(async ({ where }: { where: { sourceType: string; sourceId: string } }) => {
        if (where.sourceType === state.journalEntry.sourceType && where.sourceId === state.journalEntry.sourceId) {
          return { id: state.journalEntry.id };
        }
        return null;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== state.journalEntry.id) {
          throw new Error("JOURNAL_ENTRY_NOT_FOUND");
        }
        return { id: state.journalEntry.id };
      }),
    },
    journalLine: {
      deleteMany: vi.fn(async ({ where }: { where: { journalEntryId: string } }) => {
        state.journalLines = state.journalLines.filter((line) => line.journalEntryId !== where.journalEntryId);
        return { count: 2 };
      }),
    },
    shift: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { expectedCash: Prisma.Decimal } }) => {
        if (where.id !== state.shift.id) {
          throw new Error("SHIFT_NOT_FOUND");
        }
        state.shift.expectedCash = Number(data.expectedCash);
        return {
          id: state.shift.id,
          startingCash: new Prisma.Decimal(state.shift.startingCash),
          expectedCash: new Prisma.Decimal(state.shift.expectedCash),
        };
      }),
    },
  };

  return {
    state,
    prismaMock: {
      $transaction: async <T>(callback: (trx: typeof tx) => Promise<T>) => callback(tx),
    },
    tx,
  };
});

vi.mock("../../src/lib/prisma", () => ({
  prisma: mocked.prismaMock,
}));

import { deleteOrderSale } from "../../src/features/operations/services";

describe("deleteOrderSale", () => {
  beforeEach(() => {
    mocked.state.shift.expectedCash = 7500;
    mocked.state.journalLines = [
      { id: "jl_1", journalEntryId: "je_1" },
      { id: "jl_2", journalEntryId: "je_1" },
    ];
    vi.clearAllMocks();
  });

  it("deletes sale journal and subtracts cash from expected shift cash", async () => {
    const result = await deleteOrderSale("ord_1");

    expect(result).toEqual({ order_id: "ord_1", order_number: "ORD-2026-0035" });
    expect(mocked.tx.journalLine.deleteMany).toHaveBeenCalledWith({ where: { journalEntryId: "je_1" } });
    expect(mocked.tx.journalEntry.delete).toHaveBeenCalledWith({ where: { id: "je_1" } });
    expect(mocked.tx.shift.update).toHaveBeenCalled();
    expect(mocked.state.shift.expectedCash).toBe(500);
    expect(mocked.tx.order.delete).toHaveBeenCalledWith({ where: { id: "ord_1" } });
  });
});
