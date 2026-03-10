import { fireEvent, screen, waitFor } from "@testing-library/react";
import MembersPage from "@/app/(app)/members/page";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("Members page", () => {
  beforeEach(() => {
    clearMockSession();
    seedMockSession({
      session: {
        user_id: 2,
        username: "admin",
        full_name: "Niran Ops Lead",
        role: "ADMIN",
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

  it("shows a newly purchased membership immediately after POS checkout", async () => {
    renderWithProviders(<PosPage />);

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add 3-Month Membership" }));
    fireEvent.change(screen.getByPlaceholderText("ชื่อลูกค้าสมาชิก"), {
      target: { value: "Somchai Member" },
    });
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    });

    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("Somchai Member")).toBeInTheDocument();
    });

    expect(screen.getAllByText("3-Month Membership").length).toBeGreaterThan(0);
  });
});