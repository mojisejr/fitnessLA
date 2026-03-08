"use client";

import { useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ShiftGuard } from "@/components/guards/shift-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useMockSession } from "@/features/auth/mock-session-provider";
import {
  addCartLineAtom,
  cartCountAtom,
  cartLinesAtom,
  cartSubtotalAtom,
  clearCartAtom,
  removeCartLineAtom,
  updateCartLineAtom,
} from "@/features/pos/cart-store";
import type { OrderResult, PaymentMethod, Product } from "@/lib/contracts";
import { formatCurrency, getErrorMessage } from "@/lib/utils";

export default function PosPage() {
  const adapter = useAppAdapter();
  const { session } = useMockSession();
  const cartLines = useAtomValue(cartLinesAtom);
  const cartSubtotal = useAtomValue(cartSubtotalAtom);
  const cartCount = useAtomValue(cartCountAtom);
  const addCartLine = useSetAtom(addCartLineAtom);
  const updateCartLine = useSetAtom(updateCartLineAtom);
  const removeCartLine = useSetAtom(removeCartLineAtom);
  const clearCart = useSetAtom(clearCartAtom);

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const checkoutButtonRef = useRef<HTMLButtonElement | null>(null);

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      setProductsLoading(true);

      try {
        const result = await adapter.listProducts();
        if (isActive) {
          setProducts(result);
        }
      } finally {
        if (isActive) {
          setProductsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, [adapter]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      `${product.name} ${product.sku} ${product.product_type}`.toLowerCase().includes(normalizedQuery),
    );
  }, [deferredQuery, products]);

  const handleKeyboardShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
      return;
    }

    if (event.altKey && event.key === "1") {
      event.preventDefault();
      setPaymentMethod("CASH");
      return;
    }

    if (event.altKey && event.key === "2") {
      event.preventDefault();
      setPaymentMethod("PROMPTPAY");
      return;
    }

    if (event.altKey && event.key === "3") {
      event.preventDefault();
      setPaymentMethod("CREDIT_CARD");
      return;
    }

    if (event.key === "F2") {
      event.preventDefault();
      const firstProduct = filteredProducts[0];
      if (firstProduct) {
        addCartLine(firstProduct);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      checkoutButtonRef.current?.focus();
      if (!isSubmitting && cartLines.length > 0) {
        void handleCheckout();
      }
      return;
    }

    if (event.key === "Escape") {
      if (cartLines.length > 0) {
        event.preventDefault();
        clearCart();
        setSuccess(null);
        setErrorMessage(null);
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, []);

  async function handleCheckout() {
    if (!session?.active_shift_id) {
      setErrorMessage("กรุณาเปิดกะก่อนคิดเงิน");
      return;
    }

    setErrorMessage(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await adapter.createOrder({
        shift_id: session.active_shift_id,
        items: cartLines.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
        payment_method: paymentMethod,
        customer_info: customerName
          ? {
              name: customerName,
              tax_id: customerTaxId || undefined,
            }
          : undefined,
      });

      setSuccess(result);
      clearCart();
      setCustomerName("");
      setCustomerTaxId("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างรายการขายได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ShiftGuard>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">POS foundation</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">พื้นที่ขายหน้าร้าน</h1>
            </div>
            <div className="rounded-[20px] bg-accent-soft px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">จำนวนรายการในตะกร้า</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{cartCount}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              ref={searchInputRef}
              aria-label="Product search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาจากชื่อสินค้า, SKU หรือประเภท"
              className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent md:max-w-md"
            />
            <p className="text-sm text-muted">เป้าหมายรอบนี้คือหยิบสินค้า, จัดการตะกร้า และทดสอบขั้นตอนรับเงิน</p>
          </div>

          {productsLoading ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-line bg-background p-6 text-sm text-muted">
              กำลังโหลดสินค้า...
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => addCartLine(product)}
                  aria-label={`Add ${product.name}`}
                  className="rounded-[24px] border border-line bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">{product.product_type}</p>
                  <h2 className="mt-3 text-xl font-semibold text-foreground">{product.name}</h2>
                  <p className="mt-1 text-sm text-muted">{product.sku}</p>
                  <p className="mt-5 text-2xl font-semibold text-foreground">{formatCurrency(product.price)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">ตะกร้าและการคิดเงิน</p>
          <div className="mt-4 space-y-3">
            {cartLines.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-line bg-background p-6 text-sm leading-7 text-muted">
                ตะกร้ายังว่างอยู่ เพิ่มสินค้าจากฝั่งซ้ายเพื่อทดสอบจำนวน, วิธีชำระเงิน และสถานะการ checkout
              </div>
            ) : (
              cartLines.map((line) => (
                <div key={line.product_id} className="rounded-[22px] border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{line.name}</h2>
                      <p className="text-sm text-muted">{formatCurrency(line.price)} each</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCartLine(line.product_id)}
                      className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-foreground transition hover:border-warning hover:bg-warning-soft"
                    >
                      ลบ
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartLine({ productId: line.product_id, quantity: line.quantity - 1 })}
                        className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-foreground"
                      >
                        -
                      </button>
                      <span className="min-w-10 text-center text-sm font-semibold text-foreground">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartLine({ productId: line.product_id, quantity: line.quantity + 1 })}
                        className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-foreground"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-lg font-semibold text-foreground">{formatCurrency(line.price * line.quantity)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-[24px] border border-line bg-background p-5">
            <p className="text-sm text-muted">วิธีชำระเงิน</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["CASH", "PROMPTPAY", "CREDIT_CARD"] as PaymentMethod[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentMethod(option)}
                  aria-pressed={paymentMethod === option}
                  className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${paymentMethod === option ? "bg-accent text-black" : "bg-white text-foreground hover:bg-accent-soft"}`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="ชื่อลูกค้า (ถ้ามี)"
                className="rounded-[18px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
              />
              <input
                value={customerTaxId}
                onChange={(event) => setCustomerTaxId(event.target.value)}
                placeholder="เลขผู้เสียภาษี (ถ้ามี)"
                className="rounded-[18px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
              />
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-line bg-accent-soft p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">ยอดรวมย่อย</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(cartSubtotal)}</p>
            </div>
            <div className="mt-3 grid gap-2 text-xs uppercase tracking-[0.24em] text-muted md:grid-cols-2">
              <p>Ctrl/Cmd + K: โฟกัสช่องค้นหา</p>
              <p>F2: เพิ่มสินค้าตัวแรกที่มองเห็น</p>
              <p>Alt + 1/2/3: เปลี่ยนวิธีชำระเงิน</p>
              <p>Ctrl/Cmd + Enter: คิดเงิน</p>
              <p>Escape: ล้างตะกร้า</p>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-[20px] border border-accent bg-white px-4 py-4 text-sm text-foreground">
              <p className="font-semibold">คิดเงินสำเร็จ</p>
              <p className="mt-2">เลขคำสั่งขาย: {success.order_number}</p>
              <p>เลขเอกสารภาษี: {success.tax_doc_number}</p>
              <p>ยอดรวม: {formatCurrency(success.total_amount)}</p>
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => clearCart()}
              className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-warning hover:bg-warning-soft"
            >
              ล้างตะกร้า
            </button>
            <button
              ref={checkoutButtonRef}
              type="button"
              onClick={() => void handleCheckout()}
              disabled={isSubmitting || cartLines.length === 0}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังส่งรายการ..." : "คิดเงิน"}
            </button>
          </div>
        </section>
      </div>
    </ShiftGuard>
  );
}