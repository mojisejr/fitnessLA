import { screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import ProfitLossPage from "@/app/(app)/reports/profit-loss/page";
import { mockAppAdapter } from "@/features/adapters/mock-app-adapter";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("profit loss page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearMockSession();
  });

  it("loads profit and loss metrics from the summary adapter", async () => {
    vi.spyOn(mockAppAdapter, "getDailySummary").mockResolvedValueOnce({
      report_period: "CUSTOM",
      range_start: "2026-03-01",
      range_end: "2026-03-31",
      total_sales: 5000,
      sales_by_method: {
        CASH: 2000,
        PROMPTPAY: 1500,
        CREDIT_CARD: 1500,
      },
      sales_by_category: [],
      total_expenses: 1200,
      net_cash_flow: 3800,
      shift_discrepancies: 0,
      sales_rows: [],
      shift_rows: [],
    });

    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<ProfitLossPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "กำไรขาดทุน" })).toBeInTheDocument();
      expect(screen.getByText("฿5,000.00")).toBeInTheDocument();
      expect(screen.getByText("฿1,200.00")).toBeInTheDocument();
    });

    const operatingCard = screen.getByText("ผลการดำเนินงาน").closest("article");
    expect(operatingCard).not.toBeNull();
    expect(within(operatingCard as HTMLElement).getByText("฿3,800.00")).toBeInTheDocument();
  });
});