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
    expect(screen.getByRole("button", { name: "PROMPTPAY" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByText(/ตะกร้ายังว่างอยู่/)).toBeInTheDocument();
    });
  });
});