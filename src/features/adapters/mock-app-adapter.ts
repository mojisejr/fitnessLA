import type {
  ApiError,
  DailySummary,
  ExpenseResult,
  MockChartOfAccount,
  MockPendingUser,
  OrderResult,
  Product,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
} from "@/lib/contracts";
import {
  demoPassword,
  mockChartOfAccounts,
  mockDailySummary,
  mockPendingUsers,
  mockProducts,
  mockUsersByRole,
} from "@/lib/mock-data";
import { sleep } from "@/lib/utils";
import type { AppAdapter, CreateChartOfAccountInput, CreateUserRequestInput } from "@/features/adapters/types";

let orderSequence = 1001;
let expenseSequence = 3001;
let shiftSequence = 701;
let chartOfAccountsState = mockChartOfAccounts.map((item) => ({ ...item }));
let userRequestsState = mockPendingUsers.map((item) => ({ ...item }));

function createError(code: string, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

function cloneSession(session: UserSession) {
  return { ...session };
}

function cloneChartOfAccount(account: MockChartOfAccount) {
  return { ...account };
}

function cloneUserRequest(request: MockPendingUser) {
  return { ...request };
}

function calculateExpectedCash(startingCash: number) {
  return Number((startingCash + 1860 - 240).toFixed(2));
}

export function resetMockAdapterState() {
  orderSequence = 1001;
  expenseSequence = 3001;
  shiftSequence = 701;
  chartOfAccountsState = mockChartOfAccounts.map((item) => ({ ...item }));
  userRequestsState = mockPendingUsers.map((item) => ({ ...item }));
}

export const mockAppAdapter: AppAdapter = {
  mode: "mock",

  async authenticateUser(username, password) {
    await sleep(220);

    const normalized = username.trim().toLowerCase();
    const match = Object.values(mockUsersByRole).find(
      (candidate) => candidate.username.toLowerCase() === normalized,
    );

    if (!match || password !== demoPassword) {
      throw createError("INVALID_CREDENTIALS", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    return cloneSession(match);
  },

  async listProducts() {
    await sleep(180);
    return mockProducts.map((product) => ({ ...product } satisfies Product));
  },

  async openShift(startingCash) {
    await sleep(220);

    if (startingCash < 0) {
      throw createError("INVALID_STARTING_CASH", "เงินทอนตั้งต้นต้องเป็นศูนย์หรือมากกว่า");
    }

    const shift_id = shiftSequence;
    shiftSequence += 1;

    return {
      shift_id,
      opened_at: new Date().toISOString(),
    } satisfies ShiftOpenResult;
  },

  async closeShift({ activeShift, actualCash }) {
    await sleep(240);

    const expected_cash = calculateExpectedCash(activeShift.starting_cash);
    const difference = Number((actualCash - expected_cash).toFixed(2));

    return {
      shift_id: activeShift.shift_id,
      expected_cash,
      actual_cash: actualCash,
      difference,
      status: "CLOSED",
      journal_entry_id: activeShift.shift_id + 9000,
    } satisfies ShiftCloseResult;
  },

  async createOrder(request) {
    await sleep(300);

    if (request.items.length === 0) {
      throw createError("EMPTY_CART", "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
    }

    const total_amount = Number(
      request.items
        .reduce((sum, line) => {
          const product = mockProducts.find((candidate) => candidate.product_id === line.product_id);
          return sum + (product?.price ?? 0) * line.quantity;
        }, 0)
        .toFixed(2),
    );

    const currentSequence = orderSequence;
    orderSequence += 1;

    return {
      order_id: currentSequence,
      order_number: `POS-${new Date().getFullYear()}-${String(currentSequence).padStart(4, "0")}`,
      total_amount,
      tax_doc_number: `INV-${new Date().getFullYear()}-${String(currentSequence).padStart(4, "0")}`,
      status: "COMPLETED",
    } satisfies OrderResult;
  },

  async createExpense(input) {
    await sleep(260);

    if (!input.receiptName) {
      throw createError("RECEIPT_REQUIRED", "ต้องแนบรูปใบเสร็จก่อนบันทึก");
    }

    if (input.amount <= 0) {
      throw createError("INVALID_AMOUNT", "จำนวนเงินต้องมากกว่า 0");
    }

    const expense_id = expenseSequence;
    expenseSequence += 1;

    return {
      expense_id,
      status: "POSTED",
    } satisfies ExpenseResult;
  },

  async getDailySummary(date) {
    await sleep(220);

    const day = Number(date.split("-").at(-1) ?? 1);
    const offset = day % 4;

    return {
      total_sales: mockDailySummary.total_sales + offset * 260,
      sales_by_method: {
        CASH: mockDailySummary.sales_by_method.CASH + offset * 120,
        PROMPTPAY: mockDailySummary.sales_by_method.PROMPTPAY + offset * 70,
        CREDIT_CARD: mockDailySummary.sales_by_method.CREDIT_CARD + offset * 70,
      },
      total_expenses: mockDailySummary.total_expenses + offset * 40,
      net_cash_flow: mockDailySummary.net_cash_flow + offset * 80,
      shift_discrepancies: mockDailySummary.shift_discrepancies + offset * 10,
    } satisfies DailySummary;
  },

  async listChartOfAccounts() {
    await sleep(160);
    return chartOfAccountsState.map(cloneChartOfAccount);
  },

  async createChartOfAccount(input: CreateChartOfAccountInput) {
    await sleep(180);

    if (chartOfAccountsState.some((account) => account.account_code === input.account_code)) {
      throw createError("DUPLICATE_ACCOUNT_CODE", "รหัสบัญชีนี้ถูกใช้งานแล้ว");
    }

    const nextAccount: MockChartOfAccount = {
      account_id: Math.max(...chartOfAccountsState.map((account) => account.account_id)) + 1,
      account_code: input.account_code,
      account_name: input.account_name,
      account_type: input.account_type,
      is_active: true,
      description: input.description,
    };

    chartOfAccountsState = [nextAccount, ...chartOfAccountsState];
    return cloneChartOfAccount(nextAccount);
  },

  async toggleChartOfAccount(accountId: number) {
    await sleep(140);

    const target = chartOfAccountsState.find((account) => account.account_id === accountId);
    if (!target) {
      throw createError("ACCOUNT_NOT_FOUND", "ไม่พบบัญชีที่ต้องการแก้ไข");
    }
    if (target.locked_reason) {
      throw createError("ACCOUNT_LOCKED", target.locked_reason);
    }

    chartOfAccountsState = chartOfAccountsState.map((account) =>
      account.account_id === accountId ? { ...account, is_active: !account.is_active } : account,
    );

    return cloneChartOfAccount(
      chartOfAccountsState.find((account) => account.account_id === accountId)!,
    );
  },

  async listUserRequests() {
    await sleep(160);
    return userRequestsState.map(cloneUserRequest);
  },

  async createUserRequest(input: CreateUserRequestInput) {
    await sleep(180);

    if (userRequestsState.some((request) => request.username === input.username)) {
      throw createError("DUPLICATE_USERNAME", "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
    }

    const nextRequest: MockPendingUser = {
      request_id: Math.max(...userRequestsState.map((request) => request.request_id)) + 1,
      full_name: input.full_name,
      username: input.username,
      role: input.role,
      branch_label: input.branch_label,
      status: "PENDING",
      submitted_at: new Date().toISOString(),
    };

    userRequestsState = [nextRequest, ...userRequestsState];
    return cloneUserRequest(nextRequest);
  },

  async approveUserRequest(requestId: number) {
    await sleep(140);

    const target = userRequestsState.find((request) => request.request_id === requestId);
    if (!target) {
      throw createError("REQUEST_NOT_FOUND", "ไม่พบคำขอที่ต้องการอนุมัติ");
    }

    userRequestsState = userRequestsState.map((request) =>
      request.request_id === requestId ? { ...request, status: "APPROVED" } : request,
    );

    return cloneUserRequest(
      userRequestsState.find((request) => request.request_id === requestId)!,
    );
  },
};