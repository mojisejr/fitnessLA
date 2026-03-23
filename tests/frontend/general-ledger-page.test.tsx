import { screen } from "@testing-library/react";
import GeneralLedgerPage from "@/app/(app)/reports/general-ledger/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("general ledger page", () => {
  beforeEach(() => {
    clearMockSession();
    seedMockSession({
      session: {
        user_id: 1,
        username: "owner",
        full_name: "Lalin Charoen",
        role: "OWNER",
        active_shift_id: null,
      },
      activeShift: null,
      lastClosedShift: null,
    });
  });

  it("shows temporary disabled state while general ledger flag is off", () => {
    renderWithProviders(<GeneralLedgerPage />);

    expect(screen.getByText("Report disabled")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "General Ledger" })).toBeInTheDocument();
    expect(screen.getByText("หน้ารายงานนี้ถูกปิดใช้งานชั่วคราว และซ่อนออกจากเมนูหลักก่อนจนกว่าจะเปิดกลับมาอีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ดาวน์โหลด CSV" })).not.toBeInTheDocument();
  });
});