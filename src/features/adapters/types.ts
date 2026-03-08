import type {
  CreateOrderRequest,
  DailySummary,
  ExpenseResult,
  MockChartOfAccount,
  MockPendingUser,
  MockShiftRecord,
  OrderResult,
  Product,
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

export type CreateUserRequestInput = {
  full_name: string;
  username: string;
  role: "ADMIN" | "CASHIER";
  branch_label: string;
};

export interface AppAdapter {
  mode: "mock" | "real";
  authenticateUser: (username: string, password: string) => Promise<UserSession>;
  listProducts: () => Promise<Product[]>;
  openShift: (startingCash: number) => Promise<ShiftOpenResult>;
  closeShift: (input: { activeShift: MockShiftRecord; actualCash: number }) => Promise<ShiftCloseResult>;
  createOrder: (request: CreateOrderRequest) => Promise<OrderResult>;
  createExpense: (input: {
    shift_id: number;
    account_id: number;
    amount: number;
    description: string;
    receiptName: string;
  }) => Promise<ExpenseResult>;
  getDailySummary: (date: string) => Promise<DailySummary>;
  listChartOfAccounts: () => Promise<MockChartOfAccount[]>;
  createChartOfAccount: (input: CreateChartOfAccountInput) => Promise<MockChartOfAccount>;
  toggleChartOfAccount: (accountId: number) => Promise<MockChartOfAccount>;
  listUserRequests: () => Promise<MockPendingUser[]>;
  createUserRequest: (input: CreateUserRequestInput) => Promise<MockPendingUser>;
  approveUserRequest: (requestId: number) => Promise<MockPendingUser>;
}