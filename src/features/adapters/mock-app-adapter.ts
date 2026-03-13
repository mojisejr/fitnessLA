import type {
  AdminUserRecord,
  ApiError,
  ChartOfAccountRecord,
  DailySummary,
  EntityId,
  ExpenseResult,
  MemberSubscriptionRecord,
  OrderResult,
  Product,
  ShiftInventorySummaryRow,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
} from "@/lib/contracts";
import {
  demoPassword,
  mockChartOfAccounts,
  mockDailySummary,
  mockProducts,
  mockUsersByRole,
} from "@/lib/mock-data";
import { sleep } from "@/lib/utils";
import type {
  AppAdapter,
  CreateAdminUserInput,
  CreateChartOfAccountInput,
  CreateProductInput,
  UpdateProductInput,
} from "@/features/adapters/types";
import { prependMemberRegistry, readMemberRegistry } from "@/features/members/member-registry";

let orderSequence = 1001;
let expenseSequence = 3001;
let shiftSequence = 701;
let productSequence = Math.max(...mockProducts.map((item) => Number(item.product_id))) + 1;
let chartOfAccountsState = mockChartOfAccounts.map((item) => ({ ...item }));
let productsState = mockProducts.map((item) => ({ ...item }));
let managedUsersState: AdminUserRecord[] = [];
let shiftInventoryState = new Map<string, Map<string, { product_id: EntityId; opening_stock: number; sold_quantity: number }>>();

function createError(code: string, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

function cloneSession(session: UserSession) {
  return { ...session };
}

function cloneChartOfAccount(account: ChartOfAccountRecord) {
  return { ...account };
}

function cloneManagedUser(user: AdminUserRecord) {
  return { ...user };
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
      membership_product_id: product.product_id,
      membership_name: product.name,
      membership_period: product.membership_period ?? "MONTHLY",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      checked_in_at: null,
      renewed_at: null,
      renewal_status: "ACTIVE",
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
}

export const mockAppAdapter: AppAdapter = {
  mode: "mock",

  async authenticateUser(username, password) {
    await sleep(220);

    const normalized = username.trim().toLowerCase();
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

    const nextProduct: Product = {
      product_id: productSequence,
      sku: input.sku.trim(),
      name: input.name.trim(),
      price: input.price,
      product_type: input.productType,
      revenue_account_id: revenueAccount?.account_id,
      track_stock: input.productType === "GOODS",
      stock_on_hand: input.productType === "GOODS" ? (input.stockOnHand ?? 0) : null,
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

    productsState = productsState.map((product) => {
      if (product.product_id !== input.productId) {
        return product;
      }

      return {
        ...product,
        name: input.name.trim(),
        sku: input.sku.trim(),
        price: input.price,
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

  async openShift(startingCash) {
    await sleep(220);

    if (startingCash < 0) {
      throw createError("INVALID_STARTING_CASH", "เงินทอนตั้งต้นต้องเป็นศูนย์หรือมากกว่า");
    }

    const shift_id = shiftSequence;
    shiftSequence += 1;
    ensureShiftInventory(shift_id);

    return {
      shift_id,
      opened_at: new Date().toISOString(),
    } satisfies ShiftOpenResult;
  },

  async closeShift({ activeShift, actualCash }) {
    await sleep(240);

    const expected_cash = calculateExpectedCash(activeShift.starting_cash);
    const difference = Number((actualCash - expected_cash).toFixed(2));

    return {
      shift_id: activeShift.shift_id,
      expected_cash,
      actual_cash: actualCash,
      difference,
      status: "CLOSED",
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

  async getDailySummary(date) {
    await sleep(220);

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
    } satisfies DailySummary;
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
      managedUsersState.some((user) => user.username === input.username || user.email === input.email) ||
      Object.values(mockUsersByRole).some((user) => user.username === input.username)
    ) {
      throw createError("DUPLICATE_USERNAME", "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
    }

    const nextUser: AdminUserRecord = {
      user_id: `mock-user-${managedUsersState.length + 1}`,
      full_name: input.full_name,
      username: input.username,
      email: input.email,
      role: input.role,
    };

    managedUsersState = [nextUser, ...managedUsersState];
    return cloneManagedUser(nextUser);
  },
};