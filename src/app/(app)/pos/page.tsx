"use client";

import { useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ShiftGuard } from "@/components/guards/shift-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import {
  addCartLineAtom,
  cartCountAtom,
  cartLinesAtom,
  cartSubtotalAtom,
  clearCartAtom,
  removeCartLineAtom,
  updateCartLineAtom,
} from "@/features/pos/cart-store";
import type { OrderResult, PaymentMethod, Product, ShiftInventorySummaryRow } from "@/lib/contracts";
import { formatCurrency, getErrorMessage, formatDate } from "@/lib/utils";

const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  PROMPTPAY: "PromptPay",
  CREDIT_CARD: "บัตรเครดิต",
};

export default function PosPage() {
  const adapter = useAppAdapter();
  const { session } = useAuth();
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
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [inventorySummary, setInventorySummary] = useState<ShiftInventorySummaryRow[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<OrderResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newProductType, setNewProductType] = useState<"GOODS" | "SERVICE">("GOODS");
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStockOnHand, setEditStockOnHand] = useState("");
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const checkoutButtonRef = useRef<HTMLButtonElement | null>(null);

  const deferredQuery = useDeferredValue(query);

  const containsMembership = useMemo(
    () => cartLines.some((line) => line.product_type === "MEMBERSHIP"),
    [cartLines],
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.product_id, product])),
    [products],
  );

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.product_id) === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const inventoryTotals = useMemo(() => {
    return inventorySummary.reduce(
      (summary, row) => ({
        opening_stock: summary.opening_stock + row.opening_stock,
        sold_quantity: summary.sold_quantity + row.sold_quantity,
        remaining_stock: summary.remaining_stock + row.remaining_stock,
      }),
      { opening_stock: 0, sold_quantity: 0, remaining_stock: 0 },
    );
  }, [inventorySummary]);

  const cartSummaryRows = useMemo(
    () =>
      cartLines.map((line) => ({
        productId: line.product_id,
        name: line.name,
        quantity: line.quantity,
        total: line.price * line.quantity,
      })),
    [cartLines],
  );

  async function refreshProducts() {
    setProductsLoading(true);

    try {
      const result = await adapter.listProducts();
      setProducts(result);
    } finally {
      setProductsLoading(false);
    }
  }

  async function refreshShiftInventory() {
    if (!session?.active_shift_id) {
      setInventorySummary([]);
      setInventoryLoading(false);
      return;
    }

    setInventoryLoading(true);

    try {
      const result = await adapter.getShiftInventorySummary(session.active_shift_id);
      setInventorySummary(result);
      setInventoryError(null);
    } catch (error) {
      setInventorySummary([]);
      setInventoryError(getErrorMessage(error, "สรุป stock ในกะยังไม่พร้อมใช้งาน"));
    } finally {
      setInventoryLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
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

  useEffect(() => {
    void refreshShiftInventory();
  }, [adapter, session?.active_shift_id]);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(String(products[0].product_id));
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    if (isCreateMode) {
      return;
    }

    setEditSku(selectedProduct.sku);
    setEditName(selectedProduct.name);
    setEditPrice(String(selectedProduct.price));
    setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
  }, [isCreateMode, selectedProduct]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      `${product.name} ${product.sku} ${product.product_type}`.toLowerCase().includes(normalizedQuery),
    );
  }, [deferredQuery, products]);

  const inventoryProducts = useMemo(
    () => filteredProducts.filter((product) => product.product_type !== "MEMBERSHIP"),
    [filteredProducts],
  );

  const membershipProducts = useMemo(
    () => filteredProducts.filter((product) => product.product_type === "MEMBERSHIP"),
    [filteredProducts],
  );

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
      const firstProduct = inventoryProducts[0] ?? membershipProducts[0];
      if (firstProduct) {
        handleAddProduct(firstProduct);
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

  function getProjectedMembershipEndDate(product: Product) {
    if (product.product_type !== "MEMBERSHIP") {
      return null;
    }

    const duration = product.membership_duration_days ?? 0;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + duration);
    return formatDate(nextDate.toISOString());
  }

  function handleAddProduct(product: Product) {
    const existingLine = cartLines.find((line) => line.product_id === product.product_id);
    const currentQuantity = existingLine?.quantity ?? 0;

    if (product.product_type === "MEMBERSHIP" && currentQuantity >= 1) {
      setErrorMessage("แพ็กเกจสมาชิกเพิ่มซ้ำในบิลเดียวไม่ได้");
      return;
    }

    if (product.track_stock && typeof product.stock_on_hand === "number" && currentQuantity >= product.stock_on_hand) {
      setErrorMessage(`สต็อก ${product.name} คงเหลือ ${product.stock_on_hand} ชิ้น`);
      return;
    }

    setErrorMessage(null);
    addCartLine(product);
  }

  function handleIncreaseLine(product: Product, nextQuantity: number) {
    if (product.product_type === "MEMBERSHIP" && nextQuantity > 1) {
      setErrorMessage("แพ็กเกจสมาชิกซื้อได้ครั้งละ 1 รายการ");
      return;
    }

    if (product.track_stock && typeof product.stock_on_hand === "number" && nextQuantity > product.stock_on_hand) {
      setErrorMessage(`สต็อก ${product.name} คงเหลือ ${product.stock_on_hand} ชิ้น`);
      return;
    }

    setErrorMessage(null);
    updateCartLine({ productId: product.product_id, quantity: nextQuantity });
  }

  async function handleSaveProduct() {
    if (!selectedProduct && !isCreateMode) {
      return;
    }

    const parsedPrice = Number(editPrice);
    const parsedStockOnHand = Number(editStockOnHand);

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setEditorError("ราคาสินค้าต้องเป็นศูนย์หรือมากกว่า");
      return;
    }

    const shouldTrackStock = isCreateMode ? newProductType === "GOODS" : Boolean(selectedProduct?.track_stock);

    if (shouldTrackStock && (Number.isNaN(parsedStockOnHand) || parsedStockOnHand < 0)) {
      setEditorError("จำนวน stock ต้องเป็นศูนย์หรือมากกว่า");
      return;
    }

    setEditorError(null);
    setEditorMessage(null);
    setIsSavingProduct(true);

    try {
      if (isCreateMode) {
        await adapter.createProduct({
          sku: editSku,
          name: editName,
          price: parsedPrice,
          productType: newProductType,
          stockOnHand: newProductType === "GOODS" ? parsedStockOnHand : null,
        });
      } else if (selectedProduct) {
        await adapter.updateProduct({
          productId: selectedProduct.product_id,
          sku: editSku,
          name: editName,
          price: parsedPrice,
          stockOnHand: selectedProduct.track_stock ? parsedStockOnHand : null,
        });
      }

      await Promise.all([refreshProducts(), refreshShiftInventory()]);
      if (isCreateMode) {
        setEditorMessage("เพิ่มสินค้าใหม่เรียบร้อยแล้ว");
        setIsCreateMode(false);
        setNewProductType("GOODS");
      } else {
        setEditorMessage("อัปเดตสินค้าและ stock เรียบร้อยแล้ว");
      }
    } catch (error) {
      setEditorError(getErrorMessage(error, "ไม่สามารถอัปเดตสินค้าได้"));
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleCheckout() {
    if (!session?.active_shift_id) {
      setErrorMessage("กรุณาเปิดกะก่อนคิดเงิน");
      return;
    }

    if (containsMembership && !customerName.trim()) {
      setErrorMessage("บิลสมาชิกต้องระบุชื่อลูกค้าเพื่อใช้กำหนดวันเริ่มและวันหมดอายุ");
      return;
    }

    const invalidStockLine = cartLines.find((line) => {
      const product = productById.get(line.product_id);
      return Boolean(product?.track_stock && typeof product.stock_on_hand === "number" && line.quantity > product.stock_on_hand);
    });

    if (invalidStockLine) {
      const product = productById.get(invalidStockLine.product_id)!;
      setErrorMessage(`สต็อก ${product.name} คงเหลือ ${product.stock_on_hand} ชิ้น`);
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
      await Promise.all([refreshProducts(), refreshShiftInventory()]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างรายการขายได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ShiftGuard>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_minmax(360px,0.78fr)] xl:items-start">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">POS foundation</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">พื้นที่ขายหน้าร้าน</h1>
            </div>
            <div className="rounded-[20px] bg-accent-soft px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">จำนวนรายการในตะกร้า</p>
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
              className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent md:max-w-md"
            />
            <p className="text-sm text-muted">เป้าหมายรอบนี้คือหยิบสินค้า, จัดการตะกร้า และทดสอบขั้นตอนรับเงิน</p>
          </div>

          {productsLoading ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
              กำลังโหลดสินค้า...
            </div>
          ) : (
            <div className="mt-6 space-y-6 xl:space-y-7">
              <section className="rounded-3xl border border-line/80 bg-background/60 p-5 md:p-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">สินค้าและบริการ</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">แยกจากสมาชิกชัดเจน</h2>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-muted">เฉพาะสินค้า goods จะตรวจสต็อกก่อนเพิ่มเข้าตะกร้า</p>
                </div>
                <div className="mt-5 grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                  {inventoryProducts.map((product) => {
                    const isOutOfStock = product.track_stock && typeof product.stock_on_hand === "number" && product.stock_on_hand <= 0;
                    return (
                      <button
                        key={product.product_id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        aria-label={`Add ${product.name}`}
                        disabled={Boolean(isOutOfStock)}
                        className="group flex h-full flex-col rounded-3xl border border-line bg-[#161510] p-5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:bg-[#f4cf3a] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted transition group-hover:text-[#2c2200]">{product.product_type}</p>
                          {product.track_stock ? (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOutOfStock ? "bg-warning-soft text-foreground group-hover:bg-[#5a2f04] group-hover:text-[#fff7d6]" : "bg-accent-soft text-foreground group-hover:bg-[#2c2200] group-hover:text-[#fff7d6]"}`}>
                              คงเหลือ {product.stock_on_hand}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 text-xl font-semibold leading-snug text-foreground text-balance transition group-hover:text-[#201703]">{product.name}</h2>
                        <p className="mt-1 text-sm text-muted transition group-hover:text-[#4c3a08]">{product.sku}</p>
                        <p className="mt-auto pt-5 text-2xl font-semibold text-foreground transition group-hover:text-[#201703]">{formatCurrency(product.price)}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-line/80 bg-background/60 p-5 md:p-6">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">ระบบสมาชิก</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">แยกจากสินค้าเพื่อรองรับวันหมดอายุ</h2>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-muted">daily, monthly, quarterly, semiannual, yearly จะคำนวณช่วงอายุสมาชิกจากวันที่ซื้อ</p>
                </div>
                <div className="mt-5 grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                  {membershipProducts.map((product) => (
                    <button
                      key={product.product_id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      aria-label={`Add ${product.name}`}
                      className="group flex h-full min-h-64 min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-[#1a1608] p-5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:bg-[#f4cf3a]"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-muted transition group-hover:text-[#4c3a08]">{product.membership_period}</p>
                      <h2 className="mt-3 max-w-full text-[clamp(1.1rem,1.6vw,1.4rem)] font-semibold leading-snug text-foreground text-balance transition group-hover:text-[#201703]">
                        {product.name}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted transition group-hover:text-[#4c3a08]">เริ่มวันนี้ หมดอายุ {getProjectedMembershipEndDate(product)}</p>
                      <p className="mt-auto break-words pt-5 text-[clamp(1.55rem,2vw,2rem)] font-semibold leading-tight text-foreground transition group-hover:text-[#201703]">
                        {formatCurrency(product.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-line bg-background/70 p-5 md:p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">จัดการสินค้าใน POS</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">เพิ่มสินค้าใหม่ หรือแก้ไขชื่อ, ราคา, SKU และ stock</h2>
                  </div>
                  <p className="text-sm text-muted">สินค้าที่ track stock จะอัปเดตยอดคงเหลือและสรุปในกะทันทีหลังบันทึก</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMode(true);
                      setNewProductType("GOODS");
                      setEditSku("");
                      setEditName("");
                      setEditPrice("");
                      setEditStockOnHand("0");
                      setEditorMessage(null);
                      setEditorError(null);
                    }}
                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                  >
                    เพิ่มสินค้าใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMode(false);
                      if (selectedProduct) {
                        setEditSku(selectedProduct.sku);
                        setEditName(selectedProduct.name);
                        setEditPrice(String(selectedProduct.price));
                        setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
                      }
                      setEditorMessage(null);
                      setEditorError(null);
                    }}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                  >
                    แก้ไขสินค้าเดิม
                  </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">{isCreateMode ? "ประเภทสินค้าใหม่" : "เลือกสินค้าเพื่อแก้ไข"}</span>
                    {isCreateMode ? (
                      <select
                        aria-label="ประเภทสินค้าใหม่"
                        value={newProductType}
                        onChange={(event) => setNewProductType(event.target.value as "GOODS" | "SERVICE")}
                        className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                      >
                        <option value="GOODS">สินค้า</option>
                        <option value="SERVICE">บริการ</option>
                      </select>
                    ) : (
                      <select
                        aria-label="เลือกสินค้าเพื่อแก้ไข"
                        value={selectedProductId}
                        onChange={(event) => {
                          setSelectedProductId(event.target.value);
                          setEditorMessage(null);
                          setEditorError(null);
                        }}
                        className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                      >
                        {products.map((product) => (
                          <option key={product.product_id} value={String(product.product_id)}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">SKU</span>
                      <input
                        value={editSku}
                        onChange={(event) => setEditSku(event.target.value)}
                        className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">ราคา</span>
                      <input
                        inputMode="decimal"
                        value={editPrice}
                        onChange={(event) => setEditPrice(event.target.value)}
                        className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">ชื่อสินค้า</span>
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-foreground">stock คงเหลือ</span>
                    <input
                      aria-label="stock คงเหลือ"
                      inputMode="numeric"
                      value={editStockOnHand}
                      onChange={(event) => setEditStockOnHand(event.target.value)}
                      disabled={isCreateMode ? newProductType !== "GOODS" : !selectedProduct?.track_stock}
                      className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent disabled:opacity-50"
                    />
                  </label>
                </div>

                {editorError ? (
                  <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                    {editorError}
                  </div>
                ) : null}

                {editorMessage ? (
                  <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                    {editorMessage}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveProduct()}
                    disabled={(!selectedProduct && !isCreateMode) || isSavingProduct}
                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingProduct ? "กำลังบันทึก..." : isCreateMode ? "สร้างสินค้าใหม่" : "บันทึกสินค้า"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCreateMode) {
                        setEditSku("");
                        setEditName("");
                        setEditPrice("");
                        setEditStockOnHand(newProductType === "GOODS" ? "0" : "");
                      } else if (selectedProduct) {
                        setEditSku(selectedProduct.sku);
                        setEditName(selectedProduct.name);
                        setEditPrice(String(selectedProduct.price));
                        setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
                      }
                      setEditorMessage(null);
                      setEditorError(null);
                    }}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                  >
                    รีเซ็ตฟอร์ม
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8 xl:sticky xl:top-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">ตะกร้าและการคิดเงิน</p>
          <div className="mt-4 space-y-3">
            {cartLines.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line bg-background/70 p-6 text-sm leading-7 text-muted">
                ตะกร้ายังว่างอยู่ เพิ่มสินค้าจากฝั่งซ้ายเพื่อทดสอบจำนวน, วิธีชำระเงิน และสถานะการ checkout
              </div>
            ) : (
              cartLines.map((line) => (
                <div key={line.product_id} className="rounded-[22px] border border-line bg-[#161510] p-4">
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
                        onClick={() => handleIncreaseLine(line, line.quantity + 1)}
                        className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-foreground"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(line.price * line.quantity)}</p>
                      {line.product_type === "MEMBERSHIP" ? (
                        <p className="mt-1 text-xs text-muted">หมดอายุ {getProjectedMembershipEndDate(line)}</p>
                      ) : line.track_stock ? (
                        <p className="mt-1 text-xs text-muted">สต็อกคงเหลือ {(line.stock_on_hand ?? 0) - line.quantity}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-background/70 p-5">
            <p className="text-sm text-muted">วิธีชำระเงิน</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["CASH", "PROMPTPAY", "CREDIT_CARD"] as PaymentMethod[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentMethod(option)}
                  aria-pressed={paymentMethod === option}
                  className={`min-h-14 rounded-2xl px-2 py-3 text-center text-sm font-semibold leading-tight transition ${paymentMethod === option ? "bg-accent text-black" : "bg-[#161510] text-foreground hover:bg-[#f4cf3a] hover:text-black"}`}
                >
                  {paymentMethodLabel[option]}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder={containsMembership ? "ชื่อลูกค้าสมาชิก" : "ชื่อลูกค้า (ถ้ามี)"}
                className="rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
              <input
                value={customerTaxId}
                onChange={(event) => setCustomerTaxId(event.target.value)}
                placeholder="เลขผู้เสียภาษี (ถ้ามี)"
                className="rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
            </div>

            {containsMembership ? (
              <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                ระบบสมาชิกต้องระบุชื่อผู้ซื้อ เพื่อใช้บันทึกวันเริ่ม, วันหมดอายุ และติดตามสถานะการต่ออายุในรอบถัดไป
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-accent-soft p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">ยอดรวมย่อย</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(cartSubtotal)}</p>
            </div>
            {cartSummaryRows.length > 0 ? (
              <div className="mt-4 space-y-3">
                {cartSummaryRows.map((row) => (
                  <div key={row.productId} className="flex items-start justify-between gap-3 rounded-[18px] bg-[#221c07] px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{row.name}</p>
                      <p className="mt-1 text-muted">จำนวน {row.quantity} ชิ้น</p>
                    </div>
                    <p className="shrink-0 font-semibold text-foreground">{formatCurrency(row.total)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] bg-[#221c07] px-4 py-3 text-sm leading-6 text-foreground">
                ยังไม่มีสินค้าในตะกร้า เมื่อเพิ่มสินค้าแล้วจะมีสรุปรายการและยอดต่อบรรทัดแสดงตรงนี้
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-background/70 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm text-muted">สรุป stock ในกะ</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">มีเท่าไหร่ ขายไปกี่ชิ้น คงเหลือเท่าไร</h2>
              </div>
              <p className="text-sm text-muted">สรุปนี้จะอัปเดตทันทีเมื่อแก้ stock หรือกดขายสินค้าในกะปัจจุบัน</p>
            </div>

            {inventoryError ? (
              <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                {inventoryError}
              </div>
            ) : null}

            {inventoryLoading ? (
              <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                กำลังโหลดสรุปสินค้าในกะ...
              </div>
            ) : inventorySummary.length > 0 ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="h-full rounded-[22px] border border-line bg-[#161510] p-4">
                    <p className="text-xs font-semibold text-muted">stock รวมในกะ</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{inventoryTotals.opening_stock}</p>
                  </div>
                  <div className="h-full rounded-[22px] border border-line bg-[#161510] p-4">
                    <p className="text-xs font-semibold text-muted">ขายไปแล้ว</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{inventoryTotals.sold_quantity}</p>
                  </div>
                  <div className="h-full rounded-[22px] border border-line bg-[#161510] p-4">
                    <p className="text-xs font-semibold text-muted">คงเหลือ</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{inventoryTotals.remaining_stock}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-[#161510]">
                  <table className="min-w-full divide-y divide-line text-sm">
                    <thead className="bg-[#0d0d0a]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted">สินค้า</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">SKU</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">มีในกะ</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">ขายไป</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">คงเหลือ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {inventorySummary.map((row) => (
                        <tr key={row.product_id} aria-label={`Inventory ${row.name}`}>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.name}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.sku}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.opening_stock}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.sold_quantity}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.remaining_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                ยังไม่มีข้อมูล stock สำหรับกะนี้
              </div>
            )}
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-[20px] border border-accent bg-[#161510] px-4 py-4 text-sm text-foreground">
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