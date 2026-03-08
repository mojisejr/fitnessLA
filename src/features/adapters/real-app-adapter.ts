import type {
  CreateOrderRequest,
  DailySummary,
  MockShiftRecord,
  OrderResult,
  Product,
  ShiftCloseResult,
  ShiftOpenResult,
} from "@/lib/contracts";
import type { AppAdapter, CreateChartOfAccountInput, CreateUserRequestInput } from "@/features/adapters/types";

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
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
    void username;
    void password;
    return notImplemented("ระบบ login จริงยังรอ Better Auth จากฝั่ง backend");
  },

  async listProducts() {
    return fetchJson<Product[]>("/api/v1/products");
  },

  async openShift(startingCash: number) {
    return fetchJson<ShiftOpenResult>("/api/v1/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starting_cash: startingCash }),
    });
  },

  async closeShift(input: { activeShift: MockShiftRecord; actualCash: number }) {
    void input.activeShift;
    return fetchJson<ShiftCloseResult>("/api/v1/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual_cash: input.actualCash }),
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
    shift_id: number;
    account_id: number;
    amount: number;
    description: string;
    receiptName: string;
  }) {
    void input;
    return notImplemented("API รายจ่ายจริงยังต้องใช้ multipart upload adapter เพิ่ม");
  },

  async getDailySummary(date: string) {
    return fetchJson<DailySummary>(`/api/v1/reports/daily-summary?date=${encodeURIComponent(date)}`);
  },

  async listChartOfAccounts() {
    return notImplemented("COA API จริงยังไม่ถูกล็อก contract");
  },
  async createChartOfAccount(input: CreateChartOfAccountInput) {
    void input;
    return notImplemented("COA create API จริงยังไม่ถูกล็อก contract");
  },
  async toggleChartOfAccount(accountId: number) {
    void accountId;
    return notImplemented("COA toggle API จริงยังไม่ถูกล็อก contract");
  },
  async listUserRequests() {
    return notImplemented("Admin user API จริงยังไม่ถูกล็อก contract");
  },
  async createUserRequest(input: CreateUserRequestInput) {
    void input;
    return notImplemented("Admin user API จริงยังไม่ถูกล็อก contract");
  },
  async approveUserRequest(requestId: number) {
    void requestId;
    return notImplemented("Admin user API จริงยังไม่ถูกล็อก contract");
  },
};