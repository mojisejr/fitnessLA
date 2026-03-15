import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 25000 });
}

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

  it("updates stock and reflects inventory summary rows", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.change(screen.getByLabelText("เลือกสินค้าเพื่อแก้ไข"), {
      target: { value: "101" },
    });
    fireEvent.change(screen.getByLabelText("สต็อกคงเหลือ"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกสินค้า" }));

    await waitFor(() => {
      expect(screen.getByText("อัปเดตสินค้าและ stock เรียบร้อยแล้ว")).toBeInTheDocument();
    }, { timeout: 25000 });

    await waitFor(() => {
      expect(screen.queryByText("กำลังโหลดสรุปสินค้าในกะ...")).not.toBeInTheDocument();
    }, { timeout: 25000 });

    const waterRow = await screen.findByLabelText("Inventory Mineral Water");
    expect(within(waterRow).getAllByText("20").length).toBeGreaterThanOrEqual(2);
    expect(within(waterRow).getByText("0")).toBeInTheDocument();
  }, 30000);

  it("creates a new product from POS and includes coffee in the product list", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    expect(screen.getByRole("option", { name: "อเมริกาโน่เย็น" })).toBeInTheDocument();

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
    fireEvent.change(screen.getByLabelText("สต็อกคงเหลือ"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างสินค้าใหม่" }));

    await waitFor(() => {
      expect(screen.getByText("เพิ่มสินค้าใหม่เรียบร้อยแล้ว")).toBeInTheDocument();
    }, { timeout: 25000 });

    expect(screen.getAllByRole("option", { name: "Latte" }).length).toBeGreaterThan(0);
  }, 30000);
});