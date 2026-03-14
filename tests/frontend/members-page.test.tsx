import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import MembersPage from "@/app/(app)/members/page";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 15000 });
}

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
    const posView = renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.click(screen.getByRole("button", { name: "สมาชิก 3 เดือน" }));

    const selectedProductPanel = screen.getByRole("heading", { name: "สมาชิก 3 เดือน", level: 2 }).closest("section");

    expect(selectedProductPanel).not.toBeNull();

    fireEvent.click(within(selectedProductPanel as HTMLElement).getByRole("button", { name: "เพิ่มลงบิล" }));
    fireEvent.change(screen.getByPlaceholderText("ชื่อลูกค้าสมาชิก"), {
      target: { value: "Somchai Member" },
    });
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการคิดเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    }, { timeout: 15000 });

    posView.unmount();
    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText("Somchai Member")).toBeInTheDocument();
    }, { timeout: 15000 });

    expect(screen.getAllByText("3-Month Membership").length).toBeGreaterThan(0);
  }, 20000);
});