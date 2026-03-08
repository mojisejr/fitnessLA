import { validateReceiptFile } from "@/features/expenses/receipt-validation";

describe("receipt validation", () => {
  it("rejects unsupported mime types", () => {
    const file = new File(["content"], "receipt.pdf", { type: "application/pdf" });

    expect(validateReceiptFile(file)).toBe("Receipt image must be JPG or PNG.");
  });

  it("rejects files over 5MB", () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });

    expect(validateReceiptFile(file)).toBe("Receipt image must be 5MB or smaller.");
  });

  it("accepts valid image files", () => {
    const file = new File(["ok"], "receipt.png", { type: "image/png" });

    expect(validateReceiptFile(file)).toBeNull();
  });
});