export type Role = "OWNER" | "ADMIN" | "CASHIER";

export type EntityId = string | number;

export type PaymentMethod = "CASH" | "PROMPTPAY" | "CREDIT_CARD";

export type ProductType = "GOODS" | "SERVICE" | "MEMBERSHIP";

export type MembershipPeriod = "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export interface UserSession {
  user_id: EntityId;
  username: string;
  full_name: string;
  role: Role;
  active_shift_id: EntityId | null;
}

export interface ShiftOpenResult {
  shift_id: EntityId;
  opened_at: string;
}

export interface ShiftCloseResult {
  shift_id: EntityId;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  status: "CLOSED";
  journal_entry_id: EntityId;
}

export interface Product {
  product_id: EntityId;
  sku: string;
  name: string;
  price: number;
  product_type: ProductType;
  track_stock?: boolean;
  stock_on_hand?: number | null;
  membership_period?: MembershipPeriod | null;
  membership_duration_days?: number | null;
}

export interface CreateOrderRequest {
  shift_id: EntityId;
  items: {
    product_id: EntityId;
    quantity: number;
  }[];
  payment_method: PaymentMethod;
  customer_info?: {
    name: string;
    tax_id?: string;
  };
}

export interface OrderResult {
  order_id: EntityId;
  order_number: string;
  total_amount: number;
  tax_doc_number: string;
  status: "COMPLETED";
}

export interface ExpenseResult {
  expense_id: EntityId;
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

export interface MemberSubscriptionRecord {
  member_id: EntityId;
  member_code: string;
  full_name: string;
  phone: string;
  membership_product_id: EntityId;
  membership_name: string;
  membership_period: MembershipPeriod;
  started_at: string;
  expires_at: string;
  checked_in_at: string | null;
  renewed_at: string | null;
  renewal_status: "ACTIVE" | "EXPIRES_TODAY" | "EXPIRED_NOT_RENEWED" | "RENEWED";
}

export interface ShiftInventorySummaryRow {
  product_id: EntityId;
  sku: string;
  name: string;
  opening_stock: number;
  sold_quantity: number;
  remaining_stock: number;
}

export interface MockExpenseAccount {
  account_id: EntityId;
  account_code: string;
  account_name: string;
}

export interface ChartOfAccountRecord {
  account_id: EntityId;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  is_active: boolean;
  description?: string;
  locked_reason?: string;
}

export type MockChartOfAccount = ChartOfAccountRecord;

export interface AdminUserRecord {
  user_id: EntityId;
  username: string;
  full_name: string;
  email: string;
  role: Role;
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
  shift_id: EntityId;
  opened_at: string;
  starting_cash: number;
}