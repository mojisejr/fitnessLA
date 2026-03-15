import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import CloseShiftPage from "@/app/(app)/shift/close/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 20000 });
}

async function waitForCloseShiftReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดรายการขายของกะ...")).not.toBeInTheDocument();
  }, { timeout: 20000 });
}

describe("close shift blind drop", () => {
  beforeEach(() => {
    clearMockSession();
    seedMockSession({
      session: {
        user_id: 3,
        username: "cashier",
        full_name: "Pim Counter",
        role: "CASHIER",
        active_shift_id: 701,
      },
      activeShift: {
        shift_id: 701,
        opened_at: new Date().toISOString(),
        starting_cash: 500,
      },
      lastClosedShift: null,
    });
  });

  it("keeps expected cash hidden until submit completes", async () => {
    renderWithProviders(<CloseShiftPage />);

    await waitForCloseShiftReady();

    expect(screen.getByText("ยอดคาดหวังยังถูกซ่อนไว้ตามตั้งใจ")).toBeInTheDocument();
    expect(screen.queryByText("ยอดคาดหวัง")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("เงินสดที่นับได้จริง"), {
      target: { value: "2100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งผลการนับเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("ยอดคาดหวัง")).toBeInTheDocument();
    }, { timeout: 20000 });
  }, 30000);

  it("shows shift inventory summary on the close shift page", async () => {
    const posView = renderWithProviders(<PosPage />);

    await waitForPosReady();
    fireEvent.click(screen.getByRole("button", { name: "น้ำดื่ม" }));

    const selectedProductPanel = screen.getByRole("heading", { name: "น้ำดื่ม", level: 2 }).closest("section");

    expect(selectedProductPanel).not.toBeNull();

    fireEvent.click(within(selectedProductPanel as HTMLElement).getByRole("button", { name: "เพิ่มลงบิล" }));
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));
    const confirmCheckoutButton = screen.queryByRole("button", { name: "ยืนยันการคิดเงิน" });
    if (confirmCheckoutButton) {
      fireEvent.click(confirmCheckoutButton);
    }

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    }, { timeout: 20000 });

    posView.unmount();

    renderWithProviders(<CloseShiftPage />);

    await waitForCloseShiftReady();

    await waitFor(() => {
      expect(screen.getByText("Mineral Water x1")).toBeInTheDocument();
    }, { timeout: 20000 });

    expect(screen.getByText("รายการขายในกะนี้")).toBeInTheDocument();
    expect(screen.getByText("ยอดขายรวมทั้งกะ")).toBeInTheDocument();
    expect(screen.getByText("เงินสด")).toBeInTheDocument();
  }, 30000);
});