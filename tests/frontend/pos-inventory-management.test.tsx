import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

describe("POS inventory management", () => {
  beforeEach(() => {
    clearMockSession();
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
  });

  it("updates stock and reflects sold quantities in the shift summary", async () => {
    renderWithProviders(<PosPage />);

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("เลือกสินค้าเพื่อแก้ไข"), {
      target: { value: "101" },
    });
    fireEvent.change(screen.getByLabelText("stock คงเหลือ"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกสินค้า" }));

    await waitFor(() => {
      expect(screen.getByText("อัปเดตสินค้าและ stock เรียบร้อยแล้ว")).toBeInTheDocument();
    });

    const waterCard = screen.getByRole("button", { name: "Add Mineral Water" });
    fireEvent.click(waterCard);
    fireEvent.click(waterCard);
    fireEvent.click(waterCard);
    fireEvent.click(screen.getByRole("button", { name: "คิดเงิน" }));

    await waitFor(() => {
      expect(screen.getByText("คิดเงินสำเร็จ")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสรุปสินค้าในกะ...")).not.toBeInTheDocument();
    });

    const waterRow = await screen.findByLabelText("Inventory Mineral Water");
    expect(within(waterRow).getByText("20")).toBeInTheDocument();
    expect(within(waterRow).getByText("3")).toBeInTheDocument();
    expect(within(waterRow).getByText("17")).toBeInTheDocument();
  });

  it("creates a new product from POS and includes coffee in the product list", async () => {
    renderWithProviders(<PosPage />);

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Add Iced Americano" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "เพิ่มสินค้าใหม่" }));
    fireEvent.change(screen.getByLabelText("SKU"), {
      target: { value: "COFFEE-02" },
    });
    fireEvent.change(screen.getByLabelText("ชื่อสินค้า"), {
      target: { value: "Latte" },
    });
    fireEvent.change(screen.getByLabelText("ราคา"), {
      target: { value: "85" },
    });
    fireEvent.change(screen.getByLabelText("stock คงเหลือ"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างสินค้าใหม่" }));

    await waitFor(() => {
      expect(screen.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Add Latte" })).toBeInTheDocument();
  });
});