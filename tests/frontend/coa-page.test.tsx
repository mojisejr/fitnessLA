import { fireEvent, screen, waitFor } from "@testing-library/react";
import ChartOfAccountsPage from "@/app/(app)/coa/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("chart of accounts page", () => {
  beforeEach(() => {
    clearMockSession();
  });

  it("blocks non-owner roles", () => {
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

    await screen.findByRole("heading", { name: "ผังบัญชี" });

    fireEvent.change(screen.getByPlaceholderText("รหัสบัญชี"), {
      target: { value: "6101" },
    });
    fireEvent.change(screen.getByPlaceholderText("ชื่อบัญชี"), {
      target: { value: "Marketing Expense" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างบัญชีใหม่" }));

    await waitFor(() => {
      expect(screen.getByText("สร้างบัญชี 6101 สำเร็จแล้ว")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Marketing Expense" })).toBeInTheDocument();
  });

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

    await screen.findByRole("heading", { name: "ผังบัญชี" });

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
    });
  });
});