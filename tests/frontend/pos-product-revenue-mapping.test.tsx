import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import PosPage from "@/app/(app)/pos/page";
import { mockAppAdapter } from "@/features/adapters/mock-app-adapter";
import { clearMockSession, renderWithProviders, seedMockSession } from "./test-utils";

async function waitForPosReady() {
  await waitFor(() => {
    expect(screen.queryByText("กำลังโหลดสินค้า...")).not.toBeInTheDocument();
    expect(screen.queryByText("กำลังโหลดตัวเลือกบัญชีรายได้...")).not.toBeInTheDocument();
  }, { timeout: 10000 });
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

    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.click(screen.getByRole("button", { name: "เพิ่มสินค้าใหม่" }));
    fireEvent.change(screen.getByLabelText("SKU"), {
      target: { value: "SMOOTHIE-01" },
    });
    fireEvent.change(screen.getByLabelText("ชื่อสินค้า"), {
      target: { value: "Berry Smoothie" },
    });
    fireEvent.change(screen.getByLabelText("ราคา"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText("stock คงเหลือ"), {
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
          revenueAccountId: "6",
        }),
      );
    }, { timeout: 10000 });
  }, 10000);

  it("sends revenueAccountId when updating a product", async () => {
    const updateProductSpy = vi.spyOn(mockAppAdapter, "updateProduct");

    renderWithProviders(<PosPage />);

    await waitForPosReady();

    fireEvent.click(screen.getByRole("button", { name: "แก้ไขสินค้าเดิม" }));
    fireEvent.change(screen.getByLabelText("เลือกสินค้าเพื่อแก้ไข"), {
      target: { value: "108" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("เลือกบัญชีรายได้")).toHaveValue("7");
    }, { timeout: 10000 });

    fireEvent.change(screen.getByLabelText("เลือกบัญชีรายได้"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกสินค้า" }));

    await waitFor(() => {
      expect(updateProductSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 108,
          revenueAccountId: "4",
        }),
      );
    }, { timeout: 10000 });
  }, 10000);
});