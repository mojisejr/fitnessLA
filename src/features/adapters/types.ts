import type {
  AdminUserRecord,
  ChartOfAccountRecord,
  EntityId,
  CreateOrderRequest,
  DailySummary,
  ExpenseResult,
  MockShiftRecord,
  OrderResult,
  Product,
  ShiftInventorySummaryRow,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
  AccountType,
} from "@/lib/contracts";

export type CreateChartOfAccountInput = {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  description?: string;
};

export type CreateAdminUserInput = {
  full_name: string;
  username: string;
  email: string;
  role: "ADMIN" | "CASHIER";
};

export type UpdateProductInput = {
  productId: EntityId;
  sku: string;
  name: string;
  price: number;
  revenueAccountId?: EntityId;
  stockOnHand?: number | null;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  price: number;
  productType: "GOODS" | "SERVICE";
  revenueAccountId?: EntityId;
  stockOnHand?: number | null;
};

export interface AppAdapter {
  mode: "mock" | "real";
  authenticateUser: (username: string, password: string) => Promise<UserSession>;
  getActiveShift: () => Promise<MockShiftRecord | null>;
  listProducts: () => Promise<Product[]>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  updateProduct: (input: UpdateProductInput) => Promise<Product>;
  getShiftInventorySummary: (shiftId: EntityId) => Promise<ShiftInventorySummaryRow[]>;
  openShift: (startingCash: number) => Promise<ShiftOpenResult>;
  closeShift: (input: { activeShift: MockShiftRecord; actualCash: number }) => Promise<ShiftCloseResult>;
  createOrder: (request: CreateOrderRequest) => Promise<OrderResult>;
  createExpense: (input: {
    shift_id: EntityId;
    account_id: EntityId;
    amount: number;
    description: string;
    receiptName: string;
    receiptFile?: File | null;
  }) => Promise<ExpenseResult>;
  getDailySummary: (date: string) => Promise<DailySummary>;
  listChartOfAccounts: () => Promise<ChartOfAccountRecord[]>;
  createChartOfAccount: (input: CreateChartOfAccountInput) => Promise<ChartOfAccountRecord>;
  toggleChartOfAccount: (accountId: EntityId) => Promise<ChartOfAccountRecord>;
  createAdminUser: (input: CreateAdminUserInput) => Promise<AdminUserRecord>;
}