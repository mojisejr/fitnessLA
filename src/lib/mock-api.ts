import type {
  ApiError,
  CreateOrderRequest,
  DailySummary,
  ExpenseResult,
  MockShiftRecord,
  OrderResult,
  Product,
  ShiftCloseResult,
  ShiftOpenResult,
  UserSession,
} from "@/lib/contracts";
import { demoPassword, mockDailySummary, mockProducts, mockUsersByRole } from "@/lib/mock-data";
import { sleep } from "@/lib/utils";

let orderSequence = 1001;
let expenseSequence = 3001;
let shiftSequence = 701;

function createError(code: string, message: string, details?: unknown): ApiError {
  return { code, message, details };
}

function cloneSession(session: UserSession) {
  return { ...session };
}

export async function authenticateMockUser(username: string, password: string) {
  await sleep(380);

  const normalized = username.trim().toLowerCase();
  const match = Object.values(mockUsersByRole).find(
    (candidate) => candidate.username.toLowerCase() === normalized,
  );

  if (!match || password !== demoPassword) {
    throw createError("INVALID_CREDENTIALS", "Username or password is incorrect.");
  }

  return cloneSession(match);
}

export async function fetchMockProducts() {
  await sleep(220);
  return mockProducts.map((product) => ({ ...product } satisfies Product));
}

export async function openMockShift(startingCash: number): Promise<ShiftOpenResult> {
  await sleep(260);

  if (startingCash < 0) {
    throw createError("INVALID_STARTING_CASH", "Starting cash must be zero or greater.");
  }

  const shift_id = shiftSequence;
  shiftSequence += 1;

  return {
    shift_id,
    opened_at: new Date().toISOString(),
  };
}

export function calculateExpectedCash(startingCash: number) {
  return Number((startingCash + 1860 - 240).toFixed(2));
}

export async function closeMockShift(input: {
  activeShift: MockShiftRecord;
  actualCash: number;
}): Promise<ShiftCloseResult> {
  await sleep(280);

  const expected_cash = calculateExpectedCash(input.activeShift.starting_cash);
  const difference = Number((input.actualCash - expected_cash).toFixed(2));

  return {
    shift_id: input.activeShift.shift_id,
    expected_cash,
    actual_cash: input.actualCash,
    difference,
    status: "CLOSED",
    journal_entry_id: input.activeShift.shift_id + 9000,
  };
}

export async function submitMockOrder(request: CreateOrderRequest): Promise<OrderResult> {
  await sleep(420);

  if (request.items.length === 0) {
    throw createError("EMPTY_CART", "Add at least one item before checkout.");
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
  };
}

export async function submitMockExpense(input: {
  shift_id: number;
  account_id: number;
  amount: number;
  description: string;
  receiptName: string;
}): Promise<ExpenseResult> {
  await sleep(340);

  if (!input.receiptName) {
    throw createError("RECEIPT_REQUIRED", "Receipt image is required.");
  }

  if (input.amount <= 0) {
    throw createError("INVALID_AMOUNT", "Expense amount must be greater than zero.");
  }

  const expense_id = expenseSequence;
  expenseSequence += 1;

  return {
    expense_id,
    status: "POSTED",
  };
}

export async function fetchMockDailySummary(date: string): Promise<DailySummary> {
  await sleep(260);

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
  };
}