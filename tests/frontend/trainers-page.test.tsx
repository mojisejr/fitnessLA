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
    listRegisteredTrainerUsers: vi.fn(),
    listTrainers: vi.fn(),
    createTrainer: vi.fn(),
    deleteTrainer: vi.fn(),
    toggleTrainerActive: vi.fn(),
    deleteTrainingEnrollment: vi.fn(),
    deleteTrainingEnrollments: vi.fn(),
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
                        schedule_entries: [],
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
                        schedule_entries: [],
                        closed_at: "2026-02-11T00:00:00.000Z",
                        close_reason: "จบคอร์ส",
                        updated_at: "2026-02-11T00:00:00.000Z",
                    },
                ],
            },
        ]);
        mockAdapter.listRegisteredTrainerUsers.mockResolvedValue([
            {
                user_id: "trainer-user-1",
                username: "trainer.new",
                full_name: "Trainer New",
                phone: "0800000000",
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
        mockAdapter.deleteTrainer.mockResolvedValue({
            trainer_id: "t1",
            full_name: "สมชาย ยิมเนส",
        });
        mockAdapter.deleteTrainingEnrollment.mockResolvedValue({
            enrollment_id: "e1",
            customer_name: "Training Sample Member",
            package_name: "เทรน 10 ครั้ง",
        });
        mockAdapter.deleteTrainingEnrollments.mockResolvedValue({
            deleted_count: 2,
            deleted_enrollments: [
                {
                    enrollment_id: "e1",
                    customer_name: "Training Sample Member",
                    package_name: "เทรน 10 ครั้ง",
                },
                {
                    enrollment_id: "e3",
                    customer_name: "Bulk Delete Member",
                    package_name: "เทรน 20 ครั้ง",
                },
            ],
        });
    });

    it("creates trainer and updates training enrollment", async () => {
        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "trainer-user-1" },
        });
        fireEvent.click(screen.getByRole("button", { name: "เพิ่มเทรนเนอร์" }));

        await waitFor(() => {
            expect(mockAdapter.createTrainer).toHaveBeenCalledWith({
                user_id: "trainer-user-1",
                full_name: "",
            });
        });

        fireEvent.click(screen.getByRole("button", { name: "จัดการลูกเทรน (2)" }));

        const remainingInputs = await screen.findAllByPlaceholderText(/10|1|ไม่จำกัด/);
        const statusSelects = screen.getAllByRole("combobox");
        fireEvent.change(remainingInputs[0], { target: { value: "6" } });
        fireEvent.change(statusSelects[1], { target: { value: "EXPIRED" } });
        fireEvent.click(screen.getAllByRole("button", { name: "บันทึก" })[0]);

        await waitFor(() => {
            expect(mockAdapter.updateTrainingEnrollment).toHaveBeenCalledWith("e1", {
                sessions_remaining: 6,
                status: "EXPIRED",
                close_reason: null,
                schedule_entries: [],
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

    it("lets owner delete trainer", async () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "ลบเทรนเนอร์" }));

        await waitFor(() => {
            expect(mockAdapter.deleteTrainer).toHaveBeenCalledWith("t1");
            expect(screen.getByText("ลบเทรนเนอร์ สมชาย ยิมเนส เรียบร้อยแล้ว")).toBeInTheDocument();
        });

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it("lets owner delete a current trainee", async () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

        mockAdapter.listTrainers.mockResolvedValue([
            {
                trainer_id: "t1",
                trainer_code: "TR001",
                full_name: "สมชาย ยิมเนส",
                nickname: "ชาย",
                phone: "0811111111",
                is_active: true,
                active_customer_count: 2,
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
                        schedule_entries: [],
                        closed_at: null,
                        close_reason: null,
                        updated_at: "2026-03-21T02:00:00.000Z",
                    },
                ],
            },
        ]);

        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "จัดการลูกเทรน (1)" }));
        fireEvent.click(await screen.findByRole("button", { name: "ลบ" }));

        await waitFor(() => {
            expect(mockAdapter.deleteTrainingEnrollment).toHaveBeenCalledWith("e1");
            expect(screen.getByText("ลบลูกเทรน Training Sample Member เรียบร้อยแล้ว")).toBeInTheDocument();
        });

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it("lets owner bulk delete current trainees", async () => {
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

        mockAdapter.listTrainers.mockResolvedValue([
            {
                trainer_id: "t1",
                trainer_code: "TR001",
                full_name: "สมชาย ยิมเนส",
                nickname: "ชาย",
                phone: "0811111111",
                is_active: true,
                active_customer_count: 2,
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
                        schedule_entries: [],
                        closed_at: null,
                        close_reason: null,
                        updated_at: "2026-03-21T02:00:00.000Z",
                    },
                    {
                        enrollment_id: "e3",
                        trainer_id: "t1",
                        trainer_name: "สมชาย ยิมเนส",
                        customer_name: "Bulk Delete Member",
                        member_id: "m3",
                        package_name: "เทรน 20 ครั้ง",
                        package_sku: "PT-20",
                        started_at: "2026-03-21T00:00:00.000Z",
                        expires_at: "2026-05-20T00:00:00.000Z",
                        session_limit: 20,
                        sessions_remaining: 19,
                        price: 6500,
                        status: "ACTIVE",
                        schedule_entries: [],
                        closed_at: null,
                        close_reason: null,
                        updated_at: "2026-03-21T03:00:00.000Z",
                    },
                ],
            },
        ]);

        render(<TrainersPage />);

        await waitFor(() => {
            expect(screen.getByText("สมชาย ยิมเนส")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "จัดการลูกเทรน (2)" }));
        fireEvent.click(await screen.findByLabelText("เลือก Training Sample Member"));
        fireEvent.click(screen.getByLabelText("เลือก Bulk Delete Member"));
        fireEvent.click(screen.getByRole("button", { name: "ลบที่เลือก" }));

        await waitFor(() => {
            expect(mockAdapter.deleteTrainingEnrollments).toHaveBeenCalledWith(["e1", "e3"]);
            expect(screen.getByText("ลบลูกเทรน 2 รายการเรียบร้อยแล้ว")).toBeInTheDocument();
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