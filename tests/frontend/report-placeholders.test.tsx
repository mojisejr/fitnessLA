import { screen } from "@testing-library/react";
import ShiftSummaryPage from "@/app/(app)/reports/shift-summary/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("report placeholders", () => {
  beforeEach(() => {
    clearMockSession();
  });

  it("renders shift summary shell for owner or admin", () => {
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

    renderWithProviders(<ShiftSummaryPage />);

    expect(screen.getByRole("heading", { name: "สรุปกะ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ส่งออก CSV" })).toBeInTheDocument();
    expect(screen.getByText("กำลังรอ backend contract")).toBeInTheDocument();
  });
});