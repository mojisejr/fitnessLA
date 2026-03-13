import { fireEvent, screen, waitFor } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 10000 });
}

describe("POS keyboard shortcuts", () => {
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

  it("supports shortcut-driven product add, payment selection, and cart clear", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.keyDown(window, { key: "F2" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ลบ" })).toBeInTheDocument();
    }, { timeout: 10000 });

    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(screen.getByRole("button", { name: "พร้อมเพย์" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByText(/ตะกร้ายังว่างอยู่/)).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 10000);

  it("blocks increasing quantity beyond stock", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    const shakeCard = screen.getByRole("button", { name: "Add Protein Shake" });

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(shakeCard);
    }

    fireEvent.click(shakeCard);

    expect(screen.getByText("สต็อก Protein Shake คงเหลือ 6 ชิ้น")).toBeInTheDocument();
  }, 10000);
});