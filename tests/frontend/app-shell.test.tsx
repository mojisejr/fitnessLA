import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";

const mockUseAuth = vi.fn();
const mockUsePathname = vi.fn();
const mockAdapter = {
  getDailySummary: vi.fn(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/branding/logo-slot", () => ({
  LogoSlot: () => <div data-testid="logo-slot">Logo</div>,
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/features/adapters/adapter-provider", () => ({
  useAppAdapter: () => mockAdapter,
}));

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseAuth.mockReturnValue({
      session: {
        user_id: "u1",
        username: "owner",
        full_name: "Owner FitnessLA",
        role: "OWNER",
        active_shift_id: "shift-1",
      },
      activeShift: {
        shift_id: "shift-1",
        opened_at: "2026-03-21T13:33:00.000Z",
        starting_cash: 500,
        responsible_name: "Owner FitnessLA",
      },
      logout: vi.fn(),
      switchRole: vi.fn(),
      mode: "real",
    });
    mockAdapter.getDailySummary.mockResolvedValue({
      report_period: "DAY",
      range_start: "2026-03-21",
      range_end: "2026-03-21",
      total_sales: 2450,
      sales_by_method: { CASH: 2000, PROMPTPAY: 450, CREDIT_CARD: 0 },
      sales_by_category: [],
      total_expenses: 0,
      net_cash_flow: 2000,
      shift_discrepancies: 0,
      shift_rows: [],
      sales_rows: [
        {
          order_id: "ord-1",
          shift_id: "shift-1",
          order_number: "ORD001",
          sold_at: "2026-03-21T13:40:00.000Z",
          items_summary: "น้ำ x1",
          cashier_name: "Owner FitnessLA",
          responsible_name: "Owner FitnessLA",
          customer_name: null,
          payment_method: "CASH",
          total_amount: 2000,
        },
        {
          order_id: "ord-2",
          shift_id: "shift-1",
          order_number: "ORD002",
          sold_at: "2026-03-21T14:05:00.000Z",
          items_summary: "เทรน x1",
          cashier_name: "Owner FitnessLA",
          responsible_name: "Owner FitnessLA",
          customer_name: null,
          payment_method: "PROMPTPAY",
          total_amount: 450,
        },
        {
          order_id: "ord-3",
          shift_id: "shift-2",
          order_number: "ORD003",
          sold_at: "2026-03-21T14:10:00.000Z",
          items_summary: "อื่นๆ x1",
          cashier_name: "Other",
          responsible_name: "Other",
          customer_name: null,
          payment_method: "CASH",
          total_amount: 999,
        },
      ],
    });
  });

  it("shows simplified branding and active shift sales", async () => {
    render(
      <AppShell>
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByText("LA")).toBeInTheDocument();
    expect(screen.getByText("GYM")).toBeInTheDocument();
    expect(screen.queryByText("ศูนย์ควบคุมงานหน้าร้าน")).not.toBeInTheDocument();
    expect(screen.queryByText("ระบบหน้าร้านและบัญชีรายวัน")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("฿2,450.00")).toBeInTheDocument();
    });
    expect(screen.getByText("เงินที่ทำได้")).toBeInTheDocument();
  });

  it("shows POS products navigation for cashier", async () => {
    mockUseAuth.mockReturnValue({
      session: {
        user_id: "u2",
        username: "cashier",
        full_name: "Pim Counter",
        role: "CASHIER",
        active_shift_id: null,
      },
      activeShift: null,
      logout: vi.fn(),
      switchRole: vi.fn(),
      mode: "real",
    });

    render(
      <AppShell>
        <div>content</div>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /สินค้า POS/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /attendance ทีม/i })).not.toBeInTheDocument();
  });

  it("shows owner-only attendance navigation for owner", async () => {
    render(
      <AppShell>
        <div>content</div>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /attendance ทีม/i })).toBeInTheDocument();
    });
  });
});
