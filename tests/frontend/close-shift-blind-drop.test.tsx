import { fireEvent, screen, waitFor } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import CloseShiftPage from "@/app/(app)/shift/close/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 10000 });
}

async function waitForCloseShiftReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสรุปสินค้าในกะ...")).not.toBeInTheDocument();
  }, { timeout: 10000 });
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
    fireEvent.click(screen.getByRole("button", { name: "ส่งผล blind drop" }));

    await waitFor(() => {
      expect(screen.getByText("ยอดคาดหวัง")).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 10000);

  it("shows shift inventory summary on the close shift page", async () => {
    const posView = renderWithProviders(<PosPage />);

    await waitForPosReady();
    expect(screen.getByRole("button", { name: "Add Mineral Water" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Mineral Water" }));
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    }, { timeout: 10000 });

    posView.unmount();

    renderWithProviders(<CloseShiftPage />);

    await waitForCloseShiftReady();

    await waitFor(() => {
      expect(screen.getByText("Mineral Water")).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByText("summary สินค้าในกะนี้")).toBeInTheDocument();
    expect(screen.getByText("ขายรวมทั้งกะ")).toBeInTheDocument();
  }, 10000);
});