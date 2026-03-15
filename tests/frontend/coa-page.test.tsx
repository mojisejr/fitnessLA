import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import ChartOfAccountsPage from "@/app/(app)/coa/page";
import { mockAppAdapter } from "@/features/adapters/mock-app-adapter";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForChartOfAccountsReady() {
  await screen.findByRole("heading", { name: "ผังบัญชี" }, { timeout: 15000 });
  await screen.findByRole("button", { name: "PromptPay Clearing" }, { timeout: 15000 });
}

describe("chart of accounts page", () => {
  beforeEach(() => {
    clearMockSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks cashier role", () => {
    seedMockSession({
      session: {
        user_id: 3,
        username: "cashier",
        full_name: "Pim Counter",
        role: "CASHIER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<ChartOfAccountsPage />);

    expect(screen.getByText("บทบาทของคุณยังเข้าใช้งานหน้านี้ไม่ได้")).toBeInTheDocument();
  });

  it("creates an account for owner", async () => {
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

    renderWithProviders(<ChartOfAccountsPage />);

    await waitForChartOfAccountsReady();

    fireEvent.change(screen.getByPlaceholderText("รหัสบัญชี"), {
      target: { value: "6101" },
    });
    fireEvent.change(screen.getByPlaceholderText("ชื่อบัญชี"), {
      target: { value: "Marketing Expense" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างบัญชีใหม่" }));

    await waitFor(() => {
      expect(screen.getByText("สร้างบัญชี 6101 สำเร็จแล้ว")).toBeInTheDocument();
    }, { timeout: 15000 });
    expect(screen.getByRole("button", { name: "Marketing Expense" })).toBeInTheDocument();
  }, 20000);

  it("shows validation and empty state around filters", async () => {
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

    renderWithProviders(<ChartOfAccountsPage />);

    await waitForChartOfAccountsReady();

    fireEvent.change(screen.getByPlaceholderText("รหัสบัญชี"), {
      target: { value: "61" },
    });
    fireEvent.change(screen.getByPlaceholderText("ชื่อบัญชี"), {
      target: { value: "ค่าโฆษณา" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างบัญชีใหม่" }));

    expect(screen.getByText("รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("ค้นหาจากรหัสบัญชี, ชื่อบัญชี หรือคำอธิบาย"), {
      target: { value: "zzz-not-found" },
    });

    await waitFor(() => {
      expect(screen.getByText("ไม่พบบัญชีที่ตรงกับเงื่อนไขที่เลือก ลองเปลี่ยนคำค้นหรือ filter ใหม่")).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it("shows locked error when toggle is rejected by backend", async () => {
    const toggleSpy = vi.spyOn(mockAppAdapter, "toggleChartOfAccount").mockRejectedValueOnce({
      code: "ACCOUNT_LOCKED",
      message: "บัญชีนี้ไม่สามารถปรับสถานะได้",
    });

    seedMockSession({
      session: {
        user_id: 2,
        username: "admin",
        full_name: "Niran Ops Lead",
        role: "ADMIN",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<ChartOfAccountsPage />);

    await waitForChartOfAccountsReady();
    const nameButton = screen.getByRole("button", { name: "PromptPay Clearing" });
    const row = nameButton.closest("tr");
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLTableRowElement).getByRole("button", { name: "ปิดใช้งาน" }));

    await waitFor(() => {
      expect(screen.getByText(/บัญชีนี้.*ไม่สามารถปรับสถานะได้/)).toBeInTheDocument();
    }, { timeout: 20000 });

    await waitFor(() => {
      expect(toggleSpy).toHaveBeenCalled();
      expect(within(row as HTMLTableRowElement).getByRole("button", { name: "ปิดใช้งาน" })).toBeEnabled();
    }, { timeout: 20000 });
  }, 30000);
});