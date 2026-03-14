import type {
  AdminUserRecord,
  CreateOrderRequest,
  DailySummary,
  EntityId,
  MockShiftRecord,
  OrderResult,
  Product,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
} from "@/lib/contracts";
import type {
  AppAdapter,
  CreateAdminUserInput,
  CreateChartOfAccountInput,
  CreateProductInput,
  UpdateProductInput,
} from "@/features/adapters/types";
import { authClient } from "@/lib/auth-client";

function createHeaders(headers?: HeadersInit): Headers {
  return new Headers(headers);
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: createHeaders(init?.headers),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Request failed" }));
    throw body;
  }

  return response.json() as Promise<T>;
}

async function fetchOptionalJson<T>(input: RequestInfo, init?: RequestInit): Promise<T | null> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: createHeaders(init?.headers),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Request failed" }));
    throw body;
  }

  return response.json() as Promise<T>;
}

function notImplemented(message: string): never {
  throw {
    code: "NOT_IMPLEMENTED",
    message,
  };
}

export const realAppAdapter: AppAdapter = {
  mode: "real",

  async authenticateUser(username: string, password: string) {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      throw {
        code: "INVALID_CREDENTIALS",
        message: "กรุณาระบุชื่อผู้ใช้",
      };
    }

    if (!password) {
      return fetchJson<UserSession>("/api/auth/session");
    }

    const signInResult = await authClient.signIn.username({
      username: normalizedUsername,
      password,
    });

    if (signInResult.error) {
      throw {
        code: "INVALID_CREDENTIALS",
        message: signInResult.error.message ?? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      };
    }

    return fetchJson<UserSession>("/api/auth/session");
  },

  async getActiveShift() {
    return fetchOptionalJson<MockShiftRecord>("/api/v1/shifts/active");
  },

  async listProducts() {
    return fetchJson<Product[]>("/api/v1/products");
  },

  async createProduct(input: CreateProductInput) {
    return fetchJson<Product>("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: input.sku,
        name: input.name,
        price: input.price,
        product_type: input.productType,
        revenue_account_id:
          input.revenueAccountId === undefined ? undefined : String(input.revenueAccountId),
      }),
    });
  },

  async updateProduct(input: UpdateProductInput) {
    return fetchJson<Product>(`/api/v1/products/${encodeURIComponent(String(input.productId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: input.sku,
        name: input.name,
        price: input.price,
        revenue_account_id:
          input.revenueAccountId === undefined ? undefined : String(input.revenueAccountId),
      }),
    });
  },

  async getShiftInventorySummary(shiftId: string | number) {
    void shiftId;
    return notImplemented("Shift inventory summary ยังมีเฉพาะ mock adapter ในรอบนี้");
  },

  async openShift(startingCash: number, responsibleName: string) {
    return fetchJson<ShiftOpenResult>("/api/v1/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starting_cash: startingCash, responsible_name: responsibleName }),
    });
  },

  async closeShift(input: {
    activeShift: MockShiftRecord;
    actualCash: number;
    closingNote?: string;
    responsibleName: string;
  }) {
    void input.activeShift;
    return fetchJson<ShiftCloseResult>("/api/v1/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actual_cash: input.actualCash,
        closing_note: input.closingNote,
        responsible_name: input.responsibleName,
      }),
    });
  },

  async createOrder(request: CreateOrderRequest) {
    return fetchJson<OrderResult>("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },

  async createExpense(input: {
    shift_id: EntityId;
    account_id: EntityId;
    amount: number;
    description: string;
    receiptName: string;
    receiptFile?: File | null;
  }) {
    const formData = new FormData();
    formData.set("shift_id", String(input.shift_id));
    formData.set("account_id", String(input.account_id));
    formData.set("amount", String(input.amount));
    formData.set("description", input.description);

    if (input.receiptFile) {
      formData.set("receipt_file", input.receiptFile, input.receiptFile.name || input.receiptName);
    } else {
      formData.set("receipt_url", input.receiptName);
    }

    return fetchJson("/api/v1/expenses", {
      method: "POST",
      body: formData,
    });
  },

  async getDailySummary(date: string) {
    return fetchJson<DailySummary>(`/api/v1/reports/daily-summary?date=${encodeURIComponent(date)}`);
  },

  async listChartOfAccounts() {
    return fetchJson("/api/v1/coa");
  },
  async createChartOfAccount(input: CreateChartOfAccountInput) {
    return fetchJson("/api/v1/coa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
  async toggleChartOfAccount(accountId: EntityId) {
    return fetchJson(`/api/v1/coa/${encodeURIComponent(String(accountId))}/toggle`, {
      method: "PATCH",
    });
  },
  async createAdminUser(input: CreateAdminUserInput) {
    return fetchJson<AdminUserRecord>("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },
};