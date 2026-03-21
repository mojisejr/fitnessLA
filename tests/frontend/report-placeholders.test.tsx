import { fireEvent, screen, waitFor } from "@testing-library/react";
import ShiftSummaryPage from "@/app/(app)/reports/shift-summary/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("report placeholders", () => {
    beforeEach(() => {
        clearMockSession();
    });

    it("renders shift summary with responsible filter and separated payment totals", { timeout: 15000 }, async () => {
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

        await waitFor(() => {
            expect(screen.queryByText("กำลังโหลดสรุปกะ...")).not.toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.getByRole("heading", { name: "สรุปกะ" })).toBeInTheDocument();
        expect(screen.getByText("ยอดขายเงินสด")).toBeInTheDocument();
        expect(screen.getByText("ยอดขายพร้อมเพย์")).toBeInTheDocument();
        expect(screen.getAllByText("ยอดปิดกะเงินสด").length).toBeGreaterThan(0);
        expect(screen.getAllByText("เงินสดเกิน").length).toBeGreaterThan(0);
        expect(screen.getAllByText("เงินสดขาด").length).toBeGreaterThan(0);
        expect(screen.getByRole("option", { name: "Pim Counter" })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("ผู้รับผิดชอบ"), {
            target: { value: "Pim Counter" },
        });

        expect(screen.getAllByText("Pim Counter").length).toBeGreaterThan(0);
        expect(screen.getAllByText("เงินสด").length).toBeGreaterThan(0);
    });
});