import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import DailySummaryPage from "@/app/(app)/reports/daily-summary/page";
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

    it("lets owner edit a sale from daily summary and removes the old sales subtitle", { timeout: 15000 }, async () => {
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

        renderWithProviders(<DailySummaryPage />);

        await waitFor(() => {
            expect(screen.queryByText("กำลังโหลดรายงาน...")).not.toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.queryByText("ขายอะไรไปบ้าง ใครขาย รับเงินแบบไหน")).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole("button", { name: "แก้ไข" })[0]);
        expect(screen.queryByLabelText(/แก้ไขยอดเงิน/)).not.toBeInTheDocument();
        expect(screen.getByText("ยอดรวมจากรายการ")).toBeInTheDocument();
        expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);

        const totalBefore = screen.getByText("ยอดรวมจากรายการ").parentElement?.textContent ?? "";
        fireEvent.click(screen.getAllByRole("button", { name: /เพิ่มสินค้า / })[0]);
        const totalAfter = screen.getByText("ยอดรวมจากรายการ").parentElement?.textContent ?? "";
        expect(totalAfter).not.toBe(totalBefore);
        fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

        await waitFor(() => {
            expect(screen.getByText("อัปเดตรายการขายเรียบร้อยแล้ว")).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.getAllByText(/฿/).length).toBeGreaterThan(0);
    });

    it("lets owner delete a bill from daily summary", { timeout: 15000 }, async () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

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

        renderWithProviders(<DailySummaryPage />);

        await waitFor(() => {
            expect(screen.queryByText("กำลังโหลดรายงาน...")).not.toBeInTheDocument();
        }, { timeout: 10000 });

        const deleteButtons = screen.getAllByRole("button", { name: "ลบ" });
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(screen.getByText(/ลบบิล .* เรียบร้อยแล้ว/)).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it("lets owner bulk delete bills from daily summary", { timeout: 15000 }, async () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

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

        renderWithProviders(<DailySummaryPage />);

        await waitFor(() => {
            expect(screen.queryByText("กำลังโหลดรายงาน...")).not.toBeInTheDocument();
        }, { timeout: 10000 });

        fireEvent.click(screen.getByLabelText(/เลือกบิล POS-20260321-001/i));
        fireEvent.click(screen.getByLabelText(/เลือกบิล POS-20260321-002/i));
        fireEvent.click(screen.getByRole("button", { name: "ลบที่เลือก" }));

        await waitFor(() => {
            expect(screen.getByText("ลบบิล 2 รายการเรียบร้อยแล้ว")).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it("lets owner edit a sale from shift summary", { timeout: 15000 }, async () => {
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

        fireEvent.click(screen.getAllByRole("button", { name: "แก้ไข" })[0]);
        expect(screen.queryByLabelText(/แก้ไขยอดเงิน/)).not.toBeInTheDocument();
        expect(screen.getByText("ยอดรวมจากรายการ")).toBeInTheDocument();
        expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);

        const totalBefore = screen.getByText("ยอดรวมจากรายการ").parentElement?.textContent ?? "";
        fireEvent.click(screen.getAllByRole("button", { name: /ลดสินค้า / })[0]);
        const totalAfter = screen.getByText("ยอดรวมจากรายการ").parentElement?.textContent ?? "";
        expect(totalAfter).not.toBe(totalBefore);
        fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

        await waitFor(() => {
            expect(screen.getByText("อัปเดตรายการขายเรียบร้อยแล้ว")).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.getAllByText(/฿/).length).toBeGreaterThan(0);
    });
});