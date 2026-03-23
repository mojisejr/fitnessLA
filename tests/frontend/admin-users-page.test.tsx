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

  it("allows only owner to create a login-ready user", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Owner FitnessLA",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<AdminUsersPage />);

    await screen.findByRole("heading", { name: "จัดการผู้ใช้และเวลาเข้างาน" });

    fireEvent.change(screen.getByPlaceholderText("ชื่อ"), {
      target: { value: "June Desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("เบอร์โทร"), {
      target: { value: "0812345678" },
    });
    fireEvent.change(screen.getByPlaceholderText("username"), {
      target: { value: "june.desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("password"), {
      target: { value: "deskpass123" },
    });
    fireEvent.change(screen.getByLabelText("บทบาท"), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างผู้ใช้" }));

    await waitFor(() => {
      expect(screen.getByText("สร้าง user june.desk เรียบร้อยแล้ว สามารถนำ username/password นี้ไป login และลงชื่อเข้างานได้ทันที")).toBeInTheDocument();
    });

    expect(screen.getByText("@june.desk")).toBeInTheDocument();
  });

  it("blocks admin role from this owner-only page", () => {
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

    expect(screen.getByText("บทบาทของคุณยังเข้าใช้งานหน้านี้ไม่ได้")).toBeInTheDocument();
  });

  it("shows validation and empty state for direct create mode", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Owner FitnessLA",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<AdminUsersPage />);

    await screen.findByRole("heading", { name: "จัดการผู้ใช้และเวลาเข้างาน" });

    fireEvent.change(screen.getByPlaceholderText("ชื่อ"), {
      target: { value: "June Desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("เบอร์โทร"), {
      target: { value: "0812345678" },
    });
    fireEvent.change(screen.getByPlaceholderText("username"), {
      target: { value: "@" },
    });
    fireEvent.change(screen.getByPlaceholderText("password"), {
      target: { value: "deskpass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างผู้ใช้" }));

    expect(screen.getByText("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง, ขีดกลาง")).toBeInTheDocument();

    expect(screen.getByText("ยังไม่มี user ที่ owner จัดการในฐานข้อมูลจริง")).toBeInTheDocument();
  });

  it("removes selected mock users from the page", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Owner FitnessLA",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });

    renderWithProviders(<AdminUsersPage />);

    await screen.findByRole("heading", { name: "จัดการผู้ใช้และเวลาเข้างาน" });

    fireEvent.change(screen.getByPlaceholderText("ชื่อ"), {
      target: { value: "June Desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("เบอร์โทร"), {
      target: { value: "0812345678" },
    });
    fireEvent.change(screen.getByPlaceholderText("username"), {
      target: { value: "june.desk" },
    });
    fireEvent.change(screen.getByPlaceholderText("password"), {
      target: { value: "deskpass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างผู้ใช้" }));

    await screen.findByText("@june.desk");

    fireEvent.click(screen.getByLabelText("เลือก June Desk"));
    fireEvent.click(screen.getByRole("button", { name: /ลบที่เลือก/i }));

    await waitFor(() => {
      expect(screen.queryByText("@june.desk")).not.toBeInTheDocument();
    });
  });
});