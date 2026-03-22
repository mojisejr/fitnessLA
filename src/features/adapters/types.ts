import type {
  AdminUserRecord,
  AttendanceStatusRecord,
  ChartOfAccountRecord,
  CreateTrainerInput,
  EntityId,
  ManagedStaffUserRecord,
  CreateOrderRequest,
  DailySummary,
  MemberSubscriptionRecord,
  SalesEntryUpdateResult,
  ShiftSummary,
  ExpenseResult,
  MockShiftRecord,
  OrderResult,
  Product,
  ProductStockAdjustmentRecord,
  ShiftInventorySummaryRow,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
  AccountType,
  ReportPeriod,
  TrainerRecord,
  TrainingEnrollmentRecord,
  UpdateSalesEntryInput,
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
  phone: string;
  username: string;
  password: string;
  role: "OWNER" | "ADMIN" | "CASHIER";
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  allowed_machine_ip?: string;
};

export type UpdateManagedUserInput = {
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  allowed_machine_ip?: string | null;
};

export type UpdateProductInput = {
  productId: EntityId;
  sku: string;
  name: string;
  tagline?: string | null;
  price: number;
  posCategory?: "COFFEE" | "MEMBERSHIP" | "FOOD" | "TRAINING" | "COUNTER";
  featuredSlot?: 1 | 2 | 3 | 4 | null;
  revenueAccountId?: EntityId;
  stockOnHand?: number | null;
  membershipPeriod?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membershipDurationDays?: number | null;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  tagline?: string | null;
  price: number;
  productType: "GOODS" | "SERVICE" | "MEMBERSHIP";
  posCategory?: "COFFEE" | "MEMBERSHIP" | "FOOD" | "TRAINING" | "COUNTER";
  featuredSlot?: 1 | 2 | 3 | 4 | null;
  revenueAccountId?: EntityId;
  stockOnHand?: number | null;
  membershipPeriod?: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | null;
  membershipDurationDays?: number | null;
};

export type CreateProductStockAdjustmentInput = {
  productId: EntityId;
  addedQuantity: number;
  note?: string | null;
  performedByName?: string;
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

export type CreateMemberInput = {
  full_name: string;
  phone?: string;
  membership_name: string;
  membership_period: "DAILY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
  started_at: string;
  expires_at: string;
};

export type UpdateMemberInput = {
  started_at: string;
  expires_at: string;
};

export type DeleteMemberResult = {
  member_id: EntityId;
  full_name: string;
};

export type DeleteTrainerResult = {
  trainer_id: EntityId;
  full_name: string;
};

export type DeleteTrainingEnrollmentResult = {
  enrollment_id: EntityId;
  customer_name: string;
  package_name: string;
};

export type DeleteSalesEntryResult = {
  order_id: EntityId;
  order_number: string;
};

export type BulkDeleteSalesEntriesResult = {
  deleted_count: number;
  deleted_orders: DeleteSalesEntryResult[];
};

export type BulkDeleteTrainingEnrollmentsResult = {
  deleted_count: number;
  deleted_enrollments: DeleteTrainingEnrollmentResult[];
};

export interface AppAdapter {
  mode: "mock" | "real";
  authenticateUser: (username: string, password: string) => Promise<UserSession>;
  getActiveShift: () => Promise<MockShiftRecord | null>;
  listMembers: (filters?: MemberListFilters) => Promise<MemberSubscriptionRecord[]>;
  listProducts: () => Promise<Product[]>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  updateProduct: (input: UpdateProductInput) => Promise<Product>;
  listProductStockAdjustments: (productId?: EntityId) => Promise<ProductStockAdjustmentRecord[]>;
  addProductStockAdjustment: (input: CreateProductStockAdjustmentInput) => Promise<ProductStockAdjustmentRecord>;
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
  updateSalesEntry: (orderId: EntityId, input: UpdateSalesEntryInput) => Promise<SalesEntryUpdateResult>;
  deleteSalesEntry: (orderId: EntityId) => Promise<DeleteSalesEntryResult>;
  deleteSalesEntries: (orderIds: EntityId[]) => Promise<BulkDeleteSalesEntriesResult>;
  getDailySummary: (query: DailySummaryQuery) => Promise<DailySummary>;
  getShiftSummary: (date: string, responsibleName?: string) => Promise<ShiftSummary>;
  listChartOfAccounts: () => Promise<ChartOfAccountRecord[]>;
  createChartOfAccount: (input: CreateChartOfAccountInput) => Promise<ChartOfAccountRecord>;
  toggleChartOfAccount: (accountId: EntityId) => Promise<ChartOfAccountRecord>;
  createAdminUser: (input: CreateAdminUserInput) => Promise<AdminUserRecord>;
  listManagedUsers?: () => Promise<ManagedStaffUserRecord[]>;
  updateManagedUser?: (userId: EntityId, input: UpdateManagedUserInput) => Promise<ManagedStaffUserRecord>;
  getAttendanceStatus?: () => Promise<AttendanceStatusRecord>;
  listTrainers: () => Promise<Array<TrainerRecord & { assignments: TrainingEnrollmentRecord[] }>>;
  createTrainer: (input: CreateTrainerInput) => Promise<TrainerRecord>;
  deleteTrainer: (trainerId: EntityId) => Promise<DeleteTrainerResult>;
  toggleTrainerActive: (trainerId: EntityId) => Promise<TrainerRecord>;
  deleteTrainingEnrollment: (enrollmentId: EntityId) => Promise<DeleteTrainingEnrollmentResult>;
  deleteTrainingEnrollments: (enrollmentIds: EntityId[]) => Promise<BulkDeleteTrainingEnrollmentsResult>;
  updateTrainingEnrollment: (
    enrollmentId: EntityId,
    input: UpdateTrainingEnrollmentInput,
  ) => Promise<TrainingEnrollmentRecord>;
  createMember: (input: CreateMemberInput) => Promise<MemberSubscriptionRecord>;
  updateMember: (memberId: EntityId, input: UpdateMemberInput) => Promise<MemberSubscriptionRecord>;
  deleteMember: (memberId: EntityId) => Promise<DeleteMemberResult>;
  toggleMemberActive: (memberId: EntityId) => Promise<MemberSubscriptionRecord>;
  renewMember: (memberId: EntityId) => Promise<MemberSubscriptionRecord>;
  restartMember: (memberId: EntityId) => Promise<MemberSubscriptionRecord>;
}