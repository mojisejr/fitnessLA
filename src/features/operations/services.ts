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
  starting_cash: number;
  status: "OPEN";
};

export type OpenShiftResultDto = {
  shift_id: string;
  opened_at: string;
  journal_entry_id: string;
};

type PaymentMethod = "CASH" | "PROMPTPAY" | "CREDIT_CARD";

export type CreateOrderInput = {
  shift_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  payment_method: PaymentMethod;
  customer_info?: {
    name: string;
    tax_id?: string;
  };
  simulate_journal_failure?: boolean;
};

export type CreateOrderResultDto = {
  order_id: string;
  order_number: string;
  total_amount: number;
  tax_doc_number: string;
  status: "COMPLETED";
};

export type CreateExpenseInput = {
  shift_id: string;
  account_id: string;
  amount: number;
  description: string;
  receipt_url?: string;
};

export type CreateExpenseResultDto = {
  expense_id: string;
  status: "POSTED";
};

export type CloseShiftInput = {
  actual_cash: number;
  closing_note?: string;
};

export type CloseShiftResultDto = {
  shift_id: string;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  status: "CLOSED";
  journal_entry_id: string;
};

export type DailySummaryDto = {
  total_sales: number;
  sales_by_method: {
    CASH: number;
    PROMPTPAY: number;
    CREDIT_CARD: number;
  };
  total_expenses: number;
  net_cash_flow: number;
  shift_discrepancies: number;
};

type LockedSequenceRow = {
  id: string;
  prefix: string;
  currentNo: number;
};

function assertProductType(value: string): "GOODS" | "SERVICE" | "MEMBERSHIP" {
  if (value === "GOODS" || value === "SERVICE" || value === "MEMBERSHIP") {
    return value;
  }

  return "SERVICE";
}

function assertPaymentMethod(value: string): PaymentMethod {
  if (value === "CASH" || value === "PROMPTPAY" || value === "CREDIT_CARD") {
    return value;
  }

  throw new Error("INVALID_PAYMENT_METHOD");
}

function asMoney(amount: number): Prisma.Decimal {
  return new Prisma.Decimal(amount.toFixed(2));
}

async function reserveDocumentNumber(
  tx: Prisma.TransactionClient,
  sequenceType: string,
  defaultPrefix: string,
): Promise<{ sequenceId: string; documentNumber: string }> {
  await tx.documentSequence.upsert({
    where: { type: sequenceType },
    update: {},
    create: {
      type: sequenceType,
      prefix: defaultPrefix,
      currentNo: 0,
    },
  });

  const rows = await tx.$queryRaw<LockedSequenceRow[]>`
    SELECT "id", "prefix", "currentNo"
    FROM "document_sequences"
    WHERE "type" = ${sequenceType}
    FOR UPDATE
  `;

  const locked = rows[0];
  if (!locked) {
    throw new Error("SEQUENCE_NOT_FOUND");
  }

  const nextNo = locked.currentNo + 1;
  await tx.documentSequence.update({
    where: { id: locked.id },
    data: { currentNo: nextNo },
  });

  const running = String(nextNo).padStart(4, "0");
  const year = new Date().getUTCFullYear();

  return {
    sequenceId: locked.id,
    documentNumber: `${locked.prefix}-${year}-${running}`,
  };
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
    starting_cash: Number(shift.startingCash),
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

export async function createOrderWithJournal(
  staffId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResultDto> {
  if (input.items.length === 0) {
    throw new Error("ORDER_ITEMS_REQUIRED");
  }

  for (const item of input.items) {
    if (!item.product_id || item.quantity <= 0) {
      throw new Error("INVALID_ORDER_ITEM");
    }
  }

  const paymentMethod = assertPaymentMethod(input.payment_method);

  return prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id: input.shift_id } });
    if (!shift) {
      throw new Error("SHIFT_NOT_FOUND");
    }

    if (shift.staffId !== staffId) {
      throw new Error("SHIFT_OWNER_MISMATCH");
    }

    if (shift.status !== "OPEN" || shift.endTime !== null) {
      throw new Error("SHIFT_NOT_OPEN");
    }

    const productIds = input.items.map((item) => item.product_id);
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = input.items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const unitPrice = product.price;
      const totalPrice = unitPrice.mul(new Prisma.Decimal(item.quantity));

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const totalAmount = normalizedItems.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Prisma.Decimal(0),
    );

    const orderSequence = await reserveDocumentNumber(tx, "ORDER", "ORD");
    const taxSequence = await reserveDocumentNumber(tx, "INVOICE", "INV");

    const order = await tx.order.create({
      data: {
        orderNumber: orderSequence.documentNumber,
        shiftId: shift.id,
        paymentMethod,
        totalAmount,
        customerName: input.customer_info?.name,
        customerTaxId: input.customer_info?.tax_id,
        status: "COMPLETED",
      },
    });

    await tx.orderItem.createMany({
      data: normalizedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    });

    await tx.taxDocument.create({
      data: {
        orderId: order.id,
        sequenceId: taxSequence.sequenceId,
        docType: "INVOICE",
        docNumber: taxSequence.documentNumber,
        customerName: input.customer_info?.name,
        customerTaxId: input.customer_info?.tax_id,
      },
    });

    if (input.simulate_journal_failure) {
      throw new Error("SIMULATED_JOURNAL_FAILURE");
    }

    const cashAccount = await tx.chartOfAccount.findUnique({ where: { code: "1010" } });
    const revenueAccount = await tx.chartOfAccount.findUnique({ where: { code: "4010" } });
    if (!cashAccount || !revenueAccount) {
      throw new Error("CHART_OF_ACCOUNT_NOT_FOUND");
    }

    const journalEntry = await tx.journalEntry.create({
      data: {
        sourceType: "SALE",
        sourceId: order.id,
        description: `Order ${order.orderNumber}`,
      },
    });

    await tx.journalLine.createMany({
      data: [
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: cashAccount.id,
          debit: totalAmount,
          credit: new Prisma.Decimal(0),
        },
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: revenueAccount.id,
          debit: new Prisma.Decimal(0),
          credit: totalAmount,
        },
      ],
    });

    if (paymentMethod === "CASH") {
      const baselineExpected = new Prisma.Decimal(shift.expectedCash ?? shift.startingCash);
      await tx.shift.update({
        where: { id: shift.id },
        data: {
          expectedCash: baselineExpected.add(totalAmount),
        },
      });
    }

    return {
      order_id: order.id,
      order_number: order.orderNumber,
      total_amount: Number(totalAmount),
      tax_doc_number: taxSequence.documentNumber,
      status: "COMPLETED",
    };
  });
}

export async function postExpenseWithJournal(
  staffId: string,
  input: CreateExpenseInput,
): Promise<CreateExpenseResultDto> {
  if (!input.account_id) {
    throw new Error("ACCOUNT_ID_REQUIRED");
  }

  if (!input.description.trim()) {
    throw new Error("EXPENSE_DESCRIPTION_REQUIRED");
  }

  if (input.amount <= 0) {
    throw new Error("INVALID_EXPENSE_AMOUNT");
  }

  const amount = asMoney(input.amount);

  return prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id: input.shift_id } });
    if (!shift) {
      throw new Error("SHIFT_NOT_FOUND");
    }

    if (shift.staffId !== staffId) {
      throw new Error("SHIFT_OWNER_MISMATCH");
    }

    if (shift.status !== "OPEN" || shift.endTime !== null) {
      throw new Error("SHIFT_NOT_OPEN");
    }

    const expenseAccount = await tx.chartOfAccount.findUnique({ where: { id: input.account_id } });
    const cashAccount = await tx.chartOfAccount.findUnique({ where: { code: "1010" } });
    if (!expenseAccount || !cashAccount) {
      throw new Error("CHART_OF_ACCOUNT_NOT_FOUND");
    }

    const expense = await tx.expense.create({
      data: {
        shiftId: shift.id,
        chartOfAccountId: expenseAccount.id,
        amount,
        description: input.description,
        receiptUrl: input.receipt_url,
        status: "POSTED",
      },
    });

    const journalEntry = await tx.journalEntry.create({
      data: {
        sourceType: "EXPENSE",
        sourceId: expense.id,
        description: `Expense ${expense.id}`,
      },
    });

    await tx.journalLine.createMany({
      data: [
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: expenseAccount.id,
          debit: amount,
          credit: new Prisma.Decimal(0),
        },
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: cashAccount.id,
          debit: new Prisma.Decimal(0),
          credit: amount,
        },
      ],
    });

    const baselineExpected = new Prisma.Decimal(shift.expectedCash ?? shift.startingCash);
    await tx.shift.update({
      where: { id: shift.id },
      data: {
        expectedCash: baselineExpected.sub(amount),
      },
    });

    return {
      expense_id: expense.id,
      status: "POSTED",
    };
  });
}

export async function closeActiveShiftWithDifference(
  staffId: string,
  input: CloseShiftInput,
): Promise<CloseShiftResultDto> {
  if (input.actual_cash < 0) {
    throw new Error("INVALID_ACTUAL_CASH");
  }

  return prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findFirst({
      where: {
        staffId,
        status: "OPEN",
        endTime: null,
      },
      orderBy: { startTime: "desc" },
    });

    if (!shift) {
      throw new Error("SHIFT_NOT_FOUND");
    }

    const expectedCash = new Prisma.Decimal(shift.expectedCash ?? shift.startingCash);
    const actualCash = asMoney(input.actual_cash);
    const difference = actualCash.sub(expectedCash);

    const cashAccount = await tx.chartOfAccount.findUnique({ where: { code: "1010" } });
    if (!cashAccount) {
      throw new Error("CHART_OF_ACCOUNT_NOT_FOUND");
    }

    const shortageAccount = await tx.chartOfAccount.upsert({
      where: { code: "5050" },
      update: {
        name: "Cash Shortage",
        type: "EXPENSE",
        normalBalance: "DEBIT",
      },
      create: {
        code: "5050",
        name: "Cash Shortage",
        type: "EXPENSE",
        normalBalance: "DEBIT",
      },
    });

    const overageAccount = await tx.chartOfAccount.upsert({
      where: { code: "4020" },
      update: {
        name: "Cash Overage",
        type: "REVENUE",
        normalBalance: "CREDIT",
      },
      create: {
        code: "4020",
        name: "Cash Overage",
        type: "REVENUE",
        normalBalance: "CREDIT",
      },
    });

    const journalEntry = await tx.journalEntry.create({
      data: {
        sourceType: "SHIFT_DIFF",
        sourceId: shift.id,
        description: input.closing_note?.trim() || `Shift close ${shift.id}`,
      },
    });

    const lines: Array<{
      journalEntryId: string;
      chartOfAccountId: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
    }> = [];

    if (difference.gt(0)) {
      lines.push(
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: cashAccount.id,
          debit: difference,
          credit: new Prisma.Decimal(0),
        },
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: overageAccount.id,
          debit: new Prisma.Decimal(0),
          credit: difference,
        },
      );
    } else if (difference.lt(0)) {
      const shortageAmount = difference.abs();
      lines.push(
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: shortageAccount.id,
          debit: shortageAmount,
          credit: new Prisma.Decimal(0),
        },
        {
          journalEntryId: journalEntry.id,
          chartOfAccountId: cashAccount.id,
          debit: new Prisma.Decimal(0),
          credit: shortageAmount,
        },
      );
    }

    if (lines.length > 0) {
      await tx.journalLine.createMany({ data: lines });
    }

    const closed = await tx.shift.update({
      where: { id: shift.id },
      data: {
        status: "CLOSED",
        endTime: new Date(),
        expectedCash,
        actualCash,
        difference,
      },
    });

    return {
      shift_id: closed.id,
      expected_cash: Number(expectedCash),
      actual_cash: Number(actualCash),
      difference: Number(difference),
      status: "CLOSED",
      journal_entry_id: journalEntry.id,
    };
  });
}

export async function getDailySummaryByDate(date: string): Promise<DailySummaryDto> {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_DATE");
  }

  const from = parsed;
  const to = new Date(parsed);
  to.setUTCDate(to.getUTCDate() + 1);

  const [orders, expenses, closedShifts] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: from,
          lt: to,
        },
      },
      select: {
        paymentMethod: true,
        totalAmount: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        status: "POSTED",
        createdAt: {
          gte: from,
          lt: to,
        },
      },
      select: {
        amount: true,
      },
    }),
    prisma.shift.findMany({
      where: {
        status: "CLOSED",
        endTime: {
          gte: from,
          lt: to,
        },
      },
      select: {
        difference: true,
      },
    }),
  ]);

  const salesByMethod = {
    CASH: 0,
    PROMPTPAY: 0,
    CREDIT_CARD: 0,
  };

  let totalSales = 0;
  for (const order of orders) {
    const amount = Number(order.totalAmount);
    totalSales += amount;
    const method = assertPaymentMethod(order.paymentMethod);
    salesByMethod[method] += amount;
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const shiftDiscrepancies = closedShifts.reduce(
    (sum, shift) => sum + Number(shift.difference ?? 0),
    0,
  );

  return {
    total_sales: Number(totalSales.toFixed(2)),
    sales_by_method: {
      CASH: Number(salesByMethod.CASH.toFixed(2)),
      PROMPTPAY: Number(salesByMethod.PROMPTPAY.toFixed(2)),
      CREDIT_CARD: Number(salesByMethod.CREDIT_CARD.toFixed(2)),
    },
    total_expenses: Number(totalExpenses.toFixed(2)),
    net_cash_flow: Number((salesByMethod.CASH - totalExpenses).toFixed(2)),
    shift_discrepancies: Number(shiftDiscrepancies.toFixed(2)),
  };
}
