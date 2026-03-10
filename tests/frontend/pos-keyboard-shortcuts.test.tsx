import { fireEvent, screen, waitFor } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

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

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "F2" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ลบ" })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(screen.getByRole("button", { name: "PromptPay" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByText(/ตะกร้ายังว่างอยู่/)).toBeInTheDocument();
    });
  });

  it("blocks increasing quantity beyond stock", async () => {
    renderWithProviders(<PosPage />);

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    });

    const shakeCard = screen.getByRole("button", { name: "Add Protein Shake" });

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(shakeCard);
    }

    fireEvent.click(shakeCard);

    expect(screen.getByText("สต็อก Protein Shake คงเหลือ 6 ชิ้น")).toBeInTheDocument();
  });
});