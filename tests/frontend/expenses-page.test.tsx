import { fireEvent, screen, waitFor } from "@testing-library/react";
import ExpensesPage from "@/app/(app)/expenses/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("expenses page", () => {
  beforeEach(() => {
    clearMockSession();
  });

  it("allows saving an expense when an active shift and expense account are available", async () => {
    seedMockSession({
      session: {
        user_id: 1,
        username: "cashier",
        full_name: "Pim Counter",
        role: "CASHIER",
        active_shift_id: "shift-701",
      },
      activeShift: {
        shift_id: "shift-701",
        opened_at: "2026-03-14T08:00:00.000Z",
        starting_cash: 500,
        responsible_name: "Pim Counter",
      },
      lastClosedShift: null,
    });

    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "รายจ่าย" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("รายละเอียด"), {
      target: { value: "ซื้อน้ำดื่มหน้าร้าน" },
    });

    const receipt = new File(["receipt-image"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("รูปใบเสร็จ"), {
      target: { files: [receipt] },
    });

    fireEvent.click(screen.getByRole("button", { name: "บันทึกรายจ่าย" }));

    await waitFor(() => {
      expect(screen.getByText(/บันทึกรายจ่าย #/)).toBeInTheDocument();
    });
  });
});