import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProductDto = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  product_type: "GOODS" | "SERVICE" | "MEMBERSHIP";
  revenue_account_id?: string;
};

export type CreateProductInputDto = {
  sku: string;
  name: string;
  price: number;
  product_type: "GOODS" | "SERVICE" | "MEMBERSHIP";
  revenue_account_id?: string;
};

export type UpdateProductInputDto = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  revenue_account_id?: string;
};

export type ActiveShiftDto = {
  shift_id: string;
  opened_at: string;
  starting_cash: number;
  status: "OPEN";
  responsible_name?: string;
};

export type OpenShiftResultDto = {
  shift_id: string;
  opened_at: string;
  journal_entry_id: string;
  responsible_name: string;
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
  responsible_name?: string;
};

export type CloseShiftResultDto = {
  shift_id: string;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  status: "CLOSED";
  journal_entry_id: string;
  responsible_name: string;
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
  sales_rows: Array<{
    order_id: string;
    shift_id?: string;
    order_number: string;
    sold_at: string;
    items_summary: string;
    cashier_name: string;
    responsible_name?: string;
    customer_name: string | null;
    payment_method: PaymentMethod;
    total_amount: number;
  }>;
  shift_rows: Array<{
    shift_id: string;
    closed_at: string;
    responsible_name: string;
    expected_cash: number;
    actual_cash: number;
    difference: number;
  }>;
};

export type ShiftSummaryDto = {
  date: string;
  sales_rows: DailySummaryDto["sales_rows"];
  shift_rows: Array<
    DailySummaryDto["shift_rows"][number] & {
      receipt_count: number;
      sales_by_method: {
        CASH: number;
        PROMPTPAY: number;
        CREDIT_CARD: number;
      };
      total_sales: number;
    }
  >;
  totals: {
    receipt_count: number;
    sales_by_method: {
      CASH: number;
      PROMPTPAY: number;
      CREDIT_CARD: number;
    };
    total_sales: number;
    cash_overage: number;
    cash_shortage: number;
  };
};

export type GeneralLedgerRowDto = {
  date: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
};

export type ChartOfAccountRecordDto = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  is_active: boolean;
  description?: string;
  locked_reason?: string;
};

export type CreateChartOfAccountInput = {
  account_code: string;
  account_name: string;
  account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  description?: string;
};

type LockedSequenceRow = {
  id: string;
  prefix: string;
  currentNo: number;
};

const protectedAccountCodes = new Set(["1010", "3010", "4010", "4020", "5050"]);

function getProtectedAccountReason(accountCode: string): string | null {
  if (!protectedAccountCodes.has(accountCode)) {
    return null;
  }

  return "บัญชีนี้ถูกอ้างอิงในธุรกรรมหลักของระบบ จึงไม่สามารถปิดใช้งานได้";
}

function toNormalBalance(accountType: CreateChartOfAccountInput["account_type"]): "DEBIT" | "CREDIT" {
  return accountType === "ASSET" || accountType === "EXPENSE" ? "DEBIT" : "CREDIT";
}

function toAccountType(
  value: string,
): "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" {
  if (
    value === "ASSET" ||
    value === "LIABILITY" ||
    value === "EQUITY" ||
    value === "REVENUE" ||
    value === "EXPENSE"
  ) {
    return value;
  }

  throw new Error("INVALID_ACCOUNT_TYPE");
}

function mapChartOfAccountRecord(account: {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive?: boolean;
  description?: string | null;
  lockedReason?: string | null;
}): ChartOfAccountRecordDto {
  const protectedReason = getProtectedAccountReason(account.code);

  return {
    account_id: account.id,
    account_code: account.code,
    account_name: account.name,
    account_type: toAccountType(account.type),
    is_active: account.isActive ?? true,
    description: account.description ?? undefined,
    locked_reason: account.lockedReason ?? protectedReason ?? undefined,
  };
}

function assertProductType(value: string): "GOODS" | "SERVICE" | "MEMBERSHIP" {
  if (value === "GOODS" || value === "SERVICE" || value === "MEMBERSHIP") {
    return value;
  }

  return "SERVICE";
}

function mapProductRecord(product: {
  id: string;
  sku: string;
  name: string;
  price: Prisma.Decimal;
  productType: string;
  revenueAccountId?: string | null;
}): ProductDto {
  return {
    product_id: product.id,
    sku: product.sku,
    name: product.name,
    price: Number(product.price),
    product_type: assertProductType(product.productType),
    revenue_account_id: product.revenueAccountId ?? undefined,
  };
}

async function resolveRevenueAccountId(
  client: Prisma.TransactionClient | typeof prisma,
  requestedId: string | undefined,
): Promise<string> {
  if (requestedId) {
    const account = await client.chartOfAccount.findUnique({ where: { id: requestedId } });
    if (!account) {
      throw new Error("REVENUE_ACCOUNT_NOT_FOUND");
    }

    if (account.type !== "REVENUE") {
      throw new Error("INVALID_REVENUE_ACCOUNT_TYPE");
    }

    if (!account.isActive) {
      throw new Error("REVENUE_ACCOUNT_INACTIVE");
    }

    return account.id;
  }

  const defaultRevenueAccount = await client.chartOfAccount.findUnique({ where: { code: "4010" } });
  if (!defaultRevenueAccount) {
    throw new Error("REVENUE_ACCOUNT_NOT_FOUND");
  }

  if (defaultRevenueAccount.type !== "REVENUE") {
    throw new Error("INVALID_REVENUE_ACCOUNT_TYPE");
  }

  if (!defaultRevenueAccount.isActive) {
    throw new Error("REVENUE_ACCOUNT_INACTIVE");
  }

  return defaultRevenueAccount.id;
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

  return products.map((product) =>
    mapProductRecord({
      ...product,
      revenueAccountId: product.revenueAccountId,
    }),
  );
}

export async function createProduct(input: CreateProductInputDto): Promise<ProductDto> {
  const sku = input.sku.trim();
  const name = input.name.trim();

  if (!sku || !name) {
    throw new Error("INVALID_PRODUCT");
  }

  if (input.price < 0) {
    throw new Error("INVALID_PRODUCT_PRICE");
  }

  const productType = assertProductType(input.product_type);
  const revenueAccountId = await resolveRevenueAccountId(prisma, input.revenue_account_id);

  const created = await prisma.product.create({
    data: {
      sku,
      name,
      price: asMoney(input.price),
      productType,
      isActive: true,
      revenueAccountId,
    },
  });

  return mapProductRecord({
    ...created,
    revenueAccountId: created.revenueAccountId,
  });
}

export async function updateProduct(input: UpdateProductInputDto): Promise<ProductDto> {
  const sku = input.sku.trim();
  const name = input.name.trim();

  if (!sku || !name) {
    throw new Error("INVALID_PRODUCT");
  }

  if (input.price < 0) {
    throw new Error("INVALID_PRODUCT_PRICE");
  }

  const existing = await prisma.product.findUnique({ where: { id: input.product_id } });
  if (!existing) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const revenueAccountId = await resolveRevenueAccountId(prisma, input.revenue_account_id);

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      sku,
      name,
      price: asMoney(input.price),
      revenueAccountId,
    },
  });

  return mapProductRecord({
    ...updated,
    revenueAccountId: updated.revenueAccountId,
  });
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
    responsible_name: shift.responsibleName ?? undefined,
  };
}

export async function openShiftWithJournal(
  staffId: string,
  startingCash: number,
  responsibleName: string,
): Promise<OpenShiftResultDto> {
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
        responsibleName,
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
      responsible_name: shift.responsibleName ?? responsibleName,
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
        revenueAccountId: product.revenueAccountId,
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
    const defaultRevenueAccount = await tx.chartOfAccount.findUnique({ where: { code: "4010" } });
    if (!cashAccount || !defaultRevenueAccount) {
      throw new Error("CHART_OF_ACCOUNT_NOT_FOUND");
    }

    const revenueCreditsByAccount = new Map<string, Prisma.Decimal>();
    for (const item of normalizedItems) {
      const accountId = item.revenueAccountId ?? defaultRevenueAccount.id;
      const current = revenueCreditsByAccount.get(accountId) ?? new Prisma.Decimal(0);
      revenueCreditsByAccount.set(accountId, current.add(item.totalPrice));
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
        ...Array.from(revenueCreditsByAccount.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([accountId, creditAmount]) => ({
            journalEntryId: journalEntry.id,
            chartOfAccountId: accountId,
            debit: new Prisma.Decimal(0),
            credit: creditAmount,
          })),
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
        responsibleName: input.responsible_name?.trim() || shift.responsibleName,
      },
    });

    return {
      shift_id: closed.id,
      expected_cash: Number(expectedCash),
      actual_cash: Number(actualCash),
      difference: Number(difference),
      status: "CLOSED",
      journal_entry_id: journalEntry.id,
      responsible_name: closed.responsibleName ?? "ไม่ระบุผู้รับผิดชอบ",
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
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        customerName: true,
        paymentMethod: true,
        totalAmount: true,
        shift: {
          select: {
            id: true,
            staffId: true,
            responsibleName: true,
          },
        },
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
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
        id: true,
        endTime: true,
        expectedCash: true,
        actualCash: true,
        difference: true,
        staffId: true,
        responsibleName: true,
      },
    }),
  ]);

  const staffIds = Array.from(new Set([
    ...orders.map((order) => order.shift.staffId),
    ...closedShifts.map((shift) => shift.staffId),
  ]));
  const users = staffIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: staffIds },
        },
        select: {
          id: true,
          name: true,
          username: true,
        },
      })
    : [];

  const staffNameById = new Map(
    users.map((user) => [user.id, user.name || user.username || user.id]),
  );

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

  const salesRows = orders.map((order) => ({
    order_id: order.id,
    shift_id: order.shift.id,
    order_number: order.orderNumber,
    sold_at: order.createdAt.toISOString(),
    items_summary:
      order.items
        .map((item) => `${item.product.name} x${item.quantity}`)
        .join(", ") || order.orderNumber,
    cashier_name: staffNameById.get(order.shift.staffId) ?? order.shift.staffId,
    responsible_name:
      order.shift.responsibleName ??
      staffNameById.get(order.shift.staffId) ??
      order.shift.staffId,
    customer_name: order.customerName ?? null,
    payment_method: assertPaymentMethod(order.paymentMethod),
    total_amount: Number(Number(order.totalAmount).toFixed(2)),
  }));

  const shiftRows = closedShifts.map((shift) => ({
    shift_id: shift.id ?? `${shift.staffId}-${shift.endTime?.toISOString() ?? from.toISOString()}`,
    closed_at: shift.endTime?.toISOString() ?? from.toISOString(),
    responsible_name:
      shift.responsibleName ??
      staffNameById.get(shift.staffId) ??
      shift.staffId ??
      "ไม่ระบุผู้รับผิดชอบ",
    expected_cash: Number(Number(shift.expectedCash ?? 0).toFixed(2)),
    actual_cash: Number(Number(shift.actualCash ?? 0).toFixed(2)),
    difference: Number(Number(shift.difference ?? 0).toFixed(2)),
  }));

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
    sales_rows: salesRows,
    shift_rows: shiftRows,
  };
}

export async function getShiftSummaryByDate(
  date: string,
  responsibleName?: string,
): Promise<ShiftSummaryDto> {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_DATE");
  }

  const from = parsed;
  const to = new Date(parsed);
  to.setUTCDate(to.getUTCDate() + 1);

  const closedShifts = await prisma.shift.findMany({
    where: {
      status: "CLOSED",
      endTime: {
        gte: from,
        lt: to,
      },
      ...(responsibleName ? { responsibleName } : {}),
    },
    select: {
      id: true,
      endTime: true,
      expectedCash: true,
      actualCash: true,
      difference: true,
      staffId: true,
      responsibleName: true,
    },
    orderBy: { endTime: "desc" },
  });

  if (closedShifts.length === 0) {
    return {
      date,
      sales_rows: [],
      shift_rows: [],
      totals: {
        receipt_count: 0,
        sales_by_method: {
          CASH: 0,
          PROMPTPAY: 0,
          CREDIT_CARD: 0,
        },
        total_sales: 0,
        cash_overage: 0,
        cash_shortage: 0,
      },
    };
  }

  const shiftIdSet = new Set(closedShifts.map((shift) => shift.id));

  const orders = await prisma.order.findMany({
    where: {
      status: "COMPLETED",
      shiftId: {
        in: Array.from(shiftIdSet),
      },
      createdAt: {
        gte: from,
        lt: to,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      customerName: true,
      paymentMethod: true,
      totalAmount: true,
      shift: {
        select: {
          id: true,
          staffId: true,
          responsibleName: true,
        },
      },
      items: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const staffIds = Array.from(
    new Set([
      ...closedShifts.map((shift) => shift.staffId),
      ...orders.map((order) => order.shift.staffId),
    ]),
  );
  const users = staffIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: staffIds },
        },
        select: {
          id: true,
          name: true,
          username: true,
        },
      })
    : [];

  const staffNameById = new Map(users.map((user) => [user.id, user.name || user.username || user.id]));

  const salesRows: ShiftSummaryDto["sales_rows"] = orders.map((order) => ({
    order_id: order.id,
    shift_id: order.shift.id,
    order_number: order.orderNumber,
    sold_at: order.createdAt.toISOString(),
    items_summary:
      order.items
        .map((item) => `${item.product.name} x${item.quantity}`)
        .join(", ") || order.orderNumber,
    cashier_name: staffNameById.get(order.shift.staffId) ?? order.shift.staffId,
    responsible_name:
      order.shift.responsibleName ??
      staffNameById.get(order.shift.staffId) ??
      order.shift.staffId,
    customer_name: order.customerName ?? null,
    payment_method: assertPaymentMethod(order.paymentMethod),
    total_amount: Number(Number(order.totalAmount).toFixed(2)),
  }));

  const shiftSalesById = new Map<
    string,
    {
      receipt_count: number;
      sales_by_method: {
        CASH: number;
        PROMPTPAY: number;
        CREDIT_CARD: number;
      };
      total_sales: number;
    }
  >();

  for (const row of salesRows) {
    const shiftId = String(row.shift_id ?? "");
    if (!shiftId) {
      continue;
    }

    const current = shiftSalesById.get(shiftId) ?? {
      receipt_count: 0,
      sales_by_method: {
        CASH: 0,
        PROMPTPAY: 0,
        CREDIT_CARD: 0,
      },
      total_sales: 0,
    };

    current.receipt_count += 1;
    current.sales_by_method[row.payment_method] += row.total_amount;
    current.total_sales += row.total_amount;
    shiftSalesById.set(shiftId, current);
  }

  const shiftRows: ShiftSummaryDto["shift_rows"] = closedShifts.map((shift) => {
    const aggregate = shiftSalesById.get(shift.id) ?? {
      receipt_count: 0,
      sales_by_method: {
        CASH: 0,
        PROMPTPAY: 0,
        CREDIT_CARD: 0,
      },
      total_sales: 0,
    };

    return {
      shift_id: shift.id,
      closed_at: shift.endTime?.toISOString() ?? from.toISOString(),
      responsible_name:
        shift.responsibleName ??
        staffNameById.get(shift.staffId) ??
        shift.staffId ??
        "ไม่ระบุผู้รับผิดชอบ",
      expected_cash: Number(Number(shift.expectedCash ?? 0).toFixed(2)),
      actual_cash: Number(Number(shift.actualCash ?? 0).toFixed(2)),
      difference: Number(Number(shift.difference ?? 0).toFixed(2)),
      receipt_count: aggregate.receipt_count,
      sales_by_method: {
        CASH: Number(aggregate.sales_by_method.CASH.toFixed(2)),
        PROMPTPAY: Number(aggregate.sales_by_method.PROMPTPAY.toFixed(2)),
        CREDIT_CARD: Number(aggregate.sales_by_method.CREDIT_CARD.toFixed(2)),
      },
      total_sales: Number(aggregate.total_sales.toFixed(2)),
    };
  });

  const totals = shiftRows.reduce(
    (acc, row) => {
      acc.receipt_count += row.receipt_count;
      acc.sales_by_method.CASH += row.sales_by_method.CASH;
      acc.sales_by_method.PROMPTPAY += row.sales_by_method.PROMPTPAY;
      acc.sales_by_method.CREDIT_CARD += row.sales_by_method.CREDIT_CARD;
      acc.total_sales += row.total_sales;
      if (row.difference > 0) {
        acc.cash_overage += row.difference;
      } else if (row.difference < 0) {
        acc.cash_shortage += Math.abs(row.difference);
      }
      return acc;
    },
    {
      receipt_count: 0,
      sales_by_method: {
        CASH: 0,
        PROMPTPAY: 0,
        CREDIT_CARD: 0,
      },
      total_sales: 0,
      cash_overage: 0,
      cash_shortage: 0,
    },
  );

  return {
    date,
    sales_rows: salesRows,
    shift_rows: shiftRows,
    totals: {
      receipt_count: totals.receipt_count,
      sales_by_method: {
        CASH: Number(totals.sales_by_method.CASH.toFixed(2)),
        PROMPTPAY: Number(totals.sales_by_method.PROMPTPAY.toFixed(2)),
        CREDIT_CARD: Number(totals.sales_by_method.CREDIT_CARD.toFixed(2)),
      },
      total_sales: Number(totals.total_sales.toFixed(2)),
      cash_overage: Number(totals.cash_overage.toFixed(2)),
      cash_shortage: Number(totals.cash_shortage.toFixed(2)),
    },
  };
}

export async function getGeneralLedgerReport(
  startDate: string,
  endDate: string,
): Promise<GeneralLedgerRowDto[]> {
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(end.getTime()) || from > end) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const to = new Date(end);
  to.setUTCDate(to.getUTCDate() + 1);

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        date: {
          gte: from,
          lt: to,
        },
      },
    },
    include: {
      chartOfAccount: {
        select: {
          code: true,
          name: true,
        },
      },
      journalEntry: {
        select: {
          date: true,
          description: true,
        },
      },
    },
    orderBy: [
      {
        journalEntry: {
          date: "asc",
        },
      },
      {
        chartOfAccount: {
          code: "asc",
        },
      },
      {
        id: "asc",
      },
    ],
  });

  return lines.map((line) => ({
    date: line.journalEntry.date.toISOString().slice(0, 10),
    account_code: line.chartOfAccount.code,
    account_name: line.chartOfAccount.name,
    debit: Number(line.debit),
    credit: Number(line.credit),
    description: line.journalEntry.description ?? "",
  }));
}

export async function listChartOfAccounts(): Promise<ChartOfAccountRecordDto[]> {
  const accounts = await prisma.chartOfAccount.findMany({
    orderBy: [{ code: "asc" }],
  });

  return accounts.map((account) =>
    mapChartOfAccountRecord({
      ...account,
      isActive: account.isActive,
      description: account.description,
      lockedReason: account.lockedReason,
    }),
  );
}

export async function createChartOfAccount(
  input: CreateChartOfAccountInput,
): Promise<ChartOfAccountRecordDto> {
  const accountCode = input.account_code.trim();
  const accountName = input.account_name.trim();

  if (!/^\d{4,}$/.test(accountCode)) {
    throw new Error("INVALID_ACCOUNT_CODE");
  }

  if (accountName.length < 3) {
    throw new Error("INVALID_ACCOUNT_NAME");
  }

  const created = await prisma.chartOfAccount.create({
    data: {
      code: accountCode,
      name: accountName,
      type: input.account_type,
      normalBalance: toNormalBalance(input.account_type),
      isActive: true,
      description: input.description?.trim() || null,
      lockedReason: null,
    },
  });

  return mapChartOfAccountRecord({
    ...created,
    isActive: created.isActive,
    description: created.description,
    lockedReason: created.lockedReason,
  });
}

export async function toggleChartOfAccount(accountId: string): Promise<ChartOfAccountRecordDto> {
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  const protectedReason = getProtectedAccountReason(account.code);
  const lockedReason = account.lockedReason ?? protectedReason;

  if (lockedReason) {
    throw new Error("ACCOUNT_LOCKED");
  }

  const updated = await prisma.chartOfAccount.update({
    where: { id: accountId },
    data: {
      isActive: !account.isActive,
    },
  });

  return mapChartOfAccountRecord({
    ...updated,
    isActive: updated.isActive,
    description: updated.description,
    lockedReason: updated.lockedReason,
  });
}
