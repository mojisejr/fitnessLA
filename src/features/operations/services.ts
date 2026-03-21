import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { MemberSubscriptionRecord } from "@/lib/contracts";
import { POS_CATEGORY_DEFINITIONS, getPosSalesCategoryFromSku } from "@/lib/pos-categories";

export type ProductDto = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  product_type: "GOODS" | "SERVICE" | "MEMBERSHIP";
  revenue_account_id?: string;
  track_stock?: boolean;
  stock_on_hand?: number | null;
  membership_period?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membership_duration_days?: number | null;
};

export type CreateProductInputDto = {
  sku: string;
  name: string;
  price: number;
  product_type: "GOODS" | "SERVICE" | "MEMBERSHIP";
  revenue_account_id?: string;
  stock_on_hand?: number | null;
  membership_period?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membership_duration_days?: number | null;
};

export type UpdateProductInputDto = {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  revenue_account_id?: string;
  stock_on_hand?: number | null;
  membership_period?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membership_duration_days?: number | null;
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
    trainer_id?: string;
    service_start_date?: string;
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

export type CreateSpecialMemberInputDto = {
  full_name: string;
  phone?: string;
  membership_name: string;
  membership_period: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
  started_at: string;
  expires_at: string;
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
  report_period: "DAY" | "WEEK" | "MONTH" | "CUSTOM";
  range_start: string;
  range_end: string;
  total_sales: number;
  sales_by_method: {
    CASH: number;
    PROMPTPAY: number;
    CREDIT_CARD: number;
  };
  sales_by_category: Array<{
    category: string;
    label: string;
    total_amount: number;
    receipt_count: number;
    item_count: number;
  }>;
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

export type ShiftInventorySummaryRowDto = {
  product_id: string;
  sku: string;
  name: string;
  opening_stock: number;
  sold_quantity: number;
  remaining_stock: number;
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

function inferMembershipPeriod(
  sku: string,
  membershipPeriod?: string | null,
): "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null {
  if (
    membershipPeriod === "DAILY" ||
    membershipPeriod === "MONTHLY" ||
    membershipPeriod === "QUARTERLY" ||
    membershipPeriod === "SEMIANNUAL" ||
    membershipPeriod === "YEARLY"
  ) {
    return membershipPeriod;
  }

  if (sku === "DAYPASS") {
    return "DAILY";
  }

  if (sku === "MEM-MONTH") {
    return "MONTHLY";
  }

  if (sku === "MEM-3MONTH") {
    return "QUARTERLY";
  }

  if (sku === "MEM-6MONTH") {
    return "SEMIANNUAL";
  }

  if (sku === "MEM-YEAR") {
    return "YEARLY";
  }

  return null;
}

function defaultMembershipDurationDays(period: ProductDto["membership_period"]): number | null {
  switch (period) {
    case "DAILY":
      return 1;
    case "MONTHLY":
      return 30;
    case "QUARTERLY":
      return 90;
    case "SEMIANNUAL":
      return 180;
    case "YEARLY":
      return 365;
    default:
      return null;
  }
}

function normalizeMembershipMetadata(input: {
  productType: "GOODS" | "SERVICE" | "MEMBERSHIP";
  sku: string;
  membershipPeriod?: ProductDto["membership_period"];
  membershipDurationDays?: number | null;
}) {
  if (input.productType !== "MEMBERSHIP") {
    return {
      membershipPeriod: null,
      membershipDurationDays: null,
      trackStock: false,
      stockOnHand: null,
    };
  }

  const period = inferMembershipPeriod(input.sku, input.membershipPeriod);
  const duration = input.membershipDurationDays ?? defaultMembershipDurationDays(period);

  return {
    membershipPeriod: period,
    membershipDurationDays: duration,
    trackStock: false,
    stockOnHand: null,
  };
}

function calculateMembershipExpiry(startedAt: Date, durationDays: number) {
  const expiresAt = new Date(startedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays);
  expiresAt.setUTCHours(23, 59, 59, 0);
  return expiresAt;
}

function createSpecialMembershipSkuSeed(name: string) {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return normalized || "SPECIAL";
}

async function ensureSpecialMembershipProduct(
  tx: Prisma.TransactionClient,
  input: Pick<CreateSpecialMemberInputDto, "membership_name" | "membership_period">,
) {
  const existing = await tx.product.findFirst({
    where: {
      productType: "MEMBERSHIP",
      isActive: true,
      name: input.membership_name,
      membershipPeriod: input.membership_period,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      membershipPeriod: true,
    },
  });

  if (existing) {
    return existing;
  }

  const productSequence = await reserveDocumentNumber(tx, "SPECIAL_MEMBERSHIP_PRODUCT", "SPM");
  const seededSku = createSpecialMembershipSkuSeed(input.membership_name);
  const durationDays = defaultMembershipDurationDays(input.membership_period) ?? 30;

  return tx.product.create({
    data: {
      sku: `${productSequence.documentNumber}-${seededSku}`,
      name: input.membership_name,
      price: new Prisma.Decimal("0.00"),
      productType: "MEMBERSHIP",
      isActive: true,
      trackStock: false,
      stockOnHand: null,
      membershipPeriod: input.membership_period,
      membershipDurationDays: durationDays,
      revenueAccountId: null,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      membershipPeriod: true,
    },
  });
}

function createMembershipPhone(customerInfo: CreateOrderInput["customer_info"]) {
  return customerInfo?.tax_id?.trim() || "รออัปเดตเบอร์โทร";
}

function mapProductRecord(product: {
  id: string;
  sku: string;
  name: string;
  price: Prisma.Decimal;
  productType: string;
  revenueAccountId?: string | null;
  trackStock?: boolean | null;
  stockOnHand?: number | null;
  membershipPeriod?: string | null;
  membershipDurationDays?: number | null;
}): ProductDto {
  const productType = assertProductType(product.productType);
  const membershipPeriod = inferMembershipPeriod(product.sku, product.membershipPeriod);

  return {
    product_id: product.id,
    sku: product.sku,
    name: product.name,
    price: Number(product.price),
    product_type: productType,
    revenue_account_id: product.revenueAccountId ?? undefined,
    track_stock: product.trackStock ?? productType === "GOODS",
    stock_on_hand: product.trackStock ?? productType === "GOODS" ? product.stockOnHand ?? 0 : null,
    membership_period: productType === "MEMBERSHIP" ? membershipPeriod : null,
    membership_duration_days:
      productType === "MEMBERSHIP"
        ? product.membershipDurationDays ?? defaultMembershipDurationDays(membershipPeriod)
        : null,
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

export async function listMembers(): Promise<MemberSubscriptionRecord[]> {
  const members = await prisma.memberSubscription.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      startedAt: true,
      expiresAt: true,
      checkedInAt: true,
      renewedAt: true,
      renewalStatus: true,
      renewalMethod: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
          membershipDurationDays: true,
        },
      },
      trainingEnrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          trainer: { select: { id: true, fullName: true } },
          packageProduct: { select: { name: true, sku: true } },
        },
      },
    },
  });

  const now = new Date();

  return members.map((member) => {
    let training_summary: MemberSubscriptionRecord["training_summary"];

    if (member.trainingEnrollments.length > 0) {
      const latest = member.trainingEnrollments[0];
      const training_status = resolveTrainingEnrollmentStatus(latest, now);

      training_summary = {
        training_status,
        trainer_id: latest.trainer?.id ?? null,
        trainer_name: latest.trainer?.fullName ?? null,
        training_package_name: latest.packageProduct?.name ?? latest.packageNameSnapshot,
        training_package_sku: latest.packageProduct?.sku ?? latest.packageSkuSnapshot,
        training_started_at: latest.startedAt.toISOString(),
        training_expires_at: latest.expiresAt?.toISOString() ?? null,
      };
    }

    return {
      member_id: member.id,
      member_code: member.memberCode,
      full_name: member.fullName,
      phone: member.phone,
      is_active: member.isActive,
      membership_product_id: member.membershipProduct.id,
      membership_name: member.membershipProduct.name,
      membership_period:
        inferMembershipPeriod(member.membershipProduct.sku, member.membershipProduct.membershipPeriod) ?? "MONTHLY",
      started_at: member.startedAt.toISOString(),
      expires_at: member.expiresAt.toISOString(),
      checked_in_at: member.checkedInAt?.toISOString() ?? null,
      renewed_at: member.renewedAt?.toISOString() ?? null,
      renewal_status: member.renewalStatus === "RENEWED" ? "RENEWED" : "ACTIVE",
      renewal_method: (member.renewalMethod as MemberSubscriptionRecord["renewal_method"]) ?? "NONE",
      training_summary,
    };
  });
}

export async function renewMember(memberId: string): Promise<MemberSubscriptionRecord> {
  if (!memberId.trim()) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const member = await prisma.memberSubscription.findUnique({
    where: { id: memberId.trim() },
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      startedAt: true,
      expiresAt: true,
      checkedInAt: true,
      renewedAt: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
          membershipDurationDays: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (!member.isActive) {
    throw new Error("MEMBER_INACTIVE");
  }

  const membershipPeriod = inferMembershipPeriod(
    member.membershipProduct.sku,
    member.membershipProduct.membershipPeriod,
  ) ?? "MONTHLY";
  const durationDays = member.membershipProduct.membershipDurationDays ?? defaultMembershipDurationDays(membershipPeriod) ?? 30;
  const now = new Date();
  const nextStart = member.expiresAt > now ? new Date(member.expiresAt) : now;
  nextStart.setUTCDate(nextStart.getUTCDate() + 1);
  nextStart.setUTCHours(0, 0, 0, 0);
  const renewedAt = new Date();

  const updated = await prisma.memberSubscription.update({
    where: { id: member.id },
    data: {
      startedAt: nextStart,
      expiresAt: calculateMembershipExpiry(nextStart, durationDays),
      renewedAt,
      renewalStatus: "RENEWED",
      renewalMethod: "EXTEND_FROM_PREVIOUS_END",
    },
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      startedAt: true,
      expiresAt: true,
      checkedInAt: true,
      renewedAt: true,
      renewalStatus: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
        },
      },
    },
  });

  return {
    member_id: updated.id,
    member_code: updated.memberCode,
    full_name: updated.fullName,
    phone: updated.phone,
    is_active: updated.isActive,
    membership_product_id: updated.membershipProduct.id,
    membership_name: updated.membershipProduct.name,
    membership_period: inferMembershipPeriod(updated.membershipProduct.sku, updated.membershipProduct.membershipPeriod) ?? "MONTHLY",
    started_at: updated.startedAt.toISOString(),
    expires_at: updated.expiresAt.toISOString(),
    checked_in_at: updated.checkedInAt?.toISOString() ?? null,
    renewed_at: updated.renewedAt?.toISOString() ?? null,
    renewal_status: "RENEWED",
    renewal_method: "EXTEND_FROM_PREVIOUS_END",
  };
}

export async function restartMember(memberId: string): Promise<MemberSubscriptionRecord> {
  if (!memberId.trim()) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const member = await prisma.memberSubscription.findUnique({
    where: { id: memberId.trim() },
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      checkedInAt: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
          membershipDurationDays: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (!member.isActive) {
    throw new Error("MEMBER_INACTIVE");
  }

  const membershipPeriod = inferMembershipPeriod(
    member.membershipProduct.sku,
    member.membershipProduct.membershipPeriod,
  ) ?? "MONTHLY";
  const durationDays = member.membershipProduct.membershipDurationDays ?? defaultMembershipDurationDays(membershipPeriod) ?? 30;
  const restartedAt = new Date();

  const updated = await prisma.memberSubscription.update({
    where: { id: member.id },
    data: {
      startedAt: restartedAt,
      expiresAt: calculateMembershipExpiry(restartedAt, durationDays),
      renewedAt: restartedAt,
      renewalStatus: "ACTIVE",
      renewalMethod: "RESTART_FROM_NEW_START",
    },
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      startedAt: true,
      expiresAt: true,
      checkedInAt: true,
      renewedAt: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
        },
      },
    },
  });

  return {
    member_id: updated.id,
    member_code: updated.memberCode,
    full_name: updated.fullName,
    phone: updated.phone,
    is_active: updated.isActive,
    membership_product_id: updated.membershipProduct.id,
    membership_name: updated.membershipProduct.name,
    membership_period: inferMembershipPeriod(updated.membershipProduct.sku, updated.membershipProduct.membershipPeriod) ?? "MONTHLY",
    started_at: updated.startedAt.toISOString(),
    expires_at: updated.expiresAt.toISOString(),
    checked_in_at: updated.checkedInAt?.toISOString() ?? null,
    renewed_at: updated.renewedAt?.toISOString() ?? null,
    renewal_status: "ACTIVE",
    renewal_method: "RESTART_FROM_NEW_START",
  };
}

export async function createSpecialMember(input: CreateSpecialMemberInputDto): Promise<MemberSubscriptionRecord> {
  const fullName = input.full_name.trim();
  if (!fullName) {
    throw new Error("MEMBER_NAME_REQUIRED");
  }

  const startedAt = new Date(input.started_at);
  const expiresAt = new Date(input.expires_at);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    throw new Error("INVALID_DATE");
  }

  if (expiresAt <= startedAt) {
    throw new Error("EXPIRES_BEFORE_START");
  }

  return prisma.$transaction(async (tx) => {
    const membershipProduct = await ensureSpecialMembershipProduct(tx, {
      membership_name: input.membership_name.trim(),
      membership_period: input.membership_period,
    });
    const memberSequence = await reserveDocumentNumber(tx, "MEMBER", "MBR");

    const created = await tx.memberSubscription.create({
      data: {
        memberCode: memberSequence.documentNumber,
        fullName,
        phone: input.phone?.trim() || "รออัปเดตเบอร์โทร",
        membershipProductId: membershipProduct.id,
        isActive: true,
        startedAt,
        expiresAt,
        renewalStatus: "ACTIVE",
        renewalMethod: "NONE",
      },
      select: {
        id: true,
        memberCode: true,
        fullName: true,
        phone: true,
        startedAt: true,
        expiresAt: true,
        checkedInAt: true,
        renewedAt: true,
        membershipProduct: {
          select: {
            id: true,
            name: true,
            sku: true,
            membershipPeriod: true,
          },
        },
      },
    });

    return {
      member_id: created.id,
      member_code: created.memberCode,
      full_name: created.fullName,
      phone: created.phone,
        is_active: true,
      membership_product_id: created.membershipProduct.id,
      membership_name: created.membershipProduct.name,
      membership_period:
        inferMembershipPeriod(created.membershipProduct.sku, created.membershipProduct.membershipPeriod) ??
        input.membership_period,
      started_at: created.startedAt.toISOString(),
      expires_at: created.expiresAt.toISOString(),
      checked_in_at: created.checkedInAt?.toISOString() ?? null,
      renewed_at: created.renewedAt?.toISOString() ?? null,
      renewal_status: "ACTIVE",
      renewal_method: "NONE",
    };
  });
}

export async function toggleMemberActive(memberId: string): Promise<MemberSubscriptionRecord> {
  const normalizedMemberId = memberId.trim();
  if (!normalizedMemberId) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const member = await prisma.memberSubscription.findUnique({
    where: { id: normalizedMemberId },
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      startedAt: true,
      expiresAt: true,
      checkedInAt: true,
      renewedAt: true,
      renewalStatus: true,
      renewalMethod: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const updated = await prisma.memberSubscription.update({
    where: { id: member.id },
    data: {
      isActive: !member.isActive,
    },
    select: {
      id: true,
      memberCode: true,
      fullName: true,
      phone: true,
      isActive: true,
      startedAt: true,
      expiresAt: true,
      checkedInAt: true,
      renewedAt: true,
      renewalStatus: true,
      renewalMethod: true,
      membershipProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          membershipPeriod: true,
        },
      },
    },
  });

  return {
    member_id: updated.id,
    member_code: updated.memberCode,
    full_name: updated.fullName,
    phone: updated.phone,
    is_active: updated.isActive,
    membership_product_id: updated.membershipProduct.id,
    membership_name: updated.membershipProduct.name,
    membership_period:
      inferMembershipPeriod(updated.membershipProduct.sku, updated.membershipProduct.membershipPeriod) ?? "MONTHLY",
    started_at: updated.startedAt.toISOString(),
    expires_at: updated.expiresAt.toISOString(),
    checked_in_at: updated.checkedInAt?.toISOString() ?? null,
    renewed_at: updated.renewedAt?.toISOString() ?? null,
    renewal_status: updated.renewalStatus === "RENEWED" ? "RENEWED" : "ACTIVE",
    renewal_method: (updated.renewalMethod as MemberSubscriptionRecord["renewal_method"]) ?? "NONE",
  };
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
  const stockOnHand = productType === "GOODS" ? Math.max(0, input.stock_on_hand ?? 0) : null;
  const membershipMetadata = normalizeMembershipMetadata({
    productType,
    sku,
    membershipPeriod: input.membership_period,
    membershipDurationDays: input.membership_duration_days ?? null,
  });

  const created = await prisma.product.create({
    data: {
      sku,
      name,
      price: asMoney(input.price),
      productType,
      trackStock: productType === "GOODS",
      stockOnHand,
      membershipPeriod: membershipMetadata.membershipPeriod,
      membershipDurationDays: membershipMetadata.membershipDurationDays,
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
  const productType = assertProductType(existing.productType);
  const membershipMetadata = normalizeMembershipMetadata({
    productType,
    sku,
    membershipPeriod: input.membership_period ?? inferMembershipPeriod(existing.sku, existing.membershipPeriod),
    membershipDurationDays: input.membership_duration_days ?? existing.membershipDurationDays ?? null,
  });

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      sku,
      name,
      price: asMoney(input.price),
      trackStock: productType === "GOODS",
      stockOnHand: productType === "GOODS" ? Math.max(0, input.stock_on_hand ?? existing.stockOnHand ?? 0) : null,
      membershipPeriod: membershipMetadata.membershipPeriod,
      membershipDurationDays: membershipMetadata.membershipDurationDays,
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

    const membershipUnits = input.items.reduce((sum, item) => {
      const product = products.find((candidate) => candidate.id === item.product_id);
      return sum + (product?.productType === "MEMBERSHIP" ? item.quantity : 0);
    }, 0);

    if (membershipUnits > 1) {
      throw new Error("MEMBERSHIP_SINGLE_QUANTITY");
    }

    if (membershipUnits > 0 && !input.customer_info?.name?.trim()) {
      throw new Error("MEMBERSHIP_CUSTOMER_REQUIRED");
    }

    // PT / Training validation
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.product_id);
      if (product && product.sku.startsWith("PT-")) {
        if (!item.trainer_id) {
          throw new Error("TRAINER_REQUIRED");
        }
        if (item.quantity > 1) {
          throw new Error("TRAINING_SINGLE_QUANTITY");
        }
      }
    }

    // Validate trainers exist and are active
    const trainerIds = [...new Set(input.items.filter((i) => i.trainer_id).map((i) => i.trainer_id!))];
    if (trainerIds.length > 0) {
      const trainers = await tx.trainer.findMany({
        where: { id: { in: trainerIds }, isActive: true },
        select: { id: true },
      });
      if (trainers.length !== trainerIds.length) {
        throw new Error("TRAINER_NOT_FOUND");
      }
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = input.items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if (product.productType === "MEMBERSHIP" && item.quantity > 1) {
        throw new Error("MEMBERSHIP_SINGLE_QUANTITY");
      }

      if (product.trackStock && typeof product.stockOnHand === "number" && item.quantity > product.stockOnHand) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const unitPrice = product.price;
      const totalPrice = unitPrice.mul(new Prisma.Decimal(item.quantity));

      return {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        productType: assertProductType(product.productType),
        trackStock: product.trackStock,
        stockOnHand: product.stockOnHand,
        membershipPeriod: inferMembershipPeriod(product.sku, product.membershipPeriod),
        membershipDurationDays: product.membershipDurationDays,
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

    // Create TrainingServiceEnrollment for PT items
    const ptInputItems = input.items.filter((i) => {
      const product = productMap.get(i.product_id);
      return product && product.sku.startsWith("PT-");
    });

    if (ptInputItems.length > 0) {
      const createdOrderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { id: true, productId: true },
      });

      for (const ptItem of ptInputItems) {
        const product = productMap.get(ptItem.product_id)!;
        const orderItem = createdOrderItems.find((oi) => oi.productId === ptItem.product_id);
        if (!orderItem) continue;

        const startedAt = ptItem.service_start_date ? new Date(ptItem.service_start_date) : new Date();
        const durationDays = product.membershipDurationDays;
        const expiresAt = durationDays ? new Date(startedAt.getTime() + durationDays * 86400000) : null;
        const sessionLimit = deriveTrainingSessionLimit(product.sku);

        await tx.trainingServiceEnrollment.create({
          data: {
            orderId: order.id,
            orderItemId: orderItem.id,
            trainerId: ptItem.trainer_id ?? null,
            packageProductId: product.id,
            customerNameSnapshot: input.customer_info?.name ?? "Walk-in",
            packageNameSnapshot: product.name,
            packageSkuSnapshot: product.sku,
            startedAt,
            expiresAt,
            sessionLimit,
            sessionsRemaining: sessionLimit,
            priceSnapshot: product.price,
            status: ptItem.trainer_id ? "ACTIVE" : "UNASSIGNED",
          },
        });
      }
    }

    for (const item of normalizedItems) {
      if (!item.trackStock || typeof item.stockOnHand !== "number") {
        continue;
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockOnHand: Math.max(0, item.stockOnHand - item.quantity),
        },
      });
    }

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

    const membershipItem = normalizedItems.find((item) => item.productType === "MEMBERSHIP");
    if (membershipItem && input.customer_info?.name?.trim()) {
      const memberSequence = await reserveDocumentNumber(tx, "MEMBER", "MBR");
      const startedAt = new Date();
      const durationDays = membershipItem.membershipDurationDays ?? defaultMembershipDurationDays(membershipItem.membershipPeriod) ?? 30;

      await tx.memberSubscription.create({
        data: {
          memberCode: memberSequence.documentNumber,
          fullName: input.customer_info.name.trim(),
          phone: createMembershipPhone(input.customer_info),
          membershipProductId: membershipItem.productId,
          startedAt,
          expiresAt: calculateMembershipExpiry(startedAt, durationDays),
          renewalStatus: "ACTIVE",
        },
      });
    }

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

export type ReportQueryInput = {
  period: "DAY" | "WEEK" | "MONTH" | "CUSTOM";
  date?: string;
  start_date?: string;
  end_date?: string;
};

function resolveReportRange(input: ReportQueryInput): { from: Date; to: Date; rangeStart: string; rangeEnd: string } {
  if (input.period === "CUSTOM") {
    if (!input.start_date || !input.end_date) {
      throw new Error("INVALID_DATE");
    }
    const from = new Date(`${input.start_date}T00:00:00.000Z`);
    const to = new Date(`${input.end_date}T00:00:00.000Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("INVALID_DATE");
    }
    return { from, to, rangeStart: input.start_date, rangeEnd: input.end_date };
  }

  const dateStr = input.date;
  if (!dateStr) {
    throw new Error("INVALID_DATE");
  }
  const anchor = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(anchor.getTime())) {
    throw new Error("INVALID_DATE");
  }

  if (input.period === "DAY") {
    const to = new Date(anchor);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from: anchor, to, rangeStart: dateStr, rangeEnd: dateStr };
  }

  if (input.period === "WEEK") {
    const dayOfWeek = anchor.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(anchor);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 7);
    return {
      from: monday,
      to: sunday,
      rangeStart: monday.toISOString().slice(0, 10),
      rangeEnd: new Date(sunday.getTime() - 86400000).toISOString().slice(0, 10),
    };
  }

  // MONTH
  const firstDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  return {
    from: firstDay,
    to: lastDay,
    rangeStart: firstDay.toISOString().slice(0, 10),
    rangeEnd: new Date(lastDay.getTime() - 86400000).toISOString().slice(0, 10),
  };
}

export async function getDailySummaryByDate(dateOrInput: string | ReportQueryInput): Promise<DailySummaryDto> {
  const input: ReportQueryInput = typeof dateOrInput === "string"
    ? { period: "DAY", date: dateOrInput }
    : dateOrInput;

  const { from, to, rangeStart, rangeEnd } = resolveReportRange(input);

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
            totalPrice: true,
            product: {
              select: {
                name: true,
                sku: true,
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

  // Category aggregation
  const categoryMap = new Map(
    POS_CATEGORY_DEFINITIONS.map((definition) => [
      definition.category,
      {
        label: definition.label,
        total_amount: 0,
        receipt_count: new Set<string>(),
        item_count: 0,
      },
    ]),
  );

  for (const order of orders) {
    for (const item of order.items) {
      const category = getPosSalesCategoryFromSku(item.product.sku);
      const existing = categoryMap.get(category);
      if (!existing) {
        continue;
      }

      existing.total_amount += Number(item.totalPrice);
      existing.receipt_count.add(order.id);
      existing.item_count += item.quantity;
    }
  }

  const salesByCategory = POS_CATEGORY_DEFINITIONS.map((definition) => {
    const data = categoryMap.get(definition.category);

    return {
      category: definition.category,
      label: definition.label,
      total_amount: Number((data?.total_amount ?? 0).toFixed(2)),
      receipt_count: data?.receipt_count.size ?? 0,
      item_count: data?.item_count ?? 0,
    };
  });

  return {
    report_period: input.period,
    range_start: rangeStart,
    range_end: rangeEnd,
    total_sales: Number(totalSales.toFixed(2)),
    sales_by_method: {
      CASH: Number(salesByMethod.CASH.toFixed(2)),
      PROMPTPAY: Number(salesByMethod.PROMPTPAY.toFixed(2)),
      CREDIT_CARD: Number(salesByMethod.CREDIT_CARD.toFixed(2)),
    },
    sales_by_category: salesByCategory,
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

export async function getShiftInventorySummaryByShiftId(
  requesterId: string,
  requesterRole: "OWNER" | "ADMIN" | "CASHIER",
  shiftId: string,
): Promise<ShiftInventorySummaryRowDto[]> {
  const normalizedShiftId = shiftId.trim();
  if (!normalizedShiftId) {
    throw new Error("SHIFT_NOT_FOUND");
  }

  const shift = await prisma.shift.findUnique({
    where: { id: normalizedShiftId },
    select: {
      id: true,
      staffId: true,
    },
  });

  if (!shift) {
    throw new Error("SHIFT_NOT_FOUND");
  }

  if (requesterRole === "CASHIER" && shift.staffId !== requesterId) {
    throw new Error("SHIFT_OWNER_MISMATCH");
  }

  const soldItems = await prisma.orderItem.findMany({
    where: {
      order: {
        shiftId: shift.id,
        status: "COMPLETED",
      },
      product: {
        productType: "GOODS",
      },
    },
    select: {
      quantity: true,
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          stockOnHand: true,
        },
      },
    },
  });

  if (soldItems.length === 0) {
    return [];
  }

  const rowsByProductId = new Map<string, ShiftInventorySummaryRowDto>();
  for (const item of soldItems) {
    const productId = item.product.id;
    const current = rowsByProductId.get(productId) ?? {
      product_id: productId,
      sku: item.product.sku,
      name: item.product.name,
      opening_stock: 0,
      sold_quantity: 0,
      remaining_stock: 0,
    };

    current.sold_quantity += item.quantity;
    rowsByProductId.set(productId, current);
  }

  return Array.from(rowsByProductId.values())
    .sort((left, right) => left.sku.localeCompare(right.sku))
    .map((row) => {
      // Product stock ledger is not persisted yet; report deterministic sold totals with zeroed stock baseline.
      const openingStock = row.sold_quantity;
      return {
        ...row,
        opening_stock: openingStock,
        remaining_stock: Math.max(0, openingStock - row.sold_quantity),
      };
    });
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

// --- Trainer Services ---

export type TrainerRecordDto = {
  trainer_id: string;
  trainer_code: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  is_active: boolean;
  active_customer_count: number;
};

export type TrainingEnrollmentDto = {
  enrollment_id: string;
  trainer_id: string | null;
  trainer_name: string | null;
  customer_name: string;
  member_id: string | null;
  package_name: string;
  package_sku: string;
  started_at: string;
  expires_at: string | null;
  session_limit: number | null;
  sessions_remaining: number | null;
  price: number;
  status: "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED";
  closed_at: string | null;
  close_reason: string | null;
  updated_at: string;
};

export type CreateTrainerInputDto = {
  full_name: string;
  nickname?: string;
  phone?: string;
};

export type UpdateTrainingEnrollmentInputDto = {
  sessions_remaining?: number | null;
  status?: "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED";
  close_reason?: string | null;
};

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function deriveTrainingSessionLimit(packageSku: string) {
  const match = /^PT-(\d+)$/.exec(packageSku);
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveTrainingEnrollmentStatus(
  enrollment: {
    trainerId: string | null;
    status: string;
    expiresAt: Date | null;
    sessionsRemaining?: number | null;
  },
  now = new Date(),
): "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED" {
  if (enrollment.status === "CLOSED") {
    return "CLOSED";
  }

  if (!enrollment.trainerId) {
    return "UNASSIGNED";
  }

  if (enrollment.status === "EXPIRED") {
    return "EXPIRED";
  }

  if (typeof enrollment.sessionsRemaining === "number" && enrollment.sessionsRemaining <= 0) {
    return "EXPIRED";
  }

  if (enrollment.expiresAt && enrollment.expiresAt < now) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

function mapTrainingEnrollmentDto(
  enrollment: {
    id: string;
    trainerId: string | null;
    trainer?: { fullName: string } | null;
    customerNameSnapshot: string;
    memberSubscriptionId: string | null;
    packageNameSnapshot: string;
    packageSkuSnapshot: string;
    startedAt: Date;
    expiresAt: Date | null;
    sessionLimit: number | null;
    sessionsRemaining: number | null;
    priceSnapshot: Prisma.Decimal | number;
    status: string;
    closedAt: Date | null;
    closeReason: string | null;
    updatedAt: Date;
  },
  trainerName?: string | null,
  now = new Date(),
): TrainingEnrollmentDto {
  return {
    enrollment_id: enrollment.id,
    trainer_id: enrollment.trainerId,
    trainer_name: enrollment.trainer?.fullName ?? trainerName ?? null,
    customer_name: enrollment.customerNameSnapshot,
    member_id: enrollment.memberSubscriptionId,
    package_name: enrollment.packageNameSnapshot,
    package_sku: enrollment.packageSkuSnapshot,
    started_at: enrollment.startedAt.toISOString(),
    expires_at: enrollment.expiresAt?.toISOString() ?? null,
    session_limit: enrollment.sessionLimit,
    sessions_remaining: enrollment.sessionsRemaining ?? enrollment.sessionLimit ?? null,
    price: Number(enrollment.priceSnapshot),
    status: resolveTrainingEnrollmentStatus(enrollment, now),
    closed_at: enrollment.closedAt?.toISOString() ?? null,
    close_reason: enrollment.closeReason,
    updated_at: enrollment.updatedAt.toISOString(),
  };
}

function toNextTrainerCode(existingCodes: string[]) {
  const maxCode = existingCodes.reduce((highest, code) => {
    const match = /^TR(\d+)$/.exec(code);
    if (!match) {
      return highest;
    }

    const value = Number.parseInt(match[1] ?? "", 10);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);

  return `TR${String(maxCode + 1).padStart(3, "0")}`;
}

export async function listTrainers(): Promise<Array<TrainerRecordDto & { assignments: TrainingEnrollmentDto[] }>> {
  const trainers = await prisma.trainer.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          trainer: { select: { fullName: true } },
          packageProduct: { select: { name: true, sku: true } },
        },
      },
    },
  });

  return trainers.map((trainer) => {
    const now = new Date();
    const assignments = trainer.enrollments.map((enrollment) => mapTrainingEnrollmentDto(enrollment, trainer.fullName, now));

    return {
      trainer_id: trainer.id,
      trainer_code: trainer.trainerCode,
      full_name: trainer.fullName,
      nickname: trainer.nickname,
      phone: trainer.phone,
      is_active: trainer.isActive,
      active_customer_count: assignments.filter((a) => a.status === "ACTIVE").length,
      assignments,
    };
  });
}

export async function createTrainer(input: CreateTrainerInputDto): Promise<TrainerRecordDto> {
  const fullName = input.full_name.trim();
  if (!fullName) {
    throw new Error("TRAINER_NAME_REQUIRED");
  }

  const existingCodes = await prisma.trainer.findMany({
    select: { trainerCode: true },
    orderBy: { createdAt: "asc" },
  });

  const trainer = await prisma.trainer.create({
    data: {
      trainerCode: toNextTrainerCode(existingCodes.map((item) => item.trainerCode)),
      fullName,
      nickname: normalizeOptionalText(input.nickname),
      phone: normalizeOptionalText(input.phone),
      isActive: true,
    },
  });

  return {
    trainer_id: trainer.id,
    trainer_code: trainer.trainerCode,
    full_name: trainer.fullName,
    nickname: trainer.nickname,
    phone: trainer.phone,
    is_active: trainer.isActive,
    active_customer_count: 0,
  };
}

export async function toggleTrainerActive(trainerId: string): Promise<TrainerRecordDto> {
  const normalizedTrainerId = trainerId.trim();
  if (!normalizedTrainerId) {
    throw new Error("TRAINER_NOT_FOUND");
  }

  const trainer = await prisma.trainer.findUnique({
    where: { id: normalizedTrainerId },
    include: {
      enrollments: {
        select: {
          trainerId: true,
          status: true,
          expiresAt: true,
          sessionsRemaining: true,
        },
      },
    },
  });

  if (!trainer) {
    throw new Error("TRAINER_NOT_FOUND");
  }

  const activeCustomerCount = trainer.enrollments.filter(
    (enrollment) => resolveTrainingEnrollmentStatus(enrollment) === "ACTIVE",
  ).length;

  if (trainer.isActive && activeCustomerCount > 0) {
    throw new Error("TRAINER_HAS_ACTIVE_ASSIGNMENTS");
  }

  const updated = await prisma.trainer.update({
    where: { id: trainer.id },
    data: {
      isActive: !trainer.isActive,
    },
  });

  return {
    trainer_id: updated.id,
    trainer_code: updated.trainerCode,
    full_name: updated.fullName,
    nickname: updated.nickname,
    phone: updated.phone,
    is_active: updated.isActive,
    active_customer_count: activeCustomerCount,
  };
}

export async function updateTrainingEnrollment(
  enrollmentId: string,
  input: UpdateTrainingEnrollmentInputDto,
): Promise<TrainingEnrollmentDto> {
  const enrollment = await prisma.trainingServiceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      trainer: { select: { fullName: true } },
      packageProduct: { select: { name: true, sku: true } },
    },
  });

  if (!enrollment) {
    throw new Error("TRAINING_ENROLLMENT_NOT_FOUND");
  }

  if (
    input.sessions_remaining !== undefined &&
    input.sessions_remaining !== null &&
    (!Number.isInteger(input.sessions_remaining) || input.sessions_remaining < 0)
  ) {
    throw new Error("INVALID_SESSIONS_REMAINING");
  }

  const nextSessionsRemaining =
    input.sessions_remaining === undefined
      ? enrollment.sessionsRemaining ?? enrollment.sessionLimit
      : input.sessions_remaining;

  if (
    enrollment.sessionLimit !== null &&
    nextSessionsRemaining !== null &&
    nextSessionsRemaining !== undefined &&
    nextSessionsRemaining > enrollment.sessionLimit
  ) {
    throw new Error("INVALID_SESSIONS_REMAINING");
  }

  let nextStatus = input.status ?? (enrollment.status as "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED");

  if (nextStatus === "ACTIVE" && nextSessionsRemaining !== null && nextSessionsRemaining !== undefined && nextSessionsRemaining <= 0) {
    nextStatus = "EXPIRED";
  }

  const updated = await prisma.trainingServiceEnrollment.update({
    where: { id: enrollmentId },
    data: {
      sessionsRemaining: nextSessionsRemaining,
      status: nextStatus,
      closeReason: nextStatus === "CLOSED" ? normalizeOptionalText(input.close_reason) : null,
      closedAt: nextStatus === "CLOSED" ? enrollment.closedAt ?? new Date() : null,
    },
    include: {
      trainer: { select: { fullName: true } },
      packageProduct: { select: { name: true, sku: true } },
    },
  });

  return mapTrainingEnrollmentDto(updated);
}
