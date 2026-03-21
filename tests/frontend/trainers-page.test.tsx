import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TrainersPage from "@/app/(app)/trainers/page";

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

describe("Trainers page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            session: { role: "OWNER" },
            status: "authenticated",
        });

        mockAdapter.listTrainers.mockResolvedValue([
            {
                trainer_id: "t1",
                trainer_code: "TR001",
                full_name: "สมชาย ยิมเนส",
                nickname: "ชาย",
                phone: "0811111111",
                is_active: true,
                active_customer_count: 1,
                assignments: [
                    {
                        enrollment_id: "e1",
                        trainer_id: "t1",
                        trainer_name: "สมชาย ยิมเนส",
                        customer_name: "Training Sample Member",
                        member_id: "m1",
                        package_name: "เทรน 10 ครั้ง",
                        package_sku: "PT-10",
                        started_at: "2026-03-21T00:00:00.000Z",
                        expires_at: "2026-04-20T00:00:00.000Z",
                        session_limit: 10,
                        sessions_remaining: 8,
                        price: 4500,
                        status: "ACTIVE",
                        closed_at: null,
                        close_reason: null,
                        updated_at: "2026-03-21T02:00:00.000Z",
                    },
                    {
                        enrollment_id: "e2",
                        trainer_id: "t1",
                        trainer_name: "สมชาย ยิมเนส",
                        customer_name: "Former Client",
                        member_id: "m2",
                        package_name: "เทรนเดี่ยว 1 ครั้ง",
                        package_sku: "PT-01",
                        started_at: "2026-02-10T00:00:00.000Z",
                        expires_at: "2026-02-10T00:00:00.000Z",
                        session_limit: 1,
                        sessions_remaining: 0,
                        price: 500,
                        status: "CLOSED",
                        closed_at: "2026-02-11T00:00:00.000Z",
                        close_reason: "จบคอร์ส",
                        updated_at: "2026-02-11T00:00:00.000Z",
                    },
                ],
            },
        ]);
        mockAdapter.createTrainer.mockResolvedValue({
            trainer_id: "t2",
            trainer_code: "TR002",
            full_name: "Trainer New",
            nickname: null,
            phone: null,
            is_active: true,
            active_customer_count: 0,
        });
        mockAdapter.toggleTrainerActive.mockResolvedValue({
            trainer_id: "t1",
            trainer_code: "TR001",
            full_name: "สมชาย ยิมเนส",
            nickname: "ชาย",
            phone: "0811111111",
            is_active: false,
            active_customer_count: 0,
        });
        mockAdapter.updateTrainingEnrollment.mockResolvedValue({});
    });

    it("creates trainer and updates training enrollment", async () => {
        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText("ชื่อเทรนเนอร์"), {
            target: { value: "Trainer New" },
        });
        fireEvent.click(screen.getByRole("button", { name: "เพิ่มเทรนเนอร์" }));

        await waitFor(() => {
            expect(mockAdapter.createTrainer).toHaveBeenCalledWith({
                full_name: "Trainer New",
                nickname: undefined,
                phone: undefined,
            });
        });

        fireEvent.click(screen.getByRole("button", { name: "จัดการลูกเทรน (2)" }));

        const remainingInputs = await screen.findAllByPlaceholderText(/10|1|ไม่จำกัด/);
        const statusSelects = screen.getAllByRole("combobox");
        fireEvent.change(remainingInputs[0], { target: { value: "6" } });
        fireEvent.change(statusSelects[0], { target: { value: "EXPIRED" } });
        fireEvent.click(screen.getAllByRole("button", { name: "บันทึก" })[0]);

        await waitFor(() => {
            expect(mockAdapter.updateTrainingEnrollment).toHaveBeenCalledWith("e1", {
                sessions_remaining: 6,
                status: "EXPIRED",
                close_reason: null,
            });
        });

        expect(screen.getByText("ประวัติลูกเทรน")).toBeInTheDocument();
    });

    it("lets owner toggle trainer active state", async () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "ปิดใช้งาน" }));

        await waitFor(() => {
            expect(mockAdapter.toggleTrainerActive).toHaveBeenCalledWith("t1");
        });

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it("shows trainers in read-only mode for admin", async () => {
        mockUseAuth.mockReturnValue({
            session: { role: "ADMIN" },
            status: "authenticated",
        });

        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        expect(screen.getByText("บัญชีนี้ดูข้อมูลเทรนเนอร์ได้อย่างเดียว การเพิ่มเทรนเนอร์และแก้ไขลูกเทรนสงวนสิทธิ์ไว้สำหรับ owner เท่านั้น")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "เพิ่มเทรนเนอร์" })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "จัดการลูกเทรน (2)" }));

        await waitFor(() => {
            expect(screen.getAllByText("ดูอย่างเดียว").length).toBeGreaterThan(0);
        });

        expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
    });
});