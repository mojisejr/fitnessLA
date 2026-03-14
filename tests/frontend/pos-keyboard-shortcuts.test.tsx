import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import PosPage from "@/app/(app)/pos/page";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 10000 });
}

describe("POS keyboard shortcuts", () => {
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

  it("supports shortcut-driven product add, payment selection, and cart clear", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.keyDown(window, { key: "F2" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ลบ" })).toBeInTheDocument();
    }, { timeout: 10000 });

    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(screen.getByRole("button", { name: "พร้อมเพย์" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByText(/ตะกร้ายังว่างอยู่/)).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 10000);

  it("blocks increasing quantity beyond stock", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.click(screen.getByRole("button", { name: "โปรตีนเชค" }));

    const selectedProductPanel = screen.getByRole("heading", { name: "โปรตีนเชค", level: 2 }).closest("section");

    expect(selectedProductPanel).not.toBeNull();

    const shakeAddButton = within(selectedProductPanel as HTMLElement).getByRole("button", {
      name: "เพิ่มลงบิล",
    });

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(shakeAddButton);
    }

    fireEvent.click(shakeAddButton);

    expect(screen.getByText("สต็อก Protein Shake คงเหลือ 6 ชิ้น")).toBeInTheDocument();
  }, 10000);

  it("filters products using the Thai labels shown in the POS UI", async () => {
    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.change(screen.getByRole("textbox", { name: "Product search" }), {
      target: { value: "น้ำดื่ม" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "น้ำดื่ม" })).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.queryByRole("button", { name: "อเมริกาโน่เย็น" })).not.toBeInTheDocument();
    expect(screen.queryByText("ไม่พบรายการที่ตรงกับคำค้นหรือหมวดที่เลือก")).not.toBeInTheDocument();
  }, 10000);
});