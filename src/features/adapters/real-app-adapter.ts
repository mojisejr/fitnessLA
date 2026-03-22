import type {
  AdminUserRecord,
  CreateTrainerInput,
  CreateOrderRequest,
  DailySummary,
  MemberSubscriptionRecord,
  SalesEntryUpdateResult,
  ShiftSummary,
  EntityId,
  MockShiftRecord,
  OrderResult,
  Product,
  ProductStockAdjustmentRecord,
  ShiftCloseResult,
  ShiftOpenResult,
  UpdateTrainingEnrollmentInput,
  UserSession,
  TrainerRecord,
  TrainingEnrollmentRecord,
} from "@/lib/contracts";
import type {
  AppAdapter,
  CreateAdminUserInput,
  CreateChartOfAccountInput,
  CreateMemberInput,
  CreateProductInput,
  CreateProductStockAdjustmentInput,
  DailySummaryQuery,
  MemberListFilters,
  UpdateMemberInput,
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

  async listMembers(filters?: MemberListFilters) {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    const qs = params.toString();
    return fetchJson<MemberSubscriptionRecord[]>(`/api/v1/members${qs ? `?${qs}` : ""}`);
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
        tagline: input.tagline === undefined ? undefined : input.tagline,
        price: input.price,
        product_type: input.productType,
        pos_category: input.posCategory === undefined ? undefined : input.posCategory,
        featured_slot: input.featuredSlot === undefined ? undefined : input.featuredSlot,
        revenue_account_id:
          input.revenueAccountId === undefined ? undefined : String(input.revenueAccountId),
        stock_on_hand: input.stockOnHand ?? undefined,
        membership_period: input.membershipPeriod ?? undefined,
        membership_duration_days: input.membershipDurationDays ?? undefined,
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
        tagline: input.tagline === undefined ? undefined : input.tagline,
        price: input.price,
        pos_category: input.posCategory === undefined ? undefined : input.posCategory,
        featured_slot: input.featuredSlot === undefined ? undefined : input.featuredSlot,
        revenue_account_id:
          input.revenueAccountId === undefined ? undefined : String(input.revenueAccountId),
        stock_on_hand: input.stockOnHand ?? undefined,
        membership_period: input.membershipPeriod ?? undefined,
        membership_duration_days: input.membershipDurationDays ?? undefined,
      }),
    });
  },

  async listProductStockAdjustments(productId?: EntityId) {
    const params = new URLSearchParams();

    if (productId !== undefined) {
      params.set("product_id", String(productId));
    }

    const query = params.toString();
    return fetchJson<ProductStockAdjustmentRecord[]>(`/api/v1/products/stock-adjustments${query ? `?${query}` : ""}`);
  },

  async addProductStockAdjustment(input: CreateProductStockAdjustmentInput) {
    return fetchJson<ProductStockAdjustmentRecord>("/api/v1/products/stock-adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: String(input.productId),
        added_quantity: input.addedQuantity,
        note: input.note === undefined ? undefined : input.note,
      }),
    });
  },

  async getShiftInventorySummary(shiftId: string | number) {
    return fetchJson(
      `/api/v1/shifts/${encodeURIComponent(String(shiftId))}/inventory-summary`,
    );
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

  async updateSalesEntry(orderId: EntityId, input) {
    return fetchJson<SalesEntryUpdateResult>(`/api/v1/orders/${encodeURIComponent(String(orderId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: input.items,
      }),
    });
  },

  async deleteSalesEntry(orderId: EntityId) {
    return fetchJson<{ order_id: EntityId; order_number: string }>(
      `/api/v1/orders/${encodeURIComponent(String(orderId))}`,
      {
        method: "DELETE",
      },
    );
  },

  async deleteSalesEntries(orderIds: EntityId[]) {
    return fetchJson<{
      deleted_count: number;
      deleted_orders: Array<{ order_id: EntityId; order_number: string }>;
    }>("/api/v1/orders/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_ids: orderIds }),
    });
  },

  async getDailySummary(query: DailySummaryQuery) {
    const params = new URLSearchParams();
    params.set("period", query.period);
    if (query.date) params.set("date", query.date);
    if (query.start_date) params.set("start_date", query.start_date);
    if (query.end_date) params.set("end_date", query.end_date);
    return fetchJson<DailySummary>(`/api/v1/reports/daily-summary?${params.toString()}`);
  },

  async getShiftSummary(date: string, responsibleName?: string) {
    const params = new URLSearchParams({ date });
    if (responsibleName?.trim()) {
      params.set("responsible_name", responsibleName.trim());
    }

    return fetchJson<ShiftSummary>(`/api/v1/reports/shift-summary?${params.toString()}`);
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
      body: JSON.stringify({
        ...input,
        scheduled_start_time: input.scheduled_start_time,
        scheduled_end_time: input.scheduled_end_time,
        allowed_machine_ip: input.allowed_machine_ip,
      }),
    });
  },

  async listTrainers() {
    return fetchJson<Array<TrainerRecord & { assignments: TrainingEnrollmentRecord[] }>>("/api/v1/trainers");
  },

  async createTrainer(input: CreateTrainerInput) {
    return fetchJson<TrainerRecord>("/api/v1/trainers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async deleteTrainer(trainerId: EntityId) {
    return fetchJson<{ trainer_id: EntityId; full_name: string }>(`/api/v1/trainers/${encodeURIComponent(String(trainerId))}`, {
      method: "DELETE",
    });
  },

  async toggleTrainerActive(trainerId: EntityId) {
    return fetchJson<TrainerRecord>(`/api/v1/trainers/${encodeURIComponent(String(trainerId))}/toggle-active`, {
      method: "PATCH",
    });
  },

  async deleteTrainingEnrollment(enrollmentId: EntityId) {
    return fetchJson<{ enrollment_id: EntityId; customer_name: string; package_name: string }>(
      `/api/v1/trainers/enrollments/${encodeURIComponent(String(enrollmentId))}`,
      {
        method: "DELETE",
      },
    );
  },

  async deleteTrainingEnrollments(enrollmentIds: EntityId[]) {
    return fetchJson<{
      deleted_count: number;
      deleted_enrollments: Array<{ enrollment_id: EntityId; customer_name: string; package_name: string }>;
    }>("/api/v1/trainers/enrollments/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollment_ids: enrollmentIds }),
    });
  },

  async updateTrainingEnrollment(enrollmentId: string | number, input: UpdateTrainingEnrollmentInput) {
    return fetchJson<TrainingEnrollmentRecord>(
      `/api/v1/trainers/enrollments/${encodeURIComponent(String(enrollmentId))}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
  },

  async createMember(input: CreateMemberInput) {
    return fetchJson<MemberSubscriptionRecord>("/api/v1/members/special", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async updateMember(memberId: EntityId, input: UpdateMemberInput) {
    return fetchJson<MemberSubscriptionRecord>(`/api/v1/members/${encodeURIComponent(String(memberId))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  async deleteMember(memberId: EntityId) {
    return fetchJson<{ member_id: EntityId; full_name: string }>(`/api/v1/members/${encodeURIComponent(String(memberId))}`, {
      method: "DELETE",
    });
  },

  async renewMember(memberId: EntityId) {
    return fetchJson<MemberSubscriptionRecord>(`/api/v1/members/${encodeURIComponent(String(memberId))}/renew`, {
      method: "POST",
    });
  },

  async toggleMemberActive(memberId: EntityId) {
    return fetchJson<MemberSubscriptionRecord>(`/api/v1/members/${encodeURIComponent(String(memberId))}/toggle-active`, {
      method: "PATCH",
    });
  },

  async restartMember(memberId: EntityId) {
    return fetchJson<MemberSubscriptionRecord>(`/api/v1/members/${encodeURIComponent(String(memberId))}/restart`, {
      method: "POST",
    });
  },
};