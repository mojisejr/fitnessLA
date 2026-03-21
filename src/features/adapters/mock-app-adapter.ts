import type {
  AdminUserRecord,
  ApiError,
  ChartOfAccountRecord,
  CreateTrainerInput,
  DailySummary,
  ShiftSummary,
  EntityId,
  ExpenseResult,
  MemberSubscriptionRecord,
  OrderResult,
  Product,
  SalesEntryItem,
  ShiftInventorySummaryRow,
  ShiftCloseResult,
  ShiftOpenResult,
  TrainingEnrollmentRecord,
  TrainerRecord,
  UpdateTrainingEnrollmentInput,
  UserSession,
  RenewalMethod,
} from "@/lib/contracts";
import {
  demoPassword,
  mockChartOfAccounts,
  mockDailySummary,
  mockProducts,
  mockUsersByRole,
} from "@/lib/mock-data";
import { buildEmptyPosSalesCategoryRows, getPosSalesCategoryFromProduct } from "@/lib/pos-categories";
import { sleep } from "@/lib/utils";
import type {
  AppAdapter,
  CreateAdminUserInput,
  CreateChartOfAccountInput,
  CreateMemberInput,
  CreateProductInput,
  UpdateMemberInput,
  UpdateProductInput,
} from "@/features/adapters/types";
import { prependMemberRegistry, readMemberRegistry, writeMemberRegistry } from "@/features/members/member-registry";

type MockTrainerWithAssignments = TrainerRecord & { assignments: TrainingEnrollmentRecord[] };
type MockManagedUser = AdminUserRecord & { password: string };

function removeTrainingEnrollmentsFromState(enrollmentIds: EntityId[]) {
  const normalizedIds = new Set(enrollmentIds.map((id) => String(id)));
  const deletedAssignments: TrainingEnrollmentRecord[] = [];

  trainersState = trainersState.map((trainer) => {
    const assignments = trainer.assignments.filter((assignment) => {
      if (!normalizedIds.has(String(assignment.enrollment_id))) {
        return true;
      }

      deletedAssignments.push({ ...assignment });
      return false;
    });

    return {
      ...trainer,
      assignments,
      active_customer_count: assignments.filter((assignment) => assignment.status === "ACTIVE").length,
    };
  });

  return deletedAssignments;
}

let orderSequence = 1001;
let expenseSequence = 3001;
let shiftSequence = 701;
let productSequence = Math.max(...mockProducts.map((item) => Number(item.product_id))) + 1;
let memberSequence = 1;
let chartOfAccountsState = mockChartOfAccounts.map((item) => ({ ...item }));
let productsState = mockProducts.map((item) => ({ ...item }));
let managedUsersState: MockManagedUser[] = [];
let trainersState: MockTrainerWithAssignments[] = [];
let shiftInventoryState = new Map<string, Map<string, { product_id: EntityId; opening_stock: number; sold_quantity: number }>>();
let salesRowsState: DailySummary["sales_rows"] = [];
let salesRowOverridesState = new Map<string, { items: SalesEntryItem[]; items_summary: string; total_amount: number }>();
let deletedSalesOrderIdsState = new Set<string>();

function roundMoney(amount: number) {
  return Number(amount.toFixed(2));
}

function buildSummaryFromSalesItems(items: SalesEntryItem[]) {
  return items.map((item) => `${item.product_name} x${item.quantity}`).join(", ");
}

function parseSummaryItems(itemsSummary: string, totalAmount: number, orderId: EntityId): SalesEntryItem[] {
  const parts = itemsSummary
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [];
  }

  const parsed = parts.map((part, index) => {
    const match = /^(.*) x(\d+)$/u.exec(part);
    const productName = match?.[1]?.trim() || part;
    const quantity = Number(match?.[2] ?? 1);
    return {
      order_item_id: `${String(orderId)}-item-${index + 1}`,
      product_name: productName,
      quantity,
      unit_price: 0,
      line_total: 0,
    } satisfies SalesEntryItem;
  });

  const totalQuantity = parsed.reduce((sum, item) => sum + item.quantity, 0) || 1;
  let remainingTotal = roundMoney(totalAmount);

  return parsed.map((item, index) => {
    const isLastItem = index === parsed.length - 1;
    const lineTotal = isLastItem
      ? roundMoney(remainingTotal)
      : roundMoney((totalAmount * item.quantity) / totalQuantity);
    remainingTotal = roundMoney(remainingTotal - lineTotal);
    const unitPrice = item.quantity > 0 ? roundMoney(lineTotal / item.quantity) : 0;

    return {
      ...item,
      unit_price: unitPrice,
      line_total: roundMoney(unitPrice * item.quantity),
    } satisfies SalesEntryItem;
  });
}

function withSalesItems(row: DailySummary["sales_rows"][number]): DailySummary["sales_rows"][number] {
  if (row.items?.length) {
    return row;
  }

  return {
    ...row,
    items: parseSummaryItems(row.items_summary, row.total_amount, row.order_id),
  };
}

function buildBaseDailyShiftRows(date: string, discrepancyTotal: number): DailySummary["shift_rows"] {
  const overage = Math.max(discrepancyTotal, 0);
  const shortage = Math.max(-discrepancyTotal, 0);

  return [
    {
      shift_id: `SHIFT-${date}-A`,
      closed_at: `${date}T12:15:00.000Z`,
      responsible_name: "Pim Counter",
      expected_cash: Number((1860 + shortage).toFixed(2)),
      actual_cash: 1860,
      difference: Number((-shortage).toFixed(2)),
    },
    {
      shift_id: `SHIFT-${date}-B`,
      closed_at: `${date}T18:45:00.000Z`,
      responsible_name: "June Desk",
      expected_cash: 1260,
      actual_cash: Number((1260 + overage).toFixed(2)),
      difference: Number(overage.toFixed(2)),
    },
  ];
}

function buildBaseDailySalesRows(date: string, summary: Pick<DailySummary, "sales_by_method">): DailySummary["sales_rows"] {
  return [
    {
      order_id: `MOCK-${date}-001`,
      shift_id: `BASE-${date}`,
      order_number: `POS-${date.replaceAll("-", "")}-001`,
      sold_at: `${date}T09:15:00.000Z`,
      items_summary: "อเมริกาโน่เย็น x2, น้ำดื่ม x1",
      items: parseSummaryItems("อเมริกาโน่เย็น x2, น้ำดื่ม x1", summary.sales_by_method.CASH, `MOCK-${date}-001`),
      cashier_name: "Pim Counter",
      responsible_name: "Pim Counter",
      customer_name: "ลูกค้าทั่วไป",
      payment_method: "CASH",
      total_amount: summary.sales_by_method.CASH,
    },
    {
      order_id: `MOCK-${date}-002`,
      shift_id: `BASE-${date}`,
      order_number: `POS-${date.replaceAll("-", "")}-002`,
      sold_at: `${date}T12:40:00.000Z`,
      items_summary: "สมาชิกรายเดือน x1",
      items: parseSummaryItems("สมาชิกรายเดือน x1", summary.sales_by_method.PROMPTPAY, `MOCK-${date}-002`),
      cashier_name: "June Desk",
      responsible_name: "June Desk",
      customer_name: "Nok Member",
      payment_method: "PROMPTPAY",
      total_amount: summary.sales_by_method.PROMPTPAY,
    },
    {
      order_id: `MOCK-${date}-003`,
      shift_id: `BASE-${date}`,
      order_number: `POS-${date.replaceAll("-", "")}-003`,
      sold_at: `${date}T17:25:00.000Z`,
      items_summary: "เทรนเดี่ยว 1 ครั้ง x1",
      items: parseSummaryItems("เทรนเดี่ยว 1 ครั้ง x1", summary.sales_by_method.CREDIT_CARD, `MOCK-${date}-003`),
      cashier_name: "Ton Front",
      responsible_name: "Ton Front",
      customer_name: "Mild Training",
      payment_method: "CREDIT_CARD",
      total_amount: summary.sales_by_method.CREDIT_CARD,
    },
  ];
}

function buildOrderItemsSummary(request: Parameters<AppAdapter["createOrder"]>[0]) {
  return request.items
    .map((line) => {
      const product = productsState.find((candidate) => candidate.product_id === line.product_id);
      return `${product?.name ?? `สินค้า ${line.product_id}`} x${line.quantity}`;
    })
    .join(", ");
}

function applySalesRowOverrides(rows: DailySummary["sales_rows"]) {
  return rows
    .filter((row) => !deletedSalesOrderIdsState.has(String(row.order_id)))
    .map((row) => {
    const override = salesRowOverridesState.get(String(row.order_id));

    if (!override) {
      return withSalesItems(row);
    }

    return {
      ...row,
      items: override.items,
      items_summary: override.items_summary,
      total_amount: override.total_amount,
    } satisfies DailySummary["sales_rows"][number];
  });
}

function buildMockBaseSummary(date: string) {
  const day = Number(date.split("-").at(-1) ?? 1);
  const offset = day % 4;

  return {
    total_sales: mockDailySummary.total_sales + offset * 260,
    sales_by_method: {
      CASH: mockDailySummary.sales_by_method.CASH + offset * 120,
      PROMPTPAY: mockDailySummary.sales_by_method.PROMPTPAY + offset * 70,
      CREDIT_CARD: mockDailySummary.sales_by_method.CREDIT_CARD + offset * 70,
    },
    total_expenses: mockDailySummary.total_expenses + offset * 40,
    net_cash_flow: mockDailySummary.net_cash_flow + offset * 80,
    shift_discrepancies: mockDailySummary.shift_discrepancies + offset * 10,
  };
}

function createError(code: string, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

function validateMemberDates(input: Pick<CreateMemberInput, "started_at" | "expires_at">) {
  const startedAt = new Date(input.started_at);
  const expiresAt = new Date(input.expires_at);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    throw createError("INVALID_DATE", "รูปแบบวันที่ไม่ถูกต้อง");
  }

  if (expiresAt <= startedAt) {
    throw createError("EXPIRES_BEFORE_START", "วันหมดอายุต้องมาหลังวันเริ่มต้น");
  }

  return { startedAt, expiresAt };
}

function cloneSession(session: UserSession) {
  return { ...session };
}

function cloneChartOfAccount(account: ChartOfAccountRecord) {
  return { ...account };
}

function cloneManagedUser(user: MockManagedUser) {
  const { password: _password, ...safeUser } = user;
  return { ...safeUser };
}

function calculateExpectedCash(startingCash: number) {
  return Number((startingCash + 1860 - 240).toFixed(2));
}

function toShiftKey(shiftId: EntityId) {
  return String(shiftId);
}

function toProductKey(productId: EntityId) {
  return String(productId);
}

function ensureShiftInventory(shiftId: EntityId) {
  const shiftKey = toShiftKey(shiftId);
  const existing = shiftInventoryState.get(shiftKey);

  if (existing) {
    return existing;
  }

  const nextState = new Map<string, { product_id: EntityId; opening_stock: number; sold_quantity: number }>();

  for (const product of productsState) {
    if (!product.track_stock) {
      continue;
    }

    nextState.set(toProductKey(product.product_id), {
      product_id: product.product_id,
      opening_stock: product.stock_on_hand ?? 0,
      sold_quantity: 0,
    });
  }

  shiftInventoryState.set(shiftKey, nextState);
  return nextState;
}

function cloneProduct(product: Product) {
  return { ...product };
}

function normalizeFeaturedSlot(value: number | null | undefined) {
  if (value == null) {
    return null;
  }

  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  throw createError("INVALID_FEATURED_SLOT", "ตำแหน่งสินค้าปักหมุดต้องอยู่ระหว่าง 1 ถึง 4");
}

function normalizeTagline(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolvePosCategory(input: Pick<Product, "sku" | "product_type"> & { pos_category?: Product["pos_category"] }) {
  return getPosSalesCategoryFromProduct({
    sku: input.sku,
    product_type: input.product_type,
    pos_category: input.pos_category ?? null,
  });
}

function clearFeaturedSlotConflict(featuredSlot: 1 | 2 | 3 | 4 | null, excludedProductId?: EntityId) {
  if (featuredSlot == null) {
    return;
  }

  productsState = productsState.map((product) =>
    product.featured_slot === featuredSlot && product.product_id !== excludedProductId
      ? { ...product, featured_slot: null }
      : product,
  );
}

function resolveRevenueAccount(accountId: EntityId | undefined) {
  if (accountId === undefined || accountId === null || accountId === "") {
    return null;
  }

  const match = chartOfAccountsState.find((account) => String(account.account_id) === String(accountId));
  if (!match) {
    throw createError("REVENUE_ACCOUNT_NOT_FOUND", "ไม่พบบัญชีรายได้ที่ต้องการผูกกับสินค้า");
  }

  if (match.account_type !== "REVENUE") {
    throw createError("INVALID_REVENUE_ACCOUNT_TYPE", "บัญชีที่เลือกต้องเป็นหมวด REVENUE เท่านั้น");
  }

  if (!match.is_active) {
    throw createError("REVENUE_ACCOUNT_INACTIVE", "บัญชีรายได้ที่เลือกถูกปิดใช้งานอยู่");
  }

  return match;
}

function extractSequenceNumber(value: EntityId) {
  if (typeof value === "number") {
    return value;
  }

  const match = String(value).match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function createMembershipRecords(request: Parameters<AppAdapter["createOrder"]>[0], purchasedAt: string) {
  const customerName = request.customer_info?.name?.trim();
  if (!customerName) {
    return [] as MemberSubscriptionRecord[];
  }

  const purchasedMemberships = request.items.flatMap((line) => {
    const product = productsState.find((candidate) => candidate.product_id === line.product_id);

    if (!product || product.product_type !== "MEMBERSHIP") {
      return [] as Product[];
    }

    return Array.from({ length: line.quantity }, () => product);
  });

  if (purchasedMemberships.length === 0) {
    return [] as MemberSubscriptionRecord[];
  }

  const existingRegistry = readMemberRegistry();
  let nextSequence = Math.max(0, ...existingRegistry.map((member) => extractSequenceNumber(member.member_id))) + 1;

  return purchasedMemberships.map((product) => {
    const startedAt = new Date(purchasedAt);
    const expiresAt = new Date(purchasedAt);
    expiresAt.setDate(expiresAt.getDate() + (product.membership_duration_days ?? 30));
    expiresAt.setHours(23, 59, 59, 0);

    const sequence = nextSequence;
    nextSequence += 1;

    return {
      member_id: `MEM-${String(sequence).padStart(4, "0")}`,
      member_code: `MBR-24${String(sequence).padStart(3, "0")}`,
      full_name: customerName,
      phone: request.customer_info?.tax_id?.trim() || "รออัปเดตเบอร์โทร",
      is_active: true,
      membership_product_id: product.product_id,
      membership_name: product.name,
      membership_period: product.membership_period ?? "MONTHLY",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      checked_in_at: null,
      renewed_at: null,
      renewal_status: "ACTIVE",
      renewal_method: "NONE",
    } satisfies MemberSubscriptionRecord;
  });
}

export function resetMockAdapterState() {
  orderSequence = 1001;
  expenseSequence = 3001;
  shiftSequence = 701;
  productSequence = Math.max(...mockProducts.map((item) => Number(item.product_id))) + 1;
  chartOfAccountsState = mockChartOfAccounts.map((item) => ({ ...item }));
  productsState = mockProducts.map((item) => ({ ...item }));
  managedUsersState = [];
  shiftInventoryState = new Map();
  salesRowsState = [];
  salesRowOverridesState = new Map();
  deletedSalesOrderIdsState = new Set();
}

export const mockAppAdapter: AppAdapter = {
  mode: "mock",

  async authenticateUser(username, password) {
    await sleep(220);

    const normalized = username.trim().toLowerCase();
    const managedUser = managedUsersState.find((candidate) => candidate.username.toLowerCase() === normalized);

    if (managedUser) {
      if (password !== managedUser.password) {
        throw createError("INVALID_CREDENTIALS", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }

      return {
        user_id: managedUser.user_id,
        username: managedUser.username,
        full_name: managedUser.full_name,
        role: managedUser.role,
        active_shift_id: null,
      } satisfies UserSession;
    }

    const match = Object.values(mockUsersByRole).find(
      (candidate) => candidate.username.toLowerCase() === normalized,
    );

    if (!match || password !== demoPassword) {
      throw createError("INVALID_CREDENTIALS", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    return cloneSession(match);
  },

  async getActiveShift() {
    await sleep(80);
    return null;
  },

  async listMembers() {
    await sleep(120);
    return readMemberRegistry();
  },

  async listProducts() {
    await sleep(180);
    return productsState.map((product) => ({ ...product } satisfies Product));
  },

  async createProduct(input: CreateProductInput) {
    await sleep(180);

    if (!input.name.trim() || !input.sku.trim()) {
      throw createError("INVALID_PRODUCT", "ต้องระบุชื่อสินค้าและ SKU");
    }

    if (input.price < 0) {
      throw createError("INVALID_PRODUCT_PRICE", "ราคาสินค้าต้องเป็นศูนย์หรือมากกว่า");
    }

    if (productsState.some((product) => product.sku.toLowerCase() === input.sku.trim().toLowerCase())) {
      throw createError("DUPLICATE_PRODUCT_SKU", "SKU นี้ถูกใช้งานแล้ว");
    }

    const revenueAccount = resolveRevenueAccount(input.revenueAccountId);
    const featuredSlot = normalizeFeaturedSlot(input.featuredSlot);
    clearFeaturedSlotConflict(featuredSlot);

    const nextProduct: Product = {
      product_id: productSequence,
      sku: input.sku.trim(),
      name: input.name.trim(),
      tagline: normalizeTagline(input.tagline),
      price: input.price,
      product_type: input.productType,
      pos_category: input.posCategory ?? resolvePosCategory({ sku: input.sku.trim(), product_type: input.productType }),
      featured_slot: featuredSlot,
      revenue_account_id: revenueAccount?.account_id,
      track_stock: input.productType === "GOODS",
      stock_on_hand: input.productType === "GOODS" ? (input.stockOnHand ?? 0) : null,
      membership_period: input.productType === "MEMBERSHIP" ? (input.membershipPeriod ?? "MONTHLY") : null,
      membership_duration_days:
        input.productType === "MEMBERSHIP" ? (input.membershipDurationDays ?? 30) : null,
    };

    productSequence += 1;
    productsState = [nextProduct, ...productsState];

    if (nextProduct.track_stock) {
      for (const shiftRows of shiftInventoryState.values()) {
        shiftRows.set(toProductKey(nextProduct.product_id), {
          product_id: nextProduct.product_id,
          opening_stock: nextProduct.stock_on_hand ?? 0,
          sold_quantity: 0,
        });
      }
    }

    return cloneProduct(nextProduct);
  },

  async updateProduct(input: UpdateProductInput) {
    await sleep(180);

    const targetProduct = productsState.find((product) => product.product_id === input.productId);

    if (!targetProduct) {
      throw createError("PRODUCT_NOT_FOUND", "ไม่พบสินค้าที่ต้องการแก้ไข");
    }

    if (!input.name.trim() || !input.sku.trim()) {
      throw createError("INVALID_PRODUCT", "ต้องระบุชื่อสินค้าและ SKU");
    }

    if (input.price < 0) {
      throw createError("INVALID_PRODUCT_PRICE", "ราคาสินค้าต้องเป็นศูนย์หรือมากกว่า");
    }

    if (targetProduct.track_stock && typeof input.stockOnHand === "number" && input.stockOnHand < 0) {
      throw createError("INVALID_PRODUCT_STOCK", "จำนวน stock ต้องเป็นศูนย์หรือมากกว่า");
    }

    const revenueAccount = resolveRevenueAccount(input.revenueAccountId);
  const featuredSlot = normalizeFeaturedSlot(input.featuredSlot === undefined ? (targetProduct.featured_slot ?? null) : input.featuredSlot);
    clearFeaturedSlotConflict(featuredSlot, input.productId);

    productsState = productsState.map((product) => {
      if (product.product_id !== input.productId) {
        return product;
      }

      return {
        ...product,
        name: input.name.trim(),
        sku: input.sku.trim(),
        tagline: normalizeTagline(input.tagline),
        price: input.price,
        pos_category: input.posCategory ?? resolvePosCategory({
          sku: input.sku.trim(),
          product_type: product.product_type,
          pos_category: product.pos_category,
        }),
        featured_slot: featuredSlot,
        revenue_account_id: revenueAccount?.account_id,
        stock_on_hand: product.track_stock ? (input.stockOnHand ?? product.stock_on_hand ?? 0) : product.stock_on_hand,
      } satisfies Product;
    });

    const updatedProduct = productsState.find((product) => product.product_id === input.productId)!;

    if (updatedProduct.track_stock) {
      for (const shiftRows of shiftInventoryState.values()) {
        const row = shiftRows.get(toProductKey(updatedProduct.product_id));

        if (!row) {
          shiftRows.set(toProductKey(updatedProduct.product_id), {
            product_id: updatedProduct.product_id,
            opening_stock: updatedProduct.stock_on_hand ?? 0,
            sold_quantity: 0,
          });
          continue;
        }

        row.opening_stock = (updatedProduct.stock_on_hand ?? 0) + row.sold_quantity;
      }
    }

    return cloneProduct(updatedProduct);
  },

  async getShiftInventorySummary(shiftId: EntityId) {
    await sleep(120);

    const shiftRows = ensureShiftInventory(shiftId);

    return productsState
      .filter((product) => product.track_stock)
      .map((product) => {
        const row = shiftRows.get(toProductKey(product.product_id)) ?? {
          product_id: product.product_id,
          opening_stock: product.stock_on_hand ?? 0,
          sold_quantity: 0,
        };

        return {
          product_id: product.product_id,
          sku: product.sku,
          name: product.name,
          opening_stock: row.opening_stock,
          sold_quantity: row.sold_quantity,
          remaining_stock: product.stock_on_hand ?? 0,
        } satisfies ShiftInventorySummaryRow;
      });
  },

  async openShift(startingCash, responsibleName) {
    await sleep(220);

    if (startingCash < 0) {
      throw createError("INVALID_STARTING_CASH", "เงินทอนตั้งต้นต้องเป็นศูนย์หรือมากกว่า");
    }

    if (!responsibleName.trim()) {
      throw createError("RESPONSIBLE_NAME_REQUIRED", "กรุณาระบุชื่อผู้รับผิดชอบก่อนเปิดกะ");
    }

    const shift_id = shiftSequence;
    shiftSequence += 1;
    ensureShiftInventory(shift_id);

    return {
      shift_id,
      opened_at: new Date().toISOString(),
      responsible_name: responsibleName.trim(),
    } satisfies ShiftOpenResult;
  },

  async closeShift({ activeShift, actualCash, responsibleName }) {
    await sleep(240);

    if (!responsibleName.trim()) {
      throw createError("RESPONSIBLE_NAME_REQUIRED", "กรุณาระบุชื่อผู้รับผิดชอบก่อนปิดกะ");
    }

    const expected_cash = calculateExpectedCash(activeShift.starting_cash);
    const difference = Number((actualCash - expected_cash).toFixed(2));

    return {
      shift_id: activeShift.shift_id,
      expected_cash,
      actual_cash: actualCash,
      difference,
      status: "CLOSED",
      responsible_name: responsibleName.trim(),
      journal_entry_id:
        typeof activeShift.shift_id === "number"
          ? activeShift.shift_id + 9000
          : `${activeShift.shift_id}-close`,
    } satisfies ShiftCloseResult;
  },

  async createOrder(request) {
    await sleep(300);

    if (request.items.length === 0) {
      throw createError("EMPTY_CART", "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
    }

    for (const line of request.items) {
      const product = productsState.find((candidate) => candidate.product_id === line.product_id);

      if (!product) {
        throw createError("PRODUCT_NOT_FOUND", "ไม่พบสินค้าที่เลือก");
      }

      if (product.product_type === "MEMBERSHIP" && line.quantity > 1) {
        throw createError("MEMBERSHIP_SINGLE_QUANTITY", "แพ็กเกจสมาชิกซื้อได้ครั้งละ 1 รายการ");
      }

      if (product.track_stock && typeof product.stock_on_hand === "number" && line.quantity > product.stock_on_hand) {
        throw createError("INSUFFICIENT_STOCK", `สต็อก ${product.name} คงเหลือ ${product.stock_on_hand} ชิ้น`);
      }
    }

    const total_amount = Number(
      request.items
        .reduce((sum, line) => {
          const product = productsState.find((candidate) => candidate.product_id === line.product_id);
          return sum + (product?.price ?? 0) * line.quantity;
        }, 0)
        .toFixed(2),
    );

    productsState = productsState.map((product) => {
      const orderedLine = request.items.find((line) => line.product_id === product.product_id);

      if (!orderedLine || !product.track_stock || typeof product.stock_on_hand !== "number") {
        return product;
      }

      return {
        ...product,
        stock_on_hand: Math.max(0, product.stock_on_hand - orderedLine.quantity),
      };
    });

    const shiftRows = ensureShiftInventory(request.shift_id);

    for (const line of request.items) {
      const product = productsState.find((candidate) => candidate.product_id === line.product_id);

      if (!product?.track_stock) {
        continue;
      }

      const productKey = toProductKey(product.product_id);
      const currentRow = shiftRows.get(productKey) ?? {
        product_id: product.product_id,
        opening_stock: (product.stock_on_hand ?? 0) + line.quantity,
        sold_quantity: 0,
      };

      currentRow.sold_quantity += line.quantity;
      shiftRows.set(productKey, currentRow);
    }

    const currentSequence = orderSequence;
    orderSequence += 1;

    const purchasedAt = new Date().toISOString();
    const createdMemberships = createMembershipRecords(request, purchasedAt);

    if (createdMemberships.length > 0) {
      prependMemberRegistry(createdMemberships);
    }

    salesRowsState = [
      {
        order_id: currentSequence,
        shift_id: request.shift_id,
        order_number: `POS-${new Date().getFullYear()}-${String(currentSequence).padStart(4, "0")}`,
        sold_at: purchasedAt,
        items_summary: buildOrderItemsSummary(request),
        items: request.items.map((line, index) => {
          const product = productsState.find((candidate) => candidate.product_id === line.product_id);
          const unitPrice = product?.price ?? 0;
          return {
            order_item_id: `${currentSequence}-item-${index + 1}`,
            product_name: product?.name ?? `สินค้า ${line.product_id}`,
            quantity: line.quantity,
            unit_price: unitPrice,
            line_total: roundMoney(unitPrice * line.quantity),
          } satisfies SalesEntryItem;
        }),
        cashier_name: "แคชเชียร์หน้าร้าน",
        responsible_name: "แคชเชียร์หน้าร้าน",
        customer_name: request.customer_info?.name?.trim() || null,
        payment_method: request.payment_method,
        total_amount,
      },
      ...salesRowsState,
    ];

    return {
      order_id: currentSequence,
      order_number: `POS-${new Date().getFullYear()}-${String(currentSequence).padStart(4, "0")}`,
      total_amount,
      tax_doc_number: `INV-${new Date().getFullYear()}-${String(currentSequence).padStart(4, "0")}`,
      status: "COMPLETED",
    } satisfies OrderResult;
  },

  async createExpense(input) {
    await sleep(260);

    void input.receiptFile;

    if (!input.receiptName) {
      throw createError("RECEIPT_REQUIRED", "ต้องแนบรูปใบเสร็จก่อนบันทึก");
    }

    if (input.amount <= 0) {
      throw createError("INVALID_AMOUNT", "จำนวนเงินต้องมากกว่า 0");
    }

    const expense_id = expenseSequence;
    expenseSequence += 1;

    return {
      expense_id,
      status: "POSTED",
    } satisfies ExpenseResult;
  },

  async updateSalesEntry(orderId, input) {
    await sleep(180);

    if (!Array.isArray(input.items)) {
      throw createError("INVALID_ORDER_ITEMS_SUMMARY", "กรุณาระบุรายการที่ขาย");
    }

    if (
      input.items.some(
        (item) =>
          !item.order_item_id ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 0 ||
          !Number.isFinite(item.unit_price) ||
          item.unit_price < 0,
      )
    ) {
      throw createError("INVALID_ORDER_TOTAL", "ข้อมูลจำนวนหรือราคาต่อหน่วยไม่ถูกต้อง");
    }

    const items = input.items
      .filter((item) => item.quantity > 0)
      .map((item) => {
      const lineTotal = roundMoney(item.quantity * item.unit_price);
      const existingRow = salesRowsState.find((row) => String(row.order_id) === String(orderId));
      const existingItem = existingRow?.items?.find((candidate) => String(candidate.order_item_id) === String(item.order_item_id));
      return {
        order_item_id: String(item.order_item_id),
        product_name: existingItem?.product_name ?? `สินค้า ${item.order_item_id}`,
        quantity: item.quantity,
        unit_price: roundMoney(item.unit_price),
        line_total: lineTotal,
      } satisfies SalesEntryItem;
      });

    if (items.length === 0) {
      throw createError("INVALID_ORDER_ITEMS_SUMMARY", "บิลต้องมีอย่างน้อย 1 รายการ");
    }

    const itemsSummary = buildSummaryFromSalesItems(items);
    const normalizedTotal = roundMoney(items.reduce((sum, item) => sum + item.line_total, 0));
    const orderKey = String(orderId);
    const appendedIndex = salesRowsState.findIndex((row) => String(row.order_id) === orderKey);

    if (appendedIndex >= 0) {
      salesRowsState[appendedIndex] = {
        ...salesRowsState[appendedIndex],
        items,
        items_summary: itemsSummary,
        total_amount: normalizedTotal,
      };
      salesRowOverridesState.delete(orderKey);

      return {
        order_id: salesRowsState[appendedIndex].order_id,
        items,
        items_summary: itemsSummary,
        total_amount: normalizedTotal,
      };
    }

    salesRowOverridesState.set(orderKey, {
      items,
      items_summary: itemsSummary,
      total_amount: normalizedTotal,
    });

    return {
      order_id: orderId,
      items,
      items_summary: itemsSummary,
      total_amount: normalizedTotal,
    };
  },

  async deleteSalesEntry(orderId) {
    await sleep(180);

    const orderKey = String(orderId);
    const targetRow = salesRowsState.find((row) => String(row.order_id) === orderKey)
      ?? (() => {
        const match = /^MOCK-(\d{4}-\d{2}-\d{2})-\d+$/u.exec(orderKey);
        if (!match) {
          return undefined;
        }

        const date = match[1];
        const baseSummary = buildMockBaseSummary(date);
        return buildBaseDailySalesRows(date, baseSummary).find((row) => String(row.order_id) === orderKey);
      })();

    if (!targetRow) {
      throw createError("ORDER_NOT_FOUND", "ไม่พบบิลขายที่ต้องการลบ");
    }

    salesRowsState = salesRowsState.filter((row) => String(row.order_id) !== orderKey);
    salesRowOverridesState.delete(orderKey);
    deletedSalesOrderIdsState.add(orderKey);

    return {
      order_id: targetRow.order_id,
      order_number: targetRow.order_number,
    };
  },

  async deleteSalesEntries(orderIds) {
    await sleep(180);

    const normalizedOrderIds = Array.from(new Set(orderIds.map((orderId) => String(orderId)).filter(Boolean)));
    if (normalizedOrderIds.length === 0) {
      throw createError("ORDER_IDS_REQUIRED", "ต้องเลือกรายการขายอย่างน้อย 1 บิล");
    }

    const deletedOrders = [] as Array<{ order_id: EntityId; order_number: string }>;
    for (const orderId of normalizedOrderIds) {
      const deleted = await this.deleteSalesEntry(orderId);
      deletedOrders.push(deleted);
    }

    return {
      deleted_count: deletedOrders.length,
      deleted_orders: deletedOrders,
    };
  },

  async getDailySummary(query) {
    await sleep(220);

    const date = query.date ?? query.start_date ?? new Date().toISOString().slice(0, 10);
    const baseSummary = buildMockBaseSummary(date);

    const appendedRows = salesRowsState.filter((row) => row.sold_at.slice(0, 10) === date);
    const combinedRows = applySalesRowOverrides([...appendedRows, ...buildBaseDailySalesRows(date, baseSummary)]);
    const salesByMethod = combinedRows.reduce(
      (summary, row) => {
        summary[row.payment_method] += row.total_amount;
        return summary;
      },
      { CASH: 0, PROMPTPAY: 0, CREDIT_CARD: 0 },
    );

    return {
      report_period: query.period,
      range_start: date,
      range_end: query.end_date ?? date,
      total_sales: Number(combinedRows.reduce((sum, row) => sum + row.total_amount, 0).toFixed(2)),
      sales_by_method: {
        CASH: Number(salesByMethod.CASH.toFixed(2)),
        PROMPTPAY: Number(salesByMethod.PROMPTPAY.toFixed(2)),
        CREDIT_CARD: Number(salesByMethod.CREDIT_CARD.toFixed(2)),
      },
      sales_by_category: buildEmptyPosSalesCategoryRows(),
      total_expenses: baseSummary.total_expenses,
      net_cash_flow: Number((salesByMethod.CASH - baseSummary.total_expenses).toFixed(2)),
      shift_discrepancies: baseSummary.shift_discrepancies,
      shift_rows: buildBaseDailyShiftRows(date, baseSummary.shift_discrepancies),
      sales_rows: combinedRows,
    } satisfies DailySummary;
  },

  async getShiftSummary(date, responsibleName) {
    const daily = await this.getDailySummary({ period: "DAY", date });
    const trimmed = responsibleName?.trim();
    const salesRows =
      trimmed && trimmed.length > 0
        ? daily.sales_rows.filter((row) => (row.responsible_name ?? row.cashier_name) === trimmed)
        : daily.sales_rows;
    const shiftRows =
      trimmed && trimmed.length > 0
        ? daily.shift_rows.filter((row) => row.responsible_name === trimmed)
        : daily.shift_rows;

    const shiftRowsWithAggregates = shiftRows.map((row) => {
      const shiftSales = salesRows.filter((sale) => sale.shift_id === row.shift_id);
      const salesByMethod = shiftSales.reduce(
        (sum, sale) => {
          sum[sale.payment_method] += sale.total_amount;
          return sum;
        },
        { CASH: 0, PROMPTPAY: 0, CREDIT_CARD: 0 },
      );

      return {
        ...row,
        receipt_count: shiftSales.length,
        sales_by_method: {
          CASH: Number(salesByMethod.CASH.toFixed(2)),
          PROMPTPAY: Number(salesByMethod.PROMPTPAY.toFixed(2)),
          CREDIT_CARD: Number(salesByMethod.CREDIT_CARD.toFixed(2)),
        },
        total_sales: Number((salesByMethod.CASH + salesByMethod.PROMPTPAY + salesByMethod.CREDIT_CARD).toFixed(2)),
      };
    });

    const totals = shiftRowsWithAggregates.reduce(
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
      shift_rows: shiftRowsWithAggregates,
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
    } satisfies ShiftSummary;
  },

  async listChartOfAccounts() {
    await sleep(160);
    return chartOfAccountsState.map(cloneChartOfAccount);
  },

  async createChartOfAccount(input: CreateChartOfAccountInput) {
    await sleep(180);

    if (chartOfAccountsState.some((account) => account.account_code === input.account_code)) {
      throw createError("DUPLICATE_ACCOUNT_CODE", "รหัสบัญชีนี้ถูกใช้งานแล้ว");
    }

    const nextAccount: ChartOfAccountRecord = {
      account_id: Math.max(...chartOfAccountsState.map((account) => Number(account.account_id))) + 1,
      account_code: input.account_code,
      account_name: input.account_name,
      account_type: input.account_type,
      is_active: true,
      description: input.description,
    };

    chartOfAccountsState = [nextAccount, ...chartOfAccountsState];
    return cloneChartOfAccount(nextAccount);
  },

  async toggleChartOfAccount(accountId: EntityId) {
    await sleep(140);

    const target = chartOfAccountsState.find((account) => account.account_id === accountId);
    if (!target) {
      throw createError("ACCOUNT_NOT_FOUND", "ไม่พบบัญชีที่ต้องการแก้ไข");
    }
    if (target.locked_reason) {
      throw createError("ACCOUNT_LOCKED", target.locked_reason);
    }

    chartOfAccountsState = chartOfAccountsState.map((account) =>
      account.account_id === accountId ? { ...account, is_active: !account.is_active } : account,
    );

    return cloneChartOfAccount(
      chartOfAccountsState.find((account) => account.account_id === accountId)!,
    );
  },

  async createAdminUser(input: CreateAdminUserInput) {
    await sleep(180);

    if (
      managedUsersState.some((user) => user.username === input.username) ||
      Object.values(mockUsersByRole).some((user) => user.username === input.username)
    ) {
      throw createError("DUPLICATE_USERNAME", "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
    }

    const nextUser: MockManagedUser = {
      user_id: `mock-user-${managedUsersState.length + 1}`,
      full_name: input.full_name,
      phone: input.phone.trim(),
      username: input.username,
      role: input.role,
      password: input.password,
    };

    managedUsersState = [nextUser, ...managedUsersState];
    return cloneManagedUser(nextUser);
  },

  async listTrainers() {
    await sleep(120);
    return trainersState.map((trainer) => ({
      ...trainer,
      assignments: trainer.assignments.map((assignment) => ({ ...assignment })),
    }));
  },

  async createTrainer(input: CreateTrainerInput) {
    await sleep(120);
    const nextNumber = trainersState.length + 1;
    const nextTrainer: MockTrainerWithAssignments = {
      trainer_id: `mock-trainer-${nextNumber}`,
      trainer_code: `TR${String(nextNumber).padStart(3, "0")}`,
      full_name: input.full_name.trim(),
      nickname: input.nickname?.trim() || null,
      phone: input.phone?.trim() || null,
      is_active: true,
      active_customer_count: 0,
      assignments: [],
    };

    trainersState = [nextTrainer, ...trainersState];
    return { ...nextTrainer, assignments: [] };
  },

  async deleteTrainer(trainerId: EntityId) {
    await sleep(120);
    const target = trainersState.find((trainer) => String(trainer.trainer_id) === String(trainerId));

    if (!target) {
      throw createError("TRAINER_NOT_FOUND", "ไม่พบเทรนเนอร์ที่ต้องการลบ");
    }

    trainersState = trainersState.filter((trainer) => String(trainer.trainer_id) !== String(trainerId));
    trainersState = trainersState.map((trainer) => ({
      ...trainer,
      assignments: trainer.assignments.map((assignment) =>
        String(assignment.trainer_id) === String(trainerId)
          ? {
              ...assignment,
              trainer_id: null,
              trainer_name: null,
              status: assignment.status === "ACTIVE" ? "UNASSIGNED" : assignment.status,
              updated_at: new Date().toISOString(),
            }
          : assignment,
      ),
    }));

    return {
      trainer_id: target.trainer_id,
      full_name: target.full_name,
    };
  },

  async toggleTrainerActive(trainerId: EntityId) {
    await sleep(120);
    const target = trainersState.find((trainer) => String(trainer.trainer_id) === String(trainerId));

    if (!target) {
      throw createError("TRAINER_NOT_FOUND", "ไม่พบเทรนเนอร์ที่ต้องการปรับสถานะ");
    }

    if (target.is_active && target.assignments.some((assignment) => assignment.status === "ACTIVE")) {
      throw createError("TRAINER_HAS_ACTIVE_ASSIGNMENTS", "ยังมีลูกเทรนที่ใช้งานอยู่ จึงยังปิดใช้งานเทรนเนอร์ไม่ได้");
    }

    let updatedTrainer: TrainerRecord | null = null;
    trainersState = trainersState.map((trainer) => {
      if (String(trainer.trainer_id) !== String(trainerId)) {
        return trainer;
      }

      updatedTrainer = {
        trainer_id: trainer.trainer_id,
        trainer_code: trainer.trainer_code,
        full_name: trainer.full_name,
        nickname: trainer.nickname,
        phone: trainer.phone,
        is_active: !trainer.is_active,
        active_customer_count: trainer.active_customer_count,
      };

      return {
        ...trainer,
        is_active: !trainer.is_active,
      };
    });

    if (!updatedTrainer) {
      throw createError("TRAINER_NOT_FOUND", "ไม่พบเทรนเนอร์ที่ต้องการปรับสถานะ");
    }

    return updatedTrainer;
  },

  async deleteTrainingEnrollment(enrollmentId: EntityId) {
    await sleep(120);
    const deletedAssignments = removeTrainingEnrollmentsFromState([enrollmentId]);
    const deletedAssignment = deletedAssignments[0];

    if (!deletedAssignment) {
      throw createError("TRAINING_ENROLLMENT_NOT_FOUND", "ไม่พบรายการลูกเทรนที่ต้องการลบ");
    }

    return {
      enrollment_id: deletedAssignment.enrollment_id,
      customer_name: deletedAssignment.customer_name,
      package_name: deletedAssignment.package_name,
    };
  },

  async deleteTrainingEnrollments(enrollmentIds: EntityId[]) {
    await sleep(120);
    const normalizedIds = Array.from(new Set(enrollmentIds.map((id) => String(id)).filter(Boolean)));

    if (normalizedIds.length === 0) {
      throw createError("TRAINING_ENROLLMENT_IDS_REQUIRED", "ต้องเลือกรายการลูกเทรนอย่างน้อย 1 รายการ");
    }

    const deletedAssignments = removeTrainingEnrollmentsFromState(normalizedIds);

    if (deletedAssignments.length !== normalizedIds.length) {
      throw createError("TRAINING_ENROLLMENT_NOT_FOUND", "ไม่พบรายการลูกเทรนที่ต้องการลบบางรายการ");
    }

    return {
      deleted_count: deletedAssignments.length,
      deleted_enrollments: deletedAssignments.map((assignment) => ({
        enrollment_id: assignment.enrollment_id,
        customer_name: assignment.customer_name,
        package_name: assignment.package_name,
      })),
    };
  },

  async updateTrainingEnrollment(enrollmentId: EntityId, input: UpdateTrainingEnrollmentInput) {
    await sleep(120);
    let updatedAssignment: TrainingEnrollmentRecord | null = null;

    trainersState = trainersState.map((trainer) => {
      const assignments = trainer.assignments.map((assignment) => {
        if (String(assignment.enrollment_id) !== String(enrollmentId)) {
          return assignment;
        }

        let closedAt = assignment.closed_at;
        if (input.status === "CLOSED") {
          closedAt = assignment.closed_at ?? new Date().toISOString();
        } else if (input.status) {
          closedAt = null;
        }

        updatedAssignment = {
          ...assignment,
          sessions_remaining:
            input.sessions_remaining === undefined ? assignment.sessions_remaining : input.sessions_remaining,
          status: input.status ?? assignment.status,
          close_reason:
            input.close_reason === undefined ? assignment.close_reason : input.close_reason,
          closed_at: closedAt,
          updated_at: new Date().toISOString(),
        };

        return updatedAssignment;
      });

      return {
        ...trainer,
        assignments,
        active_customer_count: assignments.filter((assignment) => assignment.status === "ACTIVE").length,
      };
    });

    if (!updatedAssignment) {
      throw createError("TRAINING_ENROLLMENT_NOT_FOUND", "ไม่พบรายการลูกเทรนที่ต้องการแก้ไข");
    }

    return updatedAssignment as TrainingEnrollmentRecord;
  },

  async createMember(input: CreateMemberInput) {
    await sleep(200);

    const fullName = input.full_name.trim();
    if (!fullName) {
      throw createError("MEMBER_NAME_REQUIRED", "ต้องระบุชื่อสมาชิก");
    }

    const { startedAt, expiresAt } = validateMemberDates(input);
    const currentSequence = memberSequence;
    memberSequence += 1;

    const createdMember: MemberSubscriptionRecord = {
      member_id: `member-manual-${currentSequence}`,
      member_code: `MBR-MANUAL-${String(currentSequence).padStart(4, "0")}`,
      full_name: fullName,
      phone: input.phone?.trim() || "รออัปเดตเบอร์โทร",
      is_active: true,
      membership_product_id: `special-membership-${currentSequence}`,
      membership_name: input.membership_name.trim(),
      membership_period: input.membership_period,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      checked_in_at: null,
      renewed_at: null,
      renewal_status: "ACTIVE",
      renewal_method: "NONE",
    };

    prependMemberRegistry([createdMember]);
    return createdMember;
  },

  async updateMember(memberId: EntityId, input: UpdateMemberInput) {
    await sleep(200);

    const registry = readMemberRegistry();
    const targetIndex = registry.findIndex((member) => String(member.member_id) === String(memberId));
    if (targetIndex < 0) {
      throw createError("MEMBER_NOT_FOUND", "ไม่พบสมาชิกที่ต้องการแก้ไข");
    }

    const { startedAt, expiresAt } = validateMemberDates(input);
    const updatedMember: MemberSubscriptionRecord = {
      ...registry[targetIndex],
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    registry.splice(targetIndex, 1, updatedMember);
    writeMemberRegistry(registry);
    return updatedMember;
  },

  async deleteMember(memberId: EntityId) {
    await sleep(200);

    const registry = readMemberRegistry();
    const targetIndex = registry.findIndex((member) => String(member.member_id) === String(memberId));
    if (targetIndex < 0) {
      throw createError("MEMBER_NOT_FOUND", "ไม่พบสมาชิกที่ต้องการลบ");
    }

    const [removedMember] = registry.splice(targetIndex, 1);
    writeMemberRegistry(registry);

    return {
      member_id: removedMember.member_id,
      full_name: removedMember.full_name,
    };
  },

  async renewMember(memberId) {
    await sleep(200);
    const registry = readMemberRegistry();
    const member = registry.find((m) => String(m.member_id) === String(memberId));
    if (!member) {
      throw createError("MEMBER_NOT_FOUND", "ไม่พบสมาชิกที่ต้องการต่ออายุ");
    }
    if (!member.is_active) {
      throw createError("MEMBER_INACTIVE", "สมาชิกที่ปิดใช้งานไม่สามารถต่ออายุได้");
    }
    return { ...member, renewal_status: "RENEWED" as const, renewal_method: "EXTEND_FROM_PREVIOUS_END" as const };
  },

  async toggleMemberActive(memberId) {
    await sleep(200);
    const registry = readMemberRegistry();
    const targetIndex = registry.findIndex((member) => String(member.member_id) === String(memberId));
    if (targetIndex < 0) {
      throw createError("MEMBER_NOT_FOUND", "ไม่พบสมาชิกที่ต้องการปรับสถานะ");
    }

    const updatedMember = {
      ...registry[targetIndex],
      is_active: !registry[targetIndex]?.is_active,
    } satisfies MemberSubscriptionRecord;

    registry.splice(targetIndex, 1, updatedMember);
    writeMemberRegistry(registry);
    return updatedMember;
  },

  async restartMember(memberId) {
    await sleep(200);
    const registry = readMemberRegistry();
    const member = registry.find((m) => String(m.member_id) === String(memberId));
    if (!member) {
      throw createError("MEMBER_NOT_FOUND", "ไม่พบสมาชิกที่ต้องการเริ่มรอบใหม่");
    }
    if (!member.is_active) {
      throw createError("MEMBER_INACTIVE", "สมาชิกที่ปิดใช้งานไม่สามารถเริ่มรอบใหม่ได้");
    }
    return { ...member, renewal_status: "ACTIVE" as const, renewal_method: "RESTART_FROM_NEW_START" as const };
  },
};