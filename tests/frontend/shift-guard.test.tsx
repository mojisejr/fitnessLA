import { screen } from "@testing-library/react";
import { ShiftGuard } from "@/components/guards/shift-guard";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("ShiftGuard", () => {
    beforeEach(() => {
        clearMockSession();
    });

    it("blocks access when there is no active shift", () => {
        seedMockSession({
            session: {
                user_id: 3,
                username: "cashier",
                full_name: "Pim Counter",
                role: "CASHIER",
                active_shift_id: null,
            },
            activeShift: null,
            lastClosedShift: null,
        });

        renderWithProviders(
            <ShiftGuard>
                <div>Protected content</div>
            </ShiftGuard>,
        );

        expect(screen.getByText("หน้านี้จะใช้งานได้เมื่อมีกะที่เปิดอยู่")).toBeInTheDocument();
        expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    });

    it("renders children when an active shift exists", () => {
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

        renderWithProviders(
            <ShiftGuard>
                <div>Protected content</div>
            </ShiftGuard>,
        );

        expect(screen.getByText("Protected content")).toBeInTheDocument();
    });

    it("renders children when activeShift exists even if the session shift id is stale", () => {
        seedMockSession({
            session: {
                user_id: 3,
                username: "cashier",
                full_name: "Pim Counter",
                role: "CASHIER",
                active_shift_id: null,
            },
            activeShift: {
                shift_id: 702,
                opened_at: new Date().toISOString(),
                starting_cash: 500,
            },
            lastClosedShift: null,
        });

        renderWithProviders(
            <ShiftGuard>
                <div>Protected content</div>
            </ShiftGuard>,
        );

        expect(screen.getByText("Protected content")).toBeInTheDocument();
    });
});