import type {
  AdminUserRecord,
  ChartOfAccountRecord,
  CreateTrainerInput,
  EntityId,
  CreateOrderRequest,
  DailySummary,
  MemberSubscriptionRecord,
  ShiftSummary,
  ExpenseResult,
  MockShiftRecord,
  OrderResult,
  Product,
  ShiftInventorySummaryRow,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
  AccountType,
  ReportPeriod,
  TrainerRecord,
  TrainingEnrollmentRecord,
  UpdateTrainingEnrollmentInput,
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
  membershipPeriod?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membershipDurationDays?: number | null;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  price: number;
  productType: "GOODS" | "SERVICE" | "MEMBERSHIP";
  revenueAccountId?: EntityId;
  stockOnHand?: number | null;
  membershipPeriod?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membershipDurationDays?: number | null;
};

export type DailySummaryQuery = {
  period: ReportPeriod;
  date?: string;
  start_date?: string;
  end_date?: string;
};

export type MemberListFilters = {
  search?: string;
  status?: "ALL" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
};

export interface AppAdapter {
  mode: "mock" | "real";
  authenticateUser: (username: string, password: string) => Promise<UserSession>;
  getActiveShift: () => Promise<MockShiftRecord | null>;
  listMembers: (filters?: MemberListFilters) => Promise<MemberSubscriptionRecord[]>;
  listProducts: () => Promise<Product[]>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  updateProduct: (input: UpdateProductInput) => Promise<Product>;
  getShiftInventorySummary: (shiftId: EntityId) => Promise<ShiftInventorySummaryRow[]>;
  openShift: (startingCash: number, responsibleName: string) => Promise<ShiftOpenResult>;
  closeShift: (input: {
    activeShift: MockShiftRecord;
    actualCash: number;
    closingNote?: string;
    responsibleName: string;
  }) => Promise<ShiftCloseResult>;
  createOrder: (request: CreateOrderRequest) => Promise<OrderResult>;
  createExpense: (input: {
    shift_id: EntityId;
    account_id: EntityId;
    amount: number;
    description: string;
    receiptName: string;
    receiptFile?: File | null;
  }) => Promise<ExpenseResult>;
  getDailySummary: (query: DailySummaryQuery) => Promise<DailySummary>;
  getShiftSummary: (date: string, responsibleName?: string) => Promise<ShiftSummary>;
  listChartOfAccounts: () => Promise<ChartOfAccountRecord[]>;
  createChartOfAccount: (input: CreateChartOfAccountInput) => Promise<ChartOfAccountRecord>;
  toggleChartOfAccount: (accountId: EntityId) => Promise<ChartOfAccountRecord>;
  createAdminUser: (input: CreateAdminUserInput) => Promise<AdminUserRecord>;
  listTrainers: () => Promise<Array<TrainerRecord & { assignments: TrainingEnrollmentRecord[] }>>;
  createTrainer: (input: CreateTrainerInput) => Promise<TrainerRecord>;
  toggleTrainerActive: (trainerId: EntityId) => Promise<TrainerRecord>;
  updateTrainingEnrollment: (
    enrollmentId: EntityId,
    input: UpdateTrainingEnrollmentInput,
  ) => Promise<TrainingEnrollmentRecord>;
  toggleMemberActive: (memberId: EntityId) => Promise<MemberSubscriptionRecord>;
  renewMember: (memberId: EntityId) => Promise<MemberSubscriptionRecord>;
  restartMember: (memberId: EntityId) => Promise<MemberSubscriptionRecord>;
}