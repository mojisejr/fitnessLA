import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PosPage from "@/app/(app)/pos/page";

const mockUseAuth = vi.fn();

const mockAdapter = {
    mode: "real" as const,
    authenticateUser: vi.fn(),
    getActiveShift: vi.fn(),
    listMembers: vi.fn(),
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    getShiftInventorySummary: vi.fn(),
    openShift: vi.fn(),
    closeShift: vi.fn(),
    createOrder: vi.fn(),
    createExpense: vi.fn(),
    getDailySummary: vi.fn(),
    getShiftSummary: vi.fn(),
    listChartOfAccounts: vi.fn(),
    createChartOfAccount: vi.fn(),
    toggleChartOfAccount: vi.fn(),
    createAdminUser: vi.fn(),
    listTrainers: vi.fn(),
    createTrainer: vi.fn(),
    toggleTrainerActive: vi.fn(),
    updateTrainingEnrollment: vi.fn(),
    toggleMemberActive: vi.fn(),
    renewMember: vi.fn(),
    restartMember: vi.fn(),
};

vi.mock("@/features/adapters/adapter-provider", () => ({
    useAppAdapter: () => mockAdapter,
}));

vi.mock("@/features/auth/auth-provider", () => ({
    useAuth: () => mockUseAuth(),
}));

describe("POS checkout refresh warning", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseAuth.mockReturnValue({
            status: "authenticated",
            session: {
                user_id: "user-owner-seed",
                username: "owner",
                full_name: "Owner FitnessLA",
                role: "OWNER",
                active_shift_id: "shift-stale-closed",
            },
            activeShift: {
                shift_id: "shift-open-1",
                opened_at: new Date().toISOString(),
                starting_cash: 500,
                responsible_name: "Owner FitnessLA",
            },
        });

        mockAdapter.listProducts
            .mockResolvedValueOnce([
                {
                    product_id: "prod-1",
                    sku: "SNK-001",
                    name: "Protein Snack",
                    price: 85,
                    product_type: "GOODS",
                    track_stock: false,
                    stock_on_hand: null,
                },
            ])
            .mockRejectedValueOnce(new Error("รีเฟรชรายการสินค้าไม่สำเร็จ"));
        mockAdapter.listTrainers.mockResolvedValue([]);
        mockAdapter.listChartOfAccounts.mockResolvedValue([]);
        mockAdapter.getShiftInventorySummary.mockResolvedValue([]);
        mockAdapter.createOrder.mockResolvedValue({
            order_id: "ord-1",
            order_number: "ORD-2026-0009",
            total_amount: 85,
            tax_doc_number: "INV-2026-0009",
            status: "COMPLETED",
        });
    });

    it("keeps checkout success visible when post-checkout refresh fails", async () => {
        render(<PosPage />);

        await screen.findByRole("button", { name: "เพิ่มลงบิล" });

        fireEvent.click(screen.getByRole("button", { name: "เพิ่มลงบิล" }));
        fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));
        fireEvent.click(await screen.findByRole("button", { name: "ยืนยันการคิดเงิน" }));

        await waitFor(() => {
            expect(mockAdapter.createOrder).toHaveBeenCalledWith({
                shift_id: "shift-open-1",
                items: [{ product_id: "prod-1", quantity: 1 }],
                payment_method: "CASH",
                customer_info: undefined,
            });
        });

        expect(mockAdapter.getShiftInventorySummary).toHaveBeenCalledWith("shift-open-1");

        await waitFor(() => {
            expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
            expect(screen.getByText("บันทึกรายการขายสำเร็จแล้ว แต่รีเฟรชรายการสินค้าไม่สำเร็จ")).toBeInTheDocument();
        });

        expect(screen.queryByText("ไม่สามารถสร้างรายการขายได้")).not.toBeInTheDocument();
    });
});