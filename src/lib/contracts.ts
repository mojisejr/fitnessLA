export type Role = "OWNER" | "ADMIN" | "CASHIER";

export type PaymentMethod = "CASH" | "PROMPTPAY" | "CREDIT_CARD";

export type ProductType = "GOODS" | "SERVICE" | "MEMBERSHIP";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export interface UserSession {
  user_id: number;
  username: string;
  full_name: string;
  role: Role;
  active_shift_id: number | null;
}

export interface ShiftOpenResult {
  shift_id: number;
  opened_at: string;
}

export interface ShiftCloseResult {
  shift_id: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  status: "CLOSED";
  journal_entry_id: number;
}

export interface Product {
  product_id: number;
  sku: string;
  name: string;
  price: number;
  product_type: ProductType;
}

export interface CreateOrderRequest {
  shift_id: number;
  items: {
    product_id: number;
    quantity: number;
  }[];
  payment_method: PaymentMethod;
  customer_info?: {
    name: string;
    tax_id?: string;
  };
}

export interface OrderResult {
  order_id: number;
  order_number: string;
  total_amount: number;
  tax_doc_number: string;
  status: "COMPLETED";
}

export interface ExpenseResult {
  expense_id: number;
  status: "POSTED";
}

export interface DailySummary {
  total_sales: number;
  sales_by_method: {
    CASH: number;
    PROMPTPAY: number;
    CREDIT_CARD: number;
  };
  total_expenses: number;
  net_cash_flow: number;
  shift_discrepancies: number;
}

export interface MockExpenseAccount {
  account_id: number;
  account_code: string;
  account_name: string;
}

export interface MockChartOfAccount {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  is_active: boolean;
  description?: string;
  locked_reason?: string;
}

export interface MockPendingUser {
  request_id: number;
  full_name: string;
  username: string;
  role: Exclude<Role, "OWNER">;
  branch_label: string;
  status: "PENDING" | "APPROVED";
  submitted_at: string;
}

export interface MockShiftRecord {
  shift_id: number;
  opened_at: string;
  starting_cash: number;
}