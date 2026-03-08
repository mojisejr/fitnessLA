import { fireEvent, screen, waitFor } from "@testing-library/react";
import CloseShiftPage from "@/app/(app)/shift/close/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

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

    expect(screen.getByText("ยอดคาดหวังยังถูกซ่อนไว้ตามตั้งใจ")).toBeInTheDocument();
    expect(screen.queryByText("ยอดคาดหวัง")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("เงินสดที่นับได้จริง"), {
      target: { value: "2100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งผล blind drop" }));

    await waitFor(() => {
      expect(screen.getByText("ยอดคาดหวัง")).toBeInTheDocument();
    });
  });
});