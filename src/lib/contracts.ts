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
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  allowed_machine_ip?: string | null;
}

export type AttendanceArrivalStatus = "EARLY" | "ON_TIME" | "LATE" | "UNSCHEDULED";

export type AttendanceDepartureStatus = "PENDING" | "ON_TIME" | "EARLY_LEAVE" | "OVERTIME";

export interface StaffAttendanceRecord {
  attendance_id: EntityId;
  user_id: EntityId;
  full_name: string;
  username: string;
  role: Role;
  work_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  arrival_status: AttendanceArrivalStatus;
  departure_status: AttendanceDepartureStatus;
  late_minutes: number;
  early_arrival_minutes: number;
  overtime_minutes: number;
  early_leave_minutes: number;
  machine_ip: string | null;
  note?: string | null;
}

export interface ManagedStaffUserRecord extends AdminUserRecord {
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  allowed_machine_ip: string | null;
  latest_attendance: StaffAttendanceRecord | null;
}

export interface AttendanceDeviceRecord {
  device_id: EntityId;
  label: string;
  registered_ip: string | null;
  user_agent: string | null;
  approved_by_user_id: EntityId;
  approved_by_name: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

export interface AttendanceDeviceStatusRecord {
  current_ip: string | null;
  current_user_agent: string | null;
  current_device_authorized: boolean;
  active_device: AttendanceDeviceRecord | null;
}

export interface AttendanceStatusRecord {
  today: StaffAttendanceRecord | null;
  current_ip: string | null;
  device_allowed: boolean;
  can_check_in: boolean;
  can_check_out: boolean;
  has_active_shift: boolean;
  active_device: AttendanceDeviceRecord | null;
}

export interface ShiftOpenResult {
  shift_id: EntityId;
  opened_at: string;
  responsible_name?: string;
}

export interface ShiftCloseResult {
  shift_id: EntityId;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  status: "CLOSED";
  journal_entry_id: EntityId;
  responsible_name?: string;
}

export interface Product {
  product_id: EntityId;
  sku: string;
  name: string;
  tagline?: string | null;
  price: number;
  product_type: ProductType;
  pos_category?: PosSalesCategory | null;
  featured_slot?: 1 | 2 | 3 | 4 | null;
  revenue_account_id?: EntityId;
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
    trainer_id?: EntityId;
    service_start_date?: string;
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

export interface SalesEntryItem {
  order_item_id: EntityId;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface UpdateSalesEntryInput {
  items: Array<{
    order_item_id: EntityId;
    quantity: number;
    unit_price: number;
  }>;
}

export interface SalesEntryUpdateResult {
  order_id: EntityId;
  items_summary: string;
  total_amount: number;
  items: SalesEntryItem[];
}

export interface ExpenseResult {
  expense_id: EntityId;
  status: "POSTED";
}

export interface DailySalesRow {
  order_id: EntityId;
  shift_id?: EntityId;
  order_number: string;
  sold_at: string;
  items_summary: string;
  items?: SalesEntryItem[];
  cashier_name: string;
  responsible_name?: string;
  customer_name: string | null;
  payment_method: PaymentMethod;
  total_amount: number;
}

export interface DailyShiftRow {
  shift_id: EntityId;
  closed_at: string;
  responsible_name: string;
  expected_cash: number;
  actual_cash: number;
  difference: number;
}

export interface DailySummary {
  report_period: ReportPeriod;
  range_start: string;
  range_end: string;
  total_sales: number;
  sales_by_method: {
    CASH: number;
    PROMPTPAY: number;
    CREDIT_CARD: number;
  };
  sales_by_category: SalesByCategoryRow[];
  total_expenses: number;
  net_cash_flow: number;
  shift_discrepancies: number;
  sales_rows: DailySalesRow[];
  shift_rows: DailyShiftRow[];
}

export interface ShiftSummaryShiftRow extends DailyShiftRow {
  receipt_count: number;
  sales_by_method: {
    CASH: number;
    PROMPTPAY: number;
    CREDIT_CARD: number;
  };
  total_sales: number;
}

export interface ShiftSummary {
  date: string;
  sales_rows: DailySalesRow[];
  shift_rows: ShiftSummaryShiftRow[];
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
}

export interface MemberSubscriptionRecord {
  member_id: EntityId;
  member_code: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  membership_product_id: EntityId;
  membership_name: string;
  membership_period: MembershipPeriod;
  started_at: string;
  expires_at: string;
  checked_in_at: string | null;
  renewed_at: string | null;
  renewal_status: "ACTIVE" | "EXPIRES_TODAY" | "EXPIRED_NOT_RENEWED" | "RENEWED";
  renewal_method: RenewalMethod;
  training_summary?: MemberTrainingSummary;
}

export type MemberMutationResult = MemberSubscriptionRecord;

export interface ShiftInventorySummaryRow {
  product_id: EntityId;
  sku: string;
  name: string;
  opening_stock: number;
  sold_quantity: number;
  remaining_stock: number;
}

export interface ProductStockAdjustmentRecord {
  adjustment_id: EntityId;
  product_id: EntityId;
  product_name: string;
  product_sku: string;
  previous_stock: number;
  added_quantity: number;
  new_stock: number;
  note?: string | null;
  created_by_user_id: EntityId;
  created_by_name: string;
  created_at: string;
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
  phone?: string | null;
  email?: string;
  role: Role;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  allowed_machine_ip?: string | null;
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
  responsible_name?: string;
}

// --- Report Types ---

export type ReportPeriod = "DAY" | "WEEK" | "MONTH" | "CUSTOM";

export type PosSalesCategory =
  | "COFFEE"
  | "MEMBERSHIP"
  | "FOOD"
  | "TRAINING"
  | "COUNTER";

export interface SalesByCategoryRow {
  category: PosSalesCategory;
  label: string;
  total_amount: number;
  receipt_count: number;
  item_count: number;
}

// --- Members/Trainer Types ---

export type RenewalMethod =
  | "NONE"
  | "EXTEND_FROM_PREVIOUS_END"
  | "RESTART_FROM_NEW_START";

export type TrainingStatus = "NONE" | "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED";

export interface MemberTrainingSummary {
  training_status: TrainingStatus;
  trainer_id?: EntityId | null;
  trainer_name?: string | null;
  training_package_name?: string | null;
  training_package_sku?: string | null;
  training_started_at?: string | null;
  training_expires_at?: string | null;
}

// --- Trainer Records ---

export interface TrainerRecord {
  trainer_id: EntityId;
  trainer_code: string;
  full_name: string;
  nickname?: string | null;
  phone?: string | null;
  is_active: boolean;
  active_customer_count: number;
}

export interface TrainingEnrollmentRecord {
  enrollment_id: EntityId;
  trainer_id: EntityId | null;
  trainer_name: string | null;
  customer_name: string;
  member_id: EntityId | null;
  package_name: string;
  package_sku: string;
  started_at: string;
  expires_at: string | null;
  session_limit?: number | null;
  sessions_remaining?: number | null;
  price: number;
  status: "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED";
  closed_at?: string | null;
  close_reason?: string | null;
  updated_at: string;
}

export interface CreateTrainerInput {
  full_name: string;
  nickname?: string;
  phone?: string;
}

export interface UpdateTrainingEnrollmentInput {
  sessions_remaining?: number | null;
  status?: "ACTIVE" | "EXPIRED" | "UNASSIGNED" | "CLOSED";
  close_reason?: string | null;
}