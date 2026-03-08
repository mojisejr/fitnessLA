import type {
  DailySummary,
  MockChartOfAccount,
  MockExpenseAccount,
  MockPendingUser,
  Product,
  Role,
  UserSession,
} from "@/lib/contracts";

export const demoPassword = "demo1234";

export const mockUsersByRole: Record<Role, UserSession> = {
  OWNER: {
    user_id: 1,
    username: "owner",
    full_name: "Lalin Charoen",
    role: "OWNER",
    active_shift_id: null,
  },
  ADMIN: {
    user_id: 2,
    username: "admin",
    full_name: "Niran Ops Lead",
    role: "ADMIN",
    active_shift_id: null,
  },
  CASHIER: {
    user_id: 3,
    username: "cashier",
    full_name: "Pim Counter",
    role: "CASHIER",
    active_shift_id: null,
  },
};

export const mockProducts: Product[] = [
  { product_id: 101, sku: "WATER-01", name: "Mineral Water", price: 25, product_type: "GOODS" },
  { product_id: 102, sku: "SHAKE-01", name: "Protein Shake", price: 95, product_type: "GOODS" },
  { product_id: 103, sku: "DAYPASS", name: "Day Pass", price: 250, product_type: "SERVICE" },
  { product_id: 104, sku: "MEM-MONTH", name: "Monthly Membership", price: 1490, product_type: "MEMBERSHIP" },
  { product_id: 105, sku: "PT-01", name: "Personal Training", price: 850, product_type: "SERVICE" },
  { product_id: 106, sku: "TOWEL-01", name: "Towel Service", price: 40, product_type: "SERVICE" },
];

export const mockExpenseAccounts: MockExpenseAccount[] = [
  { account_id: 201, account_code: "5201", account_name: "Cleaning Supplies" },
  { account_id: 202, account_code: "5202", account_name: "Small Equipment" },
  { account_id: 203, account_code: "5203", account_name: "Office Snacks" },
  { account_id: 204, account_code: "5204", account_name: "Maintenance Expense" },
];

export const mockChartOfAccounts: MockChartOfAccount[] = [
  {
    account_id: 1,
    account_code: "1111",
    account_name: "Cash on Hand",
    account_type: "ASSET",
    is_active: true,
    description: "Default drawer cash account for shift operations.",
    locked_reason: "Referenced by shift opening and close reconciliation.",
  },
  {
    account_id: 2,
    account_code: "1120",
    account_name: "PromptPay Clearing",
    account_type: "ASSET",
    is_active: true,
    description: "Incoming transfers from PromptPay.",
  },
  {
    account_id: 3,
    account_code: "1130",
    account_name: "Credit Card Receivable",
    account_type: "ASSET",
    is_active: true,
    description: "Pending settlement from card processor.",
  },
  {
    account_id: 4,
    account_code: "4101",
    account_name: "Membership Revenue",
    account_type: "REVENUE",
    is_active: true,
    description: "Monthly and annual gym membership sales.",
  },
  {
    account_id: 5,
    account_code: "5201",
    account_name: "Cleaning Supplies",
    account_type: "EXPENSE",
    is_active: false,
    description: "Legacy expense bucket kept for audit history.",
    locked_reason: "Previously posted in petty cash history.",
  },
];

export const mockPendingUsers: MockPendingUser[] = [
  {
    request_id: 9001,
    full_name: "Mali Counter",
    username: "mali.counter",
    role: "CASHIER",
    branch_label: "Front Desk",
    status: "PENDING",
    submitted_at: "2026-03-08T08:30:00.000Z",
  },
  {
    request_id: 9002,
    full_name: "Ton Supervisor",
    username: "ton.supervisor",
    role: "ADMIN",
    branch_label: "Main Floor",
    status: "APPROVED",
    submitted_at: "2026-03-07T16:10:00.000Z",
  },
];

export const mockDailySummary: DailySummary = {
  total_sales: 8420,
  sales_by_method: {
    CASH: 3120,
    PROMPTPAY: 2580,
    CREDIT_CARD: 2720,
  },
  total_expenses: 640,
  net_cash_flow: 2480,
  shift_discrepancies: -60,
};