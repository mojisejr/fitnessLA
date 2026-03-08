import { fireEvent, screen, waitFor } from "@testing-library/react";
import AdminUsersPage from "@/app/(app)/admin/users/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("admin users page", () => {
  beforeEach(() => {
    clearMockSession();
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

    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText("บทบาทของคุณยังเข้าใช้งานหน้านี้ไม่ได้")).toBeInTheDocument();
  });

  it("creates and approves an onboarding request", async () => {
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

    renderWithProviders(<AdminUsersPage />);

    await screen.findByRole("heading", { name: "จัดการผู้ใช้" });

    fireEvent.change(screen.getByPlaceholderText("ชื่อพนักงาน"), {
      target: { value: "June Desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("ชื่อผู้ใช้"), {
      target: { value: "june.desk" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างคำขอ" }));

    await waitFor(() => {
      expect(screen.getByText("สร้างคำขอผู้ใช้ june.desk เรียบร้อยแล้ว")).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole("button", { name: "อนุมัติคำขอ" });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/อนุมัติ .* แล้ว/)).toBeInTheDocument();
    });
  });

  it("shows validation and empty state for filters", async () => {
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

    renderWithProviders(<AdminUsersPage />);

    await screen.findByRole("heading", { name: "จัดการผู้ใช้" });

    fireEvent.change(screen.getByPlaceholderText("ชื่อพนักงาน"), {
      target: { value: "June Desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("ชื่อผู้ใช้"), {
      target: { value: "@" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างคำขอ" }));

    expect(screen.getByText("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง, ขีดกลาง")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("ค้นหาจากชื่อผู้ใช้, ชื่อพนักงาน หรือสาขา"), {
      target: { value: "nobody-here" },
    });

    await waitFor(() => {
      expect(screen.getByText("ไม่พบคำขอที่ตรงกับตัวกรองปัจจุบัน ลองเปลี่ยนคำค้นหรือสถานะใหม่")).toBeInTheDocument();
    });
  });
});