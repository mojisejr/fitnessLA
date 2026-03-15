import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import GeneralLedgerPage from "@/app/(app)/reports/general-ledger/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("general ledger page", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

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

    global.fetch = vi.fn().mockResolvedValue(
      new Response("Date,Account Code\n2026-03-01,4010", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
        },
      }),
    ) as typeof fetch;

    URL.createObjectURL = vi.fn(() => "blob:general-ledger") as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("downloads CSV with start_date and end_date query params", async () => {
    renderWithProviders(<GeneralLedgerPage />);

    fireEvent.change(screen.getByLabelText("วันเริ่มต้น"), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getByLabelText("วันสิ้นสุด"), {
      target: { value: "2026-03-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ดาวน์โหลด CSV" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/reports/gl?start_date=2026-03-01&end_date=2026-03-31",
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        }),
      );
    });

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(screen.getByText("ระบบเริ่มดาวน์โหลดไฟล์ general-ledger-2026-03-01-to-2026-03-31.csv แล้ว")).toBeInTheDocument();
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:general-ledger");
  });
});