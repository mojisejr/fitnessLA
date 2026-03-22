import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import PosProductsPage from "@/app/(app)/pos/products/page";
import { mockAppAdapter } from "@/features/adapters/mock-app-adapter";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
    await waitFor(() => {
        expect(screen.queryByText("กำลังโหลดรายการสินค้า...")).not.toBeInTheDocument();
        expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
    }, { timeout: 25000 });
}

describe("POS inventory management", () => {
    beforeEach(() => {
        clearMockSession();
        seedMockSession({
            session: {
                user_id: 3,
                username: "admin",
                full_name: "Pim Counter",
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

    it("adds stock on top of current quantity and records the adjustment", async () => {
        const initialProducts = await mockAppAdapter.listProducts();
        const mineralWater = initialProducts.find((product) => product.name === "Mineral Water");
        const initialStock = mineralWater?.stock_on_hand ?? 0;
        const expectedStock = initialStock + 10;

        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        const waterRow = screen.getByLabelText("Product row Mineral Water");
        fireEvent.click(within(waterRow).getByRole("button", { name: "เติมสินค้า Mineral Water" }));
        fireEvent.change(screen.getByLabelText("เติมเพิ่ม Mineral Water"), {
            target: { value: "10" },
        });
        fireEvent.change(screen.getByLabelText("หมายเหตุการเติมสินค้า Mineral Water"), {
            target: { value: "เติมจากสต็อกรอบเช้า" },
        });
        fireEvent.click(screen.getByRole("button", { name: "บันทึกการเติมสินค้า" }));

        await waitFor(() => {
            const restockRow = screen.getByLabelText("Restock row Mineral Water");
            expect(within(restockRow).getByText(`เติมสต็อก Mineral Water จาก ${initialStock} เป็น ${expectedStock} เรียบร้อยแล้ว`)).toBeInTheDocument();
        }, { timeout: 25000 });

        expect(screen.getByText("ยอดหลังเติม")).toBeInTheDocument();

        const historyPanel = screen.getByText("ดูย้อนหลังว่าเติมเมื่อไร เพิ่มเท่าไร และจบที่กี่ชิ้น").closest("section");
        expect(historyPanel).not.toBeNull();
        const history = within(historyPanel as HTMLElement);
        await waitFor(() => {
            expect(history.queryByText("กำลังโหลดประวัติการเติมสินค้า...")).not.toBeInTheDocument();
        }, { timeout: 25000 });
        expect(history.getByText(`เดิม ${initialStock}`)).toBeInTheDocument();
        expect(history.getByText("เติม +10")).toBeInTheDocument();
        expect(history.getByText(`รวม ${expectedStock}`)).toBeInTheDocument();
        expect(history.getByText("เติมจากสต็อกรอบเช้า")).toBeInTheDocument();
    }, 30000);

    it("creates a new product from POS and includes coffee in the product list", async () => {
        renderWithProviders(<PosProductsPage />);

        await waitForPosReady();

        expect(screen.getByLabelText("Product row Iced Americano")).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole("button", { name: "เพิ่มสินค้าใหม่" })[0]);
        fireEvent.change(screen.getByLabelText("SKU"), {
            target: { value: "COFFEE-02" },
        });
        fireEvent.change(screen.getByLabelText("ชื่อสินค้า"), {
            target: { value: "Latte" },
        });
        fireEvent.change(screen.getByLabelText("ราคา"), {
            target: { value: "85" },
        });
        fireEvent.change(screen.getByLabelText("สต็อกคงเหลือ"), {
            target: { value: "12" },
        });
        fireEvent.click(screen.getByRole("button", { name: "สร้างสินค้าใหม่" }));

        await waitFor(() => {
            expect(screen.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeInTheDocument();
        }, { timeout: 25000 });

        fireEvent.change(screen.getByLabelText("ค้นหาสินค้า"), {
            target: { value: "Latte" },
        });

        expect(screen.getByLabelText("Product row Latte")).toBeInTheDocument();
    }, 30000);
});