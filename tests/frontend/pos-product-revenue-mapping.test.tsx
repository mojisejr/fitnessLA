import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import PosProductsPage from "@/app/(app)/pos/products/page";
import { mockAppAdapter } from "@/features/adapters/mock-app-adapter";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
    await waitFor(() => {
        expect(screen.queryByText("กำลังโหลดรายการสินค้า...")).not.toBeInTheDocument();
        expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
    }, { timeout: 20000 });
}

describe("POS product revenue mapping", () => {
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

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("sends revenueAccountId when creating a product", async () => {
        const createProductSpy = vi.spyOn(mockAppAdapter, "createProduct");

        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        fireEvent.click(screen.getAllByRole("button", { name: "เพิ่มสินค้าใหม่" })[0]);
        fireEvent.change(screen.getByLabelText("SKU"), {
            target: { value: "SMOOTHIE-01" },
        });
        fireEvent.change(screen.getByLabelText("ชื่อสินค้า"), {
            target: { value: "Berry Smoothie" },
        });
        fireEvent.change(screen.getByLabelText("คำโปรยสินค้า"), {
            target: { value: "สมูทตี้ผลไม้ขายดี" },
        });
        fireEvent.change(screen.getByLabelText("ราคา"), {
            target: { value: "120" },
        });
        fireEvent.change(screen.getByLabelText("หมวดขาย POS"), {
            target: { value: "COFFEE" },
        });
        fireEvent.change(screen.getByLabelText("ปักหมุดขายดี"), {
            target: { value: "1" },
        });
        fireEvent.change(screen.getByLabelText("สต็อกคงเหลือ"), {
            target: { value: "8" },
        });
        fireEvent.change(screen.getByLabelText("เลือกบัญชีรายได้"), {
            target: { value: "6" },
        });
        fireEvent.click(screen.getByRole("button", { name: "สร้างสินค้าใหม่" }));

        await waitFor(() => {
            expect(createProductSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    sku: "SMOOTHIE-01",
                    name: "Berry Smoothie",
                    tagline: "สมูทตี้ผลไม้ขายดี",
                    posCategory: "COFFEE",
                    featuredSlot: 1,
                    revenueAccountId: "6",
                }),
            );
        }, { timeout: 20000 });
    }, 30000);

    it("sends revenueAccountId when updating a product", async () => {
        const updateProductSpy = vi.spyOn(mockAppAdapter, "updateProduct");

        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        fireEvent.click(screen.getByText("Personal Training Session"));

        await waitFor(() => {
            expect(screen.getByLabelText("เลือกบัญชีรายได้")).toHaveValue("7");
        }, { timeout: 20000 });

        fireEvent.change(screen.getByLabelText("คำโปรยสินค้า"), {
            target: { value: "เทรนเดี่ยวจองง่าย" },
        });
        fireEvent.change(screen.getByLabelText("หมวดขาย POS"), {
            target: { value: "TRAINING" },
        });
        fireEvent.change(screen.getByLabelText("ปักหมุดขายดี"), {
            target: { value: "4" },
        });
        fireEvent.change(screen.getByLabelText("เลือกบัญชีรายได้"), {
            target: { value: "4" },
        });
        fireEvent.click(screen.getByRole("button", { name: "บันทึกสินค้า" }));

        await waitFor(() => {
            expect(updateProductSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    productId: 108,
                    tagline: "เทรนเดี่ยวจองง่าย",
                    posCategory: "TRAINING",
                    featuredSlot: 4,
                    revenueAccountId: "4",
                }),
            );
        }, { timeout: 20000 });
    }, 30000);

    it("sends explicit membership metadata when creating a membership product", async () => {
        const createProductSpy = vi.spyOn(mockAppAdapter, "createProduct");

        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        fireEvent.click(screen.getAllByRole("button", { name: "เพิ่มสินค้าใหม่" })[0]);
        fireEvent.change(screen.getByLabelText("ประเภทสินค้าใหม่"), {
            target: { value: "MEMBERSHIP" },
        });
        fireEvent.change(screen.getByLabelText("SKU"), {
            target: { value: "MEM-QTR-NEW" },
        });
        fireEvent.change(screen.getByLabelText("ชื่อสินค้า"), {
            target: { value: "Quarterly Membership" },
        });
        fireEvent.change(screen.getByLabelText("ราคา"), {
            target: { value: "3900" },
        });
        fireEvent.change(screen.getByLabelText("รอบสมาชิก"), {
            target: { value: "QUARTERLY" },
        });
        fireEvent.change(screen.getByLabelText("จำนวนวันสมาชิก"), {
            target: { value: "90" },
        });
        fireEvent.click(screen.getByRole("button", { name: "สร้างสินค้าใหม่" }));

        await waitFor(() => {
            expect(createProductSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    productType: "MEMBERSHIP",
                    posCategory: "MEMBERSHIP",
                    membershipPeriod: "QUARTERLY",
                    membershipDurationDays: 90,
                    stockOnHand: null,
                }),
            );
        }, { timeout: 20000 });
    }, 30000);

    it("sends explicit membership metadata when updating a membership product", async () => {
        const updateProductSpy = vi.spyOn(mockAppAdapter, "updateProduct");

        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        fireEvent.click(screen.getByText("Monthly Membership"));
        fireEvent.change(screen.getByLabelText("รอบสมาชิก"), {
            target: { value: "YEARLY" },
        });
        fireEvent.change(screen.getByLabelText("จำนวนวันสมาชิก"), {
            target: { value: "365" },
        });
        fireEvent.click(screen.getByRole("button", { name: "บันทึกสินค้า" }));

        await waitFor(() => {
            expect(updateProductSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    membershipPeriod: "YEARLY",
                    membershipDurationDays: 365,
                    posCategory: "MEMBERSHIP",
                }),
            );
        }, { timeout: 20000 });
    }, 30000);

    it("shows pinned products for quick selection", async () => {
        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        expect(screen.getByRole("heading", { name: "ย้ายการจัดการสินค้าไปหน้าใหม่แบบตารางแยกหมวด" })).toBeInTheDocument();
        expect(screen.getByLabelText("Product row Mineral Water")).toBeInTheDocument();
        expect(screen.getByLabelText("Product row Protein Shake")).toBeInTheDocument();
        expect(screen.getByLabelText("Product row Monthly Membership")).toBeInTheDocument();
        expect(screen.getByLabelText("Product row Personal Training Session")).toBeInTheDocument();
    });
});