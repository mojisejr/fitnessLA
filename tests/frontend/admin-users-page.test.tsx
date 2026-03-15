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

  it("creates a user directly through the current backend-aligned flow", async () => {
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
    fireEvent.change(screen.getByPlaceholderText("อีเมล"), {
      target: { value: "june.desk@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างผู้ใช้" }));

    await waitFor(() => {
      expect(screen.getByText("สร้างผู้ใช้ june.desk เรียบร้อยแล้ว")).toBeInTheDocument();
    });

    expect(screen.getByText("june.desk@example.com")).toBeInTheDocument();
  });

  it("shows validation and empty state for direct create mode", async () => {
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
    fireEvent.change(screen.getByPlaceholderText("อีเมล"), {
      target: { value: "june.desk@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างผู้ใช้" }));

    expect(screen.getByText("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง, ขีดกลาง")).toBeInTheDocument();

    expect(screen.getByText(/ยังไม่มีผู้ใช้ที่สร้างในรอบนี้/)).toBeInTheDocument();
  });
});