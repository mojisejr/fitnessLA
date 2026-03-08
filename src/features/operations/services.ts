import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProductDto = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  product_type: "GOODS" | "SERVICE" | "MEMBERSHIP";
};

export type ActiveShiftDto = {
  shift_id: string;
  opened_at: string;
  status: "OPEN";
};

export type OpenShiftResultDto = {
  shift_id: string;
  opened_at: string;
  journal_entry_id: string;
};

function assertProductType(value: string): "GOODS" | "SERVICE" | "MEMBERSHIP" {
  if (value === "GOODS" || value === "SERVICE" || value === "MEMBERSHIP") {
    return value;
  }

  return "SERVICE";
}

export async function listProducts(): Promise<ProductDto[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return products.map((product) => ({
    product_id: product.id,
    sku: product.sku,
    name: product.name,
    price: Number(product.price),
    product_type: assertProductType(product.productType),
  }));
}

export async function getActiveShiftByStaff(staffId: string): Promise<ActiveShiftDto | null> {
  const shift = await prisma.shift.findFirst({
    where: {
      staffId,
      status: "OPEN",
      endTime: null,
    },
    orderBy: { startTime: "desc" },
  });

  if (!shift) {
    return null;
  }

  return {
    shift_id: shift.id,
    opened_at: shift.startTime.toISOString(),
    status: "OPEN",
  };
}

export async function openShiftWithJournal(staffId: string, startingCash: number): Promise<OpenShiftResultDto> {
  const existing = await getActiveShiftByStaff(staffId);
  if (existing) {
    throw new Error("SHIFT_ALREADY_OPEN");
  }

  const amount = new Prisma.Decimal(startingCash.toFixed(2));

  return prisma.$transaction(async (tx) => {
    const cashAccount = await tx.chartOfAccount.findUnique({ where: { code: "1010" } });
    if (!cashAccount) {
      throw new Error("CASH_ACCOUNT_NOT_FOUND");
    }

    const shiftEquity = await tx.chartOfAccount.upsert({
      where: { code: "3010" },
      update: {
        name: "Shift Equity",
        type: "EQUITY",
        normalBalance: "CREDIT",
      },
      create: {
        code: "3010",
        name: "Shift Equity",
        type: "EQUITY",
        normalBalance: "CREDIT",
      },
    });

    const shift = await tx.shift.create({
      data: {
        staffId,
        startingCash: amount,
        status: "OPEN",
      },
    });

    const journalEntry = await tx.journalEntry.create({
      data: {
        sourceType: "SHIFT_OPEN",
        sourceId: shift.id,
        description: `Open shift ${shift.id}`,
      },
    });

    await tx.journalLine.createMany({
      data: [
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: cashAccount.id,
          debit: amount,
          credit: new Prisma.Decimal(0),
        },
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: shiftEquity.id,
          debit: new Prisma.Decimal(0),
          credit: amount,
        },
      ],
    });

    return {
      shift_id: shift.id,
      opened_at: shift.startTime.toISOString(),
      journal_entry_id: journalEntry.id,
    };
  });
}
