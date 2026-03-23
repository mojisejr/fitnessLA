"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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
    setCartLineTrainerAtom,
    updateCartLineAtom,
} from "@/features/pos/cart-store";
import type { ChartOfAccountRecord, OrderResult, PaymentMethod, Product, ShiftInventorySummaryRow, TrainerRecord } from "@/lib/contracts";
import { POS_CATEGORY_LABEL, getPosSalesCategoryFromProduct } from "@/lib/pos-categories";
import { formatCurrency, getErrorCode, getErrorMessage, formatDate } from "@/lib/utils";

const paymentMethodLabel: Record<PaymentMethod, string> = {
    CASH: "เงินสด",
    PROMPTPAY: "พร้อมเพย์",
    CREDIT_CARD: "บัตรเครดิต",
};

const membershipPeriodLabel = {
    DAILY: "รายวัน",
    MONTHLY: "1 เดือน",
    QUARTERLY: "3 เดือน",
    SEMIANNUAL: "6 เดือน",
    YEARLY: "1 ปี",
} as const;

type SellCategory = "ALL" | keyof typeof POS_CATEGORY_LABEL;
type PosEditorCategory = Exclude<SellCategory, "ALL">;
type FeaturedSlot = 1 | 2 | 3 | 4;

const sellCategoryLabel: Record<SellCategory, string> = {
    ALL: "ทุกหมวด",
    ...POS_CATEGORY_LABEL,
};

const featuredSlotChoices: Array<{ value: "" | `${FeaturedSlot}`; label: string }> = [
    { value: "", label: "ไม่ปักหมุด" },
    { value: "1", label: "ช่องด่วน 1" },
    { value: "2", label: "ช่องด่วน 2" },
    { value: "3", label: "ช่องด่วน 3" },
    { value: "4", label: "ช่องด่วน 4" },
];

function getValidationErrorMessage(error: unknown) {
    if (
        typeof error === "object" &&
        error !== null &&
        "details" in error &&
        typeof error.details === "object" &&
        error.details !== null &&
        "fieldErrors" in error.details &&
        typeof error.details.fieldErrors === "object" &&
        error.details.fieldErrors !== null
    ) {
        const fieldErrors = Object.values(error.details.fieldErrors as Record<string, unknown>)
            .flatMap((value) => Array.isArray(value) ? value : [])
            .filter((value): value is string => typeof value === "string" && value.length > 0);

        if (fieldErrors.length > 0) {
            return fieldErrors[0];
        }
    }

    return null;
}

const productDisplayLabelBySku: Record<string, { title: string; subtitle?: string }> = {
    "WATER-01": { title: "น้ำดื่ม", subtitle: "ขวดเล็กแช่เย็น" },
    "COFFEE-01": { title: "อเมริกาโน่เย็น", subtitle: "สูตรเข้มตามป้ายร้าน" },
    "COFFEE-02": { title: "อเมริกาโน่เย็น", subtitle: "คั่วกลาง" },
    "COFFEE-03": { title: "อเมริกาโน่เย็น", subtitle: "คั่วอ่อน" },
    "SHAKE-01": { title: "โปรตีนเชค", subtitle: "เครื่องดื่มโปรตีนพร้อมขาย" },
    DAYPASS: { title: "สมาชิกรายวัน", subtitle: "เข้าใช้ได้ 1 วัน" },
    "MEM-MONTH": { title: "สมาชิกรายเดือน", subtitle: "เข้าใช้ได้ 30 วัน" },
    "MEM-3MONTH": { title: "สมาชิก 3 เดือน", subtitle: "แพ็กเกจยอดนิยม" },
    "MEM-6MONTH": { title: "สมาชิก 6 เดือน", subtitle: "แพ็กเกจคุ้มค่าสำหรับลูกค้าประจำ" },
    "MEM-YEAR": { title: "สมาชิกรายปี", subtitle: "เหมาะสำหรับลูกค้าระยะยาว" },
    "SAUNA-01": { title: "ซาวน่า", subtitle: "ค่าบริการ 100 บาท" },
    "PT-01": { title: "เทรนเดี่ยว 1 ครั้ง", subtitle: "ครั้งละ 500 บาท" },
    "PT-10": { title: "เทรน 10 ครั้ง", subtitle: "อายุเทรน 30 วัน" },
    "PT-20": { title: "เทรน 20 ครั้ง", subtitle: "อายุเทรน 60 วัน" },
    "PT-MONTH": { title: "เทรนรายเดือน", subtitle: "ไม่จำกัดครั้ง" },
    "PT-COUPLE": { title: "เทรนคู่รายเดือน", subtitle: "ไม่จำกัดครั้ง" },
    "TOWEL-01": { title: "บริการผ้าเช็ดตัว", subtitle: "บริการเสริมหน้าเคาน์เตอร์" },
    "COFFEE-11": { title: "อเมริกาโน่ร้อน", subtitle: "คั่วเข้ม" },
    "COFFEE-22": { title: "อเมริกาโน่ร้อน", subtitle: "คั่วกลาง" },
    "COFFEE-23": { title: "อเมริกาโน่ร้อน", subtitle: "คั่วอ่อน" },
    "COFFEE-12": { title: "เอสเปรสโซ่ร้อน", subtitle: "ช็อตเข้ม" },
    "COFFEE-13": { title: "เอสเปรสโซ่เย็น", subtitle: "เข้มและหอม" },
    "COFFEE-14": { title: "ลาเต้ร้อน", subtitle: "นมนุ่ม ดื่มง่าย" },
    "COFFEE-15": { title: "ลาเต้เย็น", subtitle: "รสนุ่มตามป้าย" },
    "COFFEE-16": { title: "คาปูชิโน่ร้อน", subtitle: "ฟองนมนุ่ม" },
    "COFFEE-17": { title: "คาปูชิโน่เย็น", subtitle: "เข้มขึ้น หวานน้อย" },
    "COFFEE-18": { title: "อเมริกาโน่มะพร้าว", subtitle: "เมนูพิเศษเย็น" },
    "COFFEE-19": { title: "ลาเต้โอรีโอ้", subtitle: "เมนูหวานขายดี" },
    "COFFEE-20": { title: "ฮันนี่มิลค์ร้อน", subtitle: "นมหอมน้ำผึ้ง" },
    "COFFEE-21": { title: "ฮันนี่มิลค์เย็น", subtitle: "ดื่มง่าย สดชื่น" },
    "COFFEE-24": { title: "เพิ่มเมล็ดคั่วอ่อน", subtitle: "+10 บาท" },
    "COFFEE-25": { title: "เพิ่มน้ำผึ้ง", subtitle: "+10 บาท" },
    "FOOD-01": { title: "กะเพราหมูสับไข่ดาว", subtitle: "จานด่วน 70 บาท" },
    "FOOD-02": { title: "กะเพราไก่ไข่ดาว", subtitle: "จานด่วน 70 บาท" },
    "FOOD-03": { title: "ข้าวลาบหมูไข่ดาว", subtitle: "เมนูขายประจำ" },
    "FOOD-04": { title: "ข้าวลาบไก่ไข่ดาว", subtitle: "เมนูขายประจำ" },
    "FOOD-05": { title: "ข้าวผัดหมูไข่ดาว", subtitle: "จานเดียวพร้อมขาย" },
};

function getProductDisplayTitle(product: Product) {
    return product.name;
}

function getProductDisplaySubtitle(product: Product) {
    return product.tagline?.trim() || productDisplayLabelBySku[product.sku]?.subtitle || product.sku;
}

function getSellCategory(product: Product): Exclude<SellCategory, "ALL"> {
    return getPosSalesCategoryFromProduct(product);
}

function getDefaultPosCategory(productType: Product["product_type"], sku: string): PosEditorCategory {
    return getPosSalesCategoryFromProduct({ sku, product_type: productType, pos_category: null });
}

function normalizeSearchText(value: string) {
    return value.toLocaleLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
}

function buildProductSearchIndex(product: Product) {
    const sellCategory = getSellCategory(product);
    const membershipPeriod = product.membership_period ? membershipPeriodLabel[product.membership_period] : "";

    return normalizeSearchText(
        [
            getProductDisplayTitle(product),
            getProductDisplaySubtitle(product),
            product.name,
            product.tagline,
            product.sku,
            product.product_type,
            sellCategory,
            sellCategoryLabel[sellCategory],
            membershipPeriod,
        ].join(" "),
    );
}

export default function PosPage() {
    const adapter = useAppAdapter();
    const { activeShift, session } = useAuth();
    const canManagePosProducts = session?.role === "OWNER" || session?.role === "ADMIN";
    const cartLines = useAtomValue(cartLinesAtom);
    const cartSubtotal = useAtomValue(cartSubtotalAtom);
    const cartCount = useAtomValue(cartCountAtom);
    const addCartLine = useSetAtom(addCartLineAtom);
    const updateCartLine = useSetAtom(updateCartLineAtom);
    const removeCartLine = useSetAtom(removeCartLineAtom);
    const clearCart = useSetAtom(clearCartAtom);
    const setCartLineTrainer = useSetAtom(setCartLineTrainerAtom);

    const [products, setProducts] = useState<Product[]>([]);
    const [trainers, setTrainers] = useState<TrainerRecord[]>([]);
    const [query, setQuery] = useState("");
    const [productsLoading, setProductsLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [customerName, setCustomerName] = useState("");
    const [customerTaxId, setCustomerTaxId] = useState("");
    const [inventorySummary, setInventorySummary] = useState<ShiftInventorySummaryRow[]>([]);
    const [inventoryError, setInventoryError] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [postCheckoutWarning, setPostCheckoutWarning] = useState<string | null>(null);
    const [success, setSuccess] = useState<OrderResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [newProductType, setNewProductType] = useState<"GOODS" | "SERVICE">("GOODS");
    const [editSku, setEditSku] = useState("");
    const [editName, setEditName] = useState("");
    const [editTagline, setEditTagline] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editStockOnHand, setEditStockOnHand] = useState("");
    const [editPosCategory, setEditPosCategory] = useState<PosEditorCategory>("COUNTER");
    const [editFeaturedSlot, setEditFeaturedSlot] = useState<"" | `${FeaturedSlot}`>("");
    const [editorMessage, setEditorMessage] = useState<string | null>(null);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccountRecord[]>([]);
    const [revenueAccountsLoading, setRevenueAccountsLoading] = useState(true);
    const [revenueAccountsError, setRevenueAccountsError] = useState<string | null>(null);
    const [selectedRevenueAccountId, setSelectedRevenueAccountId] = useState("");
    const [selectedSellCategory, setSelectedSellCategory] = useState<SellCategory>("ALL");
    const [selectedSellProductId, setSelectedSellProductId] = useState("");

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
                name: getProductDisplayTitle(line),
                quantity: line.quantity,
                total: line.price * line.quantity,
            })),
        [cartLines],
    );

    const checkoutSummary = useMemo(
        () => ({
            lineCount: cartLines.length,
            itemCount: cartLines.reduce((sum, line) => sum + line.quantity, 0),
            subtotal: cartSubtotal,
        }),
        [cartLines, cartSubtotal],
    );
    const activeShiftId = activeShift?.shift_id ?? session?.active_shift_id ?? null;

    async function refreshProducts() {
        setProductsLoading(true);

        try {
            const result = await adapter.listProducts();
            setProducts(result);
        } finally {
            setProductsLoading(false);
        }
    }

    const refreshShiftInventory = useCallback(async () => {
        if (!activeShiftId) {
            setInventorySummary([]);
            setInventoryLoading(false);
            return;
        }

        setInventoryLoading(true);

        try {
            const result = await adapter.getShiftInventorySummary(activeShiftId);
            setInventorySummary(result);
            setInventoryError(null);
        } catch (error) {
            setInventorySummary([]);
            setInventoryError(getErrorMessage(error, "สรุปสต็อกในกะยังไม่พร้อมใช้งาน"));
        } finally {
            setInventoryLoading(false);
        }
    }, [activeShiftId, adapter]);

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
        let isActive = true;

        async function loadTrainers() {
            try {
                const result = await adapter.listTrainers();
                if (isActive) {
                    setTrainers(result);
                }
            } catch {
                // Trainers are optional, don't block POS
            }
        }

        void loadTrainers();

        return () => {
            isActive = false;
        };
    }, [adapter]);

    useEffect(() => {
        let isActive = true;

        async function loadChartOfAccounts() {
            setRevenueAccountsLoading(true);
            setRevenueAccountsError(null);

            try {
                const result = await adapter.listChartOfAccounts();
                if (isActive) {
                    setChartOfAccounts(result);
                }
            } catch (error) {
                if (isActive) {
                    setChartOfAccounts([]);
                    setRevenueAccountsError(getErrorMessage(error, "ไม่สามารถโหลดรายการบัญชีรายได้ได้"));
                }
            } finally {
                if (isActive) {
                    setRevenueAccountsLoading(false);
                }
            }
        }

        void loadChartOfAccounts();

        return () => {
            isActive = false;
        };
    }, [adapter]);

    useEffect(() => {
        void refreshShiftInventory();
    }, [refreshShiftInventory]);

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
        setEditTagline(selectedProduct.tagline ?? "");
        setEditPrice(String(selectedProduct.price));
        setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
        setEditPosCategory(getSellCategory(selectedProduct));
        setEditFeaturedSlot(selectedProduct.featured_slot ? String(selectedProduct.featured_slot) as `${FeaturedSlot}` : "");
        setSelectedRevenueAccountId(
            selectedProduct.revenue_account_id === undefined ? "" : String(selectedProduct.revenue_account_id),
        );
    }, [isCreateMode, selectedProduct]);

    useEffect(() => {
        if (isCreateMode) {
            setSelectedRevenueAccountId("");
        }
    }, [isCreateMode]);

    const filteredProducts = useMemo(() => {
        const normalizedQuery = normalizeSearchText(deferredQuery);

        if (!normalizedQuery) {
            return products;
        }

        return products.filter((product) => buildProductSearchIndex(product).includes(normalizedQuery));
    }, [deferredQuery, products]);

    const inventoryProducts = useMemo(
        () => filteredProducts.filter((product) => product.product_type !== "MEMBERSHIP"),
        [filteredProducts],
    );

    const membershipProducts = useMemo(
        () => filteredProducts.filter((product) => product.product_type === "MEMBERSHIP"),
        [filteredProducts],
    );

    const visibleSellProducts = useMemo(
        () =>
            selectedSellCategory === "ALL"
                ? filteredProducts
                : filteredProducts.filter((product) => getSellCategory(product) === selectedSellCategory),
        [filteredProducts, selectedSellCategory],
    );

    const selectedSellProduct = useMemo(
        () => visibleSellProducts.find((product) => String(product.product_id) === selectedSellProductId) ?? null,
        [selectedSellProductId, visibleSellProducts],
    );

    const featuredProducts = useMemo(
        () =>
            ([1, 2, 3, 4] as FeaturedSlot[]).map((slot) =>
                products.find((product) => product.featured_slot === slot) ?? null,
            ),
        [products],
    );

    useEffect(() => {
        if (!visibleSellProducts.some((product) => String(product.product_id) === selectedSellProductId)) {
            setSelectedSellProductId(visibleSellProducts[0] ? String(visibleSellProducts[0].product_id) : "");
        }
    }, [selectedSellProductId, visibleSellProducts]);

    const revenueAccounts = useMemo(
        () =>
            chartOfAccounts.filter(
                (account) => account.account_type === "REVENUE" && account.is_active,
            ),
        [chartOfAccounts],
    );

    const selectedRevenueAccount = useMemo(
        () =>
            chartOfAccounts.find(
                (account) => String(account.account_id) === selectedRevenueAccountId,
            ) ?? null,
        [chartOfAccounts, selectedRevenueAccountId],
    );

    const mappedRevenueAccount = useMemo(() => {
        if (!selectedProduct?.revenue_account_id) {
            return null;
        }

        return (
            chartOfAccounts.find(
                (account) => String(account.account_id) === String(selectedProduct.revenue_account_id),
            ) ?? null
        );
    }, [chartOfAccounts, selectedProduct]);

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
                handleOpenCheckoutConfirm();
            }
            return;
        }

        if (event.key === "Escape") {
            if (isCheckoutConfirmOpen) {
                event.preventDefault();
                setIsCheckoutConfirmOpen(false);
                return;
            }

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

        if (product.sku.startsWith("PT-") && currentQuantity >= 1) {
            setErrorMessage("บริการเทรนซื้อได้ครั้งละ 1 แพ็กเกจต่อรายการ");
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

        if (product.sku.startsWith("PT-") && nextQuantity > 1) {
            setErrorMessage("บริการเทรนซื้อได้ครั้งละ 1 แพ็กเกจต่อรายการ");
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
                const createdProduct = await adapter.createProduct({
                    sku: editSku,
                    name: editName,
                    tagline: editTagline || null,
                    price: parsedPrice,
                    productType: newProductType,
                    posCategory: editPosCategory,
                    featuredSlot: editFeaturedSlot ? Number(editFeaturedSlot) as FeaturedSlot : null,
                    revenueAccountId: selectedRevenueAccountId || undefined,
                    stockOnHand: newProductType === "GOODS" ? parsedStockOnHand : null,
                });
                setSelectedProductId(String(createdProduct.product_id));
            } else if (selectedProduct) {
                const updatedProduct = await adapter.updateProduct({
                    productId: selectedProduct.product_id,
                    sku: editSku,
                    name: editName,
                    tagline: editTagline || null,
                    price: parsedPrice,
                    posCategory: editPosCategory,
                    featuredSlot: editFeaturedSlot ? Number(editFeaturedSlot) as FeaturedSlot : null,
                    revenueAccountId: selectedRevenueAccountId || undefined,
                    stockOnHand: selectedProduct.track_stock ? parsedStockOnHand : null,
                });
                setSelectedProductId(String(updatedProduct.product_id));
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
            const errorCode = getErrorCode(error);
            const validationErrorMessage = getValidationErrorMessage(error);
            if (errorCode === "REVENUE_ACCOUNT_NOT_FOUND") {
                setEditorError("ไม่พบบัญชีรายได้ที่เลือก กรุณารีเฟรชรายการบัญชีก่อนลองใหม่");
            } else if (errorCode === "REVENUE_ACCOUNT_INACTIVE") {
                setEditorError("บัญชีรายได้ที่เลือกถูกปิดใช้งานอยู่ กรุณาเลือกบัญชีที่ยัง active");
            } else if (errorCode === "INVALID_REVENUE_ACCOUNT_TYPE") {
                setEditorError("บัญชีที่เลือกไม่ใช่หมวดรายได้ จึงไม่สามารถผูกกับสินค้าได้");
            } else if (errorCode === "INVALID_POS_CATEGORY") {
                setEditorError("หมวดขาย POS ที่เลือกไม่ถูกต้อง");
            } else if (errorCode === "INVALID_FEATURED_SLOT") {
                setEditorError("ตำแหน่งสินค้าปักหมุดต้องอยู่ระหว่าง 1 ถึง 4 เท่านั้น");
            } else if (errorCode === "VALIDATION_ERROR" && validationErrorMessage) {
                setEditorError(validationErrorMessage);
            } else {
                setEditorError(getErrorMessage(error, isCreateMode ? "ไม่สามารถสร้างสินค้าได้" : "ไม่สามารถอัปเดตสินค้าได้"));
            }
        } finally {
            setIsSavingProduct(false);
        }
    }

    function getCheckoutValidationError() {
        if (!activeShiftId) {
            return "กรุณาเปิดกะก่อนคิดเงิน";
        }

        if (cartLines.length === 0) {
            return "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ";
        }

        if (containsMembership && !customerName.trim()) {
            return "บิลสมาชิกต้องระบุชื่อลูกค้าเพื่อใช้กำหนดวันเริ่มและวันหมดอายุ";
        }

        const ptWithoutTrainer = cartLines.find((line) => {
            const product = productById.get(line.product_id);
            return product?.sku.startsWith("PT-") && !line.trainer_id;
        });

        if (ptWithoutTrainer) {
            return "กรุณาเลือกเทรนเนอร์ให้ครบทุกรายการบริการเทรน";
        }

        const invalidStockLine = cartLines.find((line) => {
            const product = productById.get(line.product_id);
            return Boolean(product?.track_stock && typeof product.stock_on_hand === "number" && line.quantity > product.stock_on_hand);
        });

        if (invalidStockLine) {
            const product = productById.get(invalidStockLine.product_id)!;
            return `สต็อก ${product.name} คงเหลือ ${product.stock_on_hand} ชิ้น`;
        }

        return null;
    }

    function handleOpenCheckoutConfirm() {
        const validationError = getCheckoutValidationError();

        if (validationError) {
            setIsCheckoutConfirmOpen(false);
            setErrorMessage(validationError);
            return;
        }

        setErrorMessage(null);
        setPostCheckoutWarning(null);
        setSuccess(null);
        setIsCheckoutConfirmOpen(true);
    }

    async function handleCheckout() {
        const validationError = getCheckoutValidationError();

        if (validationError) {
            setIsCheckoutConfirmOpen(false);
            setErrorMessage(validationError);
            return;
        }

        if (activeShiftId == null) {
            setIsCheckoutConfirmOpen(false);
            setErrorMessage("กรุณาเปิดกะก่อนคิดเงิน");
            return;
        }

        setErrorMessage(null);
        setPostCheckoutWarning(null);
        setSuccess(null);
        setIsSubmitting(true);
        setIsCheckoutConfirmOpen(false);

        try {
            const result = await adapter.createOrder({
                shift_id: activeShiftId,
                items: cartLines.map((line) => ({
                    product_id: line.product_id,
                    quantity: line.quantity,
                    ...(line.trainer_id ? { trainer_id: line.trainer_id } : {}),
                })),
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
            const errorCode = getErrorCode(error);
            if (errorCode === "SHIFT_OWNER_MISMATCH") {
                setErrorMessage("session กับกะปัจจุบันไม่ตรงกัน กรุณาเข้าสู่ระบบใหม่หรือเปิดกะใหม่ก่อนคิดเงิน");
            } else if (errorCode === "SHIFT_NOT_OPEN" || errorCode === "SHIFT_NOT_FOUND") {
                setErrorMessage("ไม่พบกะเปิดที่ใช้งานได้ กรุณาตรวจสอบหน้าเปิดกะแล้วลองใหม่");
            } else if (errorCode === "PRODUCT_NOT_FOUND") {
                setErrorMessage("มีสินค้าบางรายการไม่พร้อมขายแล้ว กรุณารีเฟรชรายการสินค้าและเลือกใหม่");
            } else if (errorCode === "INSUFFICIENT_STOCK") {
                setErrorMessage("สต็อกสินค้าไม่พอสำหรับบิลนี้ กรุณาปรับจำนวนก่อนคิดเงิน");
            } else if (errorCode === "TRAINER_REQUIRED") {
                setErrorMessage("บริการเทรนต้องระบุเทรนเนอร์ กรุณาเลือกเทรนเนอร์ให้ครบทุกรายการ");
            } else if (errorCode === "TRAINER_NOT_FOUND") {
                setErrorMessage("ไม่พบเทรนเนอร์ที่เลือก กรุณาเลือกใหม่");
            } else if (errorCode === "TRAINING_SINGLE_QUANTITY") {
                setErrorMessage("บริการเทรนซื้อได้ครั้งละ 1 แพ็กเกจต่อรายการ");
            } else if (errorCode === "UNAUTHENTICATED") {
                setErrorMessage("session หมดอายุ กรุณาเข้าสู่ระบบใหม่ก่อนคิดเงิน");
            } else {
                setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างรายการขายได้"));
            }
            return;
        }

        try {
            await Promise.all([refreshProducts(), refreshShiftInventory()]);
        } catch (error) {
            const refreshMessage = getErrorMessage(error, "รีเฟรชข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง");
            setPostCheckoutWarning(
                `บันทึกรายการขายสำเร็จแล้ว แต่${refreshMessage}`,
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ShiftGuard>
            <div className="grid gap-6 xl:min-h-0 xl:grid-cols-[minmax(0,1.42fr)_minmax(360px,0.78fr)] xl:items-stretch xl:overflow-hidden xl:[height:calc(100vh-8rem)]">
                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8 xl:min-h-0 xl:overflow-y-auto">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted">จุดขายหน้าร้าน</p>
                            <h1 className="mt-3 text-3xl font-semibold text-foreground">เคาน์เตอร์ขาย LA GYM</h1>
                        </div>
                        <div className="rounded-[20px] bg-accent-soft px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted">จำนวนรายการในตะกร้า</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{cartCount}</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,0.95fr)]">
                        <input
                            ref={searchInputRef}
                            aria-label="Product search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="ค้นหาจากชื่อเมนู รหัสสินค้า หรือหมวดขาย"
                            className="min-w-0 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent md:col-span-2 2xl:col-span-1"
                        />
                        <select
                            aria-label="เลือกหมวดสินค้า"
                            value={selectedSellCategory}
                            onChange={(event) => setSelectedSellCategory(event.target.value as SellCategory)}
                            className="min-w-0 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                        >
                            {(Object.keys(sellCategoryLabel) as SellCategory[]).map((category) => (
                                <option key={category} value={category}>
                                    {sellCategoryLabel[category]}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="เลือกรายการขาย"
                            value={selectedSellProductId}
                            onChange={(event) => setSelectedSellProductId(event.target.value)}
                            className="min-w-0 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent md:col-span-2 2xl:col-span-1"
                        >
                            {visibleSellProducts.length === 0 ? <option value="">ไม่พบรายการสินค้า</option> : null}
                            {visibleSellProducts.map((product) => (
                                <option key={product.product_id} value={String(product.product_id)}>
                                    {getProductDisplayTitle(product)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="mt-4 text-sm text-muted">เลือกหมวดสินค้าแบบง่าย ๆ จาก drop-down แล้วเลือกรายการที่ต้องการก่อนกดเพิ่มลงบิล</p>

                    <section className="mt-6 rounded-3xl border border-line/80 bg-background/60 p-5 md:p-6">
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted">สินค้าปักหมุดขายดี</p>
                                <h2 className="mt-2 text-2xl font-semibold text-foreground">กดเลือกได้ทันที 4 ช่อง</h2>
                            </div>
                            <p className="text-sm text-muted">ตั้งค่าจากฟอร์มด้านล่างเพื่อให้หน้าเคาน์เตอร์หยิบสินค้าเร็วขึ้น</p>
                        </div>

                        <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                            {featuredProducts.map((product, index) => {
                                const slot = index + 1 as FeaturedSlot;
                                const isOutOfStock = Boolean(
                                    product?.track_stock && typeof product.stock_on_hand === "number" && product.stock_on_hand <= 0,
                                );

                                return (
                                    <article key={slot} className="rounded-[24px] border border-line bg-[#161510] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-foreground">ช่อง {slot}</span>
                                            {product ? <span className="text-xs text-muted">{sellCategoryLabel[getSellCategory(product)]}</span> : null}
                                        </div>

                                        {product ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSellProductId(String(product.product_id))}
                                                    className="mt-4 block text-left text-lg font-semibold text-[#f3e8ba] transition hover:text-accent"
                                                >
                                                    {getProductDisplayTitle(product)}
                                                </button>
                                                <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{getProductDisplaySubtitle(product)}</p>
                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-lg font-semibold text-[#f3e8ba]">{formatCurrency(product.price)}</p>
                                                        <p className="mt-1 text-xs text-muted">{product.track_stock ? `คงเหลือ ${product.stock_on_hand ?? 0}` : "บริการ"}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddProduct(product)}
                                                        disabled={isOutOfStock}
                                                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        เพิ่มลงบิล
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="mt-4 rounded-[20px] border border-dashed border-line bg-background px-4 py-6 text-sm leading-6 text-muted">
                                                ยังไม่มีสินค้าปักหมุดในช่องนี้
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    {productsLoading ? (
                        <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                            กำลังโหลดสินค้า...
                        </div>
                    ) : (
                        <div className="mt-6 space-y-6 xl:space-y-7">
                            {selectedSellProduct ? (
                                <section className="rounded-3xl border border-line/80 bg-background/60 p-5 md:p-6">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-muted">รายการที่เลือก</p>
                                            <h2 className="mt-2 text-2xl font-semibold text-foreground">{getProductDisplayTitle(selectedSellProduct)}</h2>
                                            <p className="mt-2 text-sm leading-6 text-muted">{getProductDisplaySubtitle(selectedSellProduct)}</p>
                                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                                                <span className="rounded-full bg-accent-soft px-3 py-1 text-foreground">{sellCategoryLabel[getSellCategory(selectedSellProduct)]}</span>
                                                <span className="rounded-full border border-line px-3 py-1 text-foreground">{selectedSellProduct.sku}</span>
                                                {selectedSellProduct.featured_slot ? (
                                                    <span className="rounded-full border border-accent px-3 py-1 text-foreground">ปักหมุดช่อง {selectedSellProduct.featured_slot}</span>
                                                ) : null}
                                                <span className="rounded-full border border-line px-3 py-1 text-foreground">
                                                    {selectedSellProduct.track_stock ? `คงเหลือ ${selectedSellProduct.stock_on_hand ?? 0}` : "บริการ"}
                                                </span>
                                            </div>
                                            {selectedSellProduct.product_type === "MEMBERSHIP" ? (
                                                <p className="mt-4 text-sm leading-6 text-muted">เริ่มวันนี้ หมดอายุ {getProjectedMembershipEndDate(selectedSellProduct)}</p>
                                            ) : null}
                                        </div>
                                        <div className="min-w-[220px] rounded-[24px] border border-line bg-[#161510] p-5">
                                            <p className="text-sm text-muted">ราคา</p>
                                            <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(selectedSellProduct.price)}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleAddProduct(selectedSellProduct)}
                                                disabled={Boolean(selectedSellProduct.track_stock && typeof selectedSellProduct.stock_on_hand === "number" && selectedSellProduct.stock_on_hand <= 0)}
                                                className="mt-5 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                เพิ่มลงบิล
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            ) : null}

                            <section className="overflow-hidden rounded-3xl border border-line/80 bg-background/60 p-5 md:p-6">
                                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-muted">รายการสินค้าตามเงื่อนไขที่เลือก</p>
                                        <h2 className="mt-2 text-2xl font-semibold text-foreground">ค้นหาเร็วและกดเพิ่มได้จากรายการเดียว</h2>
                                    </div>
                                    <p className="text-sm text-muted">พบ {visibleSellProducts.length} รายการ</p>
                                </div>

                                {visibleSellProducts.length > 0 ? (
                                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                        {visibleSellProducts.map((product) => {
                                            const isOutOfStock = Boolean(
                                                product.track_stock && typeof product.stock_on_hand === "number" && product.stock_on_hand <= 0,
                                            );

                                            return (
                                                <article
                                                    key={product.product_id}
                                                    className={`rounded-[24px] border p-4 transition ${String(product.product_id) === selectedSellProductId ? "border-accent bg-accent-soft/10" : "border-line bg-[#161510]"}`}
                                                >
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                                                <span className="rounded-full bg-accent-soft px-3 py-1 text-foreground">{sellCategoryLabel[getSellCategory(product)]}</span>
                                                                <span className="rounded-full border border-line px-3 py-1 text-foreground">{product.sku}</span>
                                                                {product.featured_slot ? <span className="rounded-full border border-accent px-3 py-1 text-foreground">ช่อง {product.featured_slot}</span> : null}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedSellProductId(String(product.product_id))}
                                                                className="mt-3 block text-left text-lg font-semibold text-[#f3e8ba] transition hover:text-accent"
                                                            >
                                                                {getProductDisplayTitle(product)}
                                                            </button>
                                                            <p className="mt-2 text-sm leading-6 text-muted">{getProductDisplaySubtitle(product)}</p>
                                                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#f3e8ba]">
                                                                <span>{product.track_stock ? `คงเหลือ ${product.stock_on_hand ?? 0}` : "บริการ"}</span>
                                                                {product.product_type === "MEMBERSHIP" ? <span>หมดอายุ {getProjectedMembershipEndDate(product)}</span> : null}
                                                            </div>
                                                        </div>
                                                        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                                                            <p className="text-2xl font-semibold text-[#f3e8ba]">{formatCurrency(product.price)}</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddProduct(product)}
                                                                disabled={isOutOfStock}
                                                                className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                เพิ่มลงบิล
                                                            </button>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                                        ไม่พบรายการที่ตรงกับคำค้นหรือหมวดที่เลือก
                                    </div>
                                )}
                            </section>

                            {canManagePosProducts ? (
                                <section className="rounded-3xl border border-line bg-background/70 p-5 md:p-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-muted">จัดการสินค้าในหน้าใหม่</p>
                                            <h2 className="mt-2 text-2xl font-semibold text-foreground">แยกหน้าคลังสินค้า POS เพื่อดูตารางสินค้าและเติมสต็อกได้ง่ายขึ้น</h2>
                                            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                                                หน้าใหม่จะแยกสินค้าตามหมวดในรูปแบบตาราง และมีฟอร์มเติมสต็อกจากยอดเดิม เช่น เหลือ 3 ชิ้น เติมเพิ่ม 10 ชิ้น แล้วบันทึกเป็น 13 ชิ้นพร้อมประวัติการเติม
                                            </p>
                                        </div>
                                        <Link
                                            href="/pos/products"
                                            className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                                        >
                                            ไปหน้าจัดการสินค้า
                                        </Link>
                                    </div>
                                </section>
                            ) : null}

                            <section className="hidden rounded-3xl border border-line bg-background/70 p-5 md:p-6">
                                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-muted">จัดการสินค้าใน POS</p>
                                        <h2 className="mt-2 text-2xl font-semibold text-foreground">เพิ่มสินค้าใหม่ หรือแก้ไขชื่อ ราคา หมวด คำโปรย SKU สต็อก และปักหมุด</h2>
                                    </div>
                                    <p className="text-sm text-muted">สินค้าที่ติดตามสต็อกจะอัปเดตยอดคงเหลือและสรุปในกะทันทีหลังบันทึก</p>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreateMode(true);
                                            setNewProductType("GOODS");
                                            setEditSku("");
                                            setEditName("");
                                            setEditTagline("");
                                            setEditPrice("");
                                            setEditStockOnHand("0");
                                            setEditPosCategory(getDefaultPosCategory("GOODS", ""));
                                            setEditFeaturedSlot("");
                                            setSelectedRevenueAccountId("");
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
                                                setEditTagline(selectedProduct.tagline ?? "");
                                                setEditPrice(String(selectedProduct.price));
                                                setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
                                                setEditPosCategory(getSellCategory(selectedProduct));
                                                setEditFeaturedSlot(selectedProduct.featured_slot ? String(selectedProduct.featured_slot) as `${FeaturedSlot}` : "");
                                                setSelectedRevenueAccountId(
                                                    selectedProduct.revenue_account_id === undefined
                                                        ? ""
                                                        : String(selectedProduct.revenue_account_id),
                                                );
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
                                                onChange={(event) => {
                                                    const nextProductType = event.target.value as "GOODS" | "SERVICE";
                                                    setNewProductType(nextProductType);
                                                    setEditPosCategory(getDefaultPosCategory(nextProductType, editSku));
                                                }}
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
                                        <span className="text-sm font-medium text-foreground">สต็อกคงเหลือ</span>
                                        <input
                                            aria-label="สต็อกคงเหลือ"
                                            inputMode="numeric"
                                            value={editStockOnHand}
                                            onChange={(event) => setEditStockOnHand(event.target.value)}
                                            disabled={isCreateMode ? newProductType !== "GOODS" : !selectedProduct?.track_stock}
                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent disabled:opacity-50"
                                        />
                                    </label>
                                </div>

                                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
                                    <label className="block">
                                        <span className="text-sm font-medium text-foreground">คำโปรยสินค้า</span>
                                        <input
                                            aria-label="คำโปรยสินค้า"
                                            value={editTagline}
                                            onChange={(event) => setEditTagline(event.target.value)}
                                            placeholder="เช่น เครื่องดื่มโปรตีนพร้อมขาย หรือ แพ็กเกจยอดนิยม"
                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-medium text-foreground">หมวดขาย POS</span>
                                        <select
                                            aria-label="หมวดขาย POS"
                                            value={editPosCategory}
                                            onChange={(event) => setEditPosCategory(event.target.value as PosEditorCategory)}
                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                        >
                                            {(Object.keys(POS_CATEGORY_LABEL) as PosEditorCategory[]).map((category) => (
                                                <option key={category} value={category}>
                                                    {POS_CATEGORY_LABEL[category]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-medium text-foreground">ปักหมุดขายดี</span>
                                        <select
                                            aria-label="ปักหมุดขายดี"
                                            value={editFeaturedSlot}
                                            onChange={(event) => setEditFeaturedSlot(event.target.value as "" | `${FeaturedSlot}`)}
                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                        >
                                            {featuredSlotChoices.map((choice) => (
                                                <option key={choice.label} value={choice.value}>
                                                    {choice.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="mt-4 rounded-[24px] border border-line bg-background/70 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">บัญชีรายได้</p>
                                            <p className="mt-1 text-sm leading-6 text-muted">
                                                ผูกสินค้าเข้ากับหมวดรายได้ เพื่อให้ระบบบันทึกรายได้แยกตามสินค้าได้ตรงตามการตั้งค่า
                                            </p>
                                        </div>
                                        {selectedRevenueAccount ? (
                                            <div className="rounded-[18px] bg-accent-soft px-4 py-3 text-sm text-foreground">
                                                {selectedRevenueAccount.account_code} · {selectedRevenueAccount.account_name}
                                            </div>
                                        ) : null}
                                    </div>

                                    <label className="mt-4 block">
                                        <span className="text-sm font-medium text-foreground">เลือกบัญชีรายได้</span>
                                        <select
                                            aria-label="เลือกบัญชีรายได้"
                                            value={selectedRevenueAccountId}
                                            onChange={(event) => setSelectedRevenueAccountId(event.target.value)}
                                            disabled={revenueAccountsLoading}
                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent disabled:opacity-60"
                                        >
                                            <option value="">ใช้บัญชีรายได้หลักของระบบ</option>
                                            {revenueAccounts.map((account) => (
                                                <option key={account.account_id} value={String(account.account_id)}>
                                                    {account.account_code} · {account.account_name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    {revenueAccountsLoading ? (
                                        <div className="mt-4 rounded-[18px] border border-dashed border-line bg-[#161510] px-4 py-3 text-sm text-muted">
                                            กำลังโหลดตัวเลือกบัญชีรายได้...
                                        </div>
                                    ) : null}

                                    {revenueAccountsError ? (
                                        <div className="mt-4 rounded-[18px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                                            โหลดบัญชีรายได้ไม่สำเร็จ แต่ยังแก้ไข SKU ชื่อ ราคา และสต็อกได้ตามปกติ
                                            <div className="mt-1">{revenueAccountsError}</div>
                                        </div>
                                    ) : null}

                                    {!revenueAccountsLoading && !revenueAccountsError && revenueAccounts.length === 0 ? (
                                        <div className="mt-4 rounded-[18px] border border-dashed border-line bg-[#161510] px-4 py-3 text-sm text-muted">
                                            ยังไม่มีบัญชีรายได้ที่เปิดใช้งานให้เลือก หากบันทึกตอนนี้ระบบจะใช้บัญชีรายได้หลักที่ตั้งค่าไว้
                                        </div>
                                    ) : null}

                                    {!isCreateMode && mappedRevenueAccount && !mappedRevenueAccount.is_active ? (
                                        <div className="mt-4 rounded-[18px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                                            สินค้านี้เคยผูกกับบัญชี {mappedRevenueAccount.account_code} · {mappedRevenueAccount.account_name} ซึ่งตอนนี้ inactive อยู่
                                            กรุณาเลือกบัญชีใหม่ก่อนบันทึกเพื่อหลีกเลี่ยงข้อผิดพลาดระหว่างบันทึกข้อมูล
                                        </div>
                                    ) : null}

                                    {!isCreateMode && selectedProduct?.revenue_account_id && !mappedRevenueAccount ? (
                                        <div className="mt-4 rounded-[18px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                                            ไม่พบข้อมูลบัญชีรายได้ที่เคยผูกอยู่ในรายการ COA ปัจจุบัน กรุณาเลือกบัญชีใหม่ก่อนบันทึก
                                        </div>
                                    ) : null}
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
                                                setEditTagline("");
                                                setEditPrice("");
                                                setEditStockOnHand(newProductType === "GOODS" ? "0" : "");
                                                setEditPosCategory(getDefaultPosCategory(newProductType, ""));
                                                setEditFeaturedSlot("");
                                                setSelectedRevenueAccountId("");
                                            } else if (selectedProduct) {
                                                setEditSku(selectedProduct.sku);
                                                setEditName(selectedProduct.name);
                                                setEditTagline(selectedProduct.tagline ?? "");
                                                setEditPrice(String(selectedProduct.price));
                                                setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
                                                setEditPosCategory(getSellCategory(selectedProduct));
                                                setEditFeaturedSlot(selectedProduct.featured_slot ? String(selectedProduct.featured_slot) as `${FeaturedSlot}` : "");
                                                setSelectedRevenueAccountId(
                                                    selectedProduct.revenue_account_id === undefined
                                                        ? ""
                                                        : String(selectedProduct.revenue_account_id),
                                                );
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

                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8 xl:min-h-0 xl:overflow-y-auto">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">ตะกร้าและการคิดเงิน</p>
                    <div className="mt-4 space-y-3">
                        {cartLines.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-line bg-background/70 p-6 text-sm leading-7 text-muted">
                                ตะกร้ายังว่างอยู่ เพิ่มสินค้าจากฝั่งซ้ายเพื่อทดสอบจำนวน, วิธีชำระเงิน และสถานะการ checkout
                            </div>
                        ) : (
                            cartLines.map((line) => {
                                const lineProduct = productById.get(line.product_id);
                                const isPtLine = lineProduct?.sku.startsWith("PT-") ?? false;

                                return (
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

                                        {isPtLine ? (
                                            <div className="mt-3">
                                                <label className="block text-xs font-semibold text-muted">เทรนเนอร์</label>
                                                <select
                                                    aria-label="เลือกเทรนเนอร์"
                                                    value={line.trainer_id ?? ""}
                                                    onChange={(event) => {
                                                        const selectedTrainer = trainers.find((t) => t.trainer_id === event.target.value);
                                                        setCartLineTrainer({
                                                            productId: line.product_id,
                                                            trainerId: event.target.value || undefined,
                                                            trainerName: selectedTrainer?.full_name,
                                                        });
                                                    }}
                                                    className="mt-1 w-full rounded-[14px] border border-line bg-[#fff8de] px-3 py-2 text-sm text-[#17130a] outline-none transition focus:border-accent"
                                                >
                                                    <option value="">-- เลือกเทรนเนอร์ --</option>
                                                    {trainers.filter((t) => t.is_active).map((trainer) => (
                                                        <option key={trainer.trainer_id} value={trainer.trainer_id}>
                                                            {trainer.nickname ? `${trainer.full_name} (${trainer.nickname})` : trainer.full_name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {line.trainer_name ? (
                                                    <p className="mt-1 text-xs text-accent">เทรนเนอร์: {line.trainer_name}</p>
                                                ) : (
                                                    <p className="mt-1 text-xs text-warning">กรุณาเลือกเทรนเนอร์</p>
                                                )}
                                            </div>
                                        ) : null}

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
                                );
                            })
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

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
                                onClick={handleOpenCheckoutConfirm}
                                disabled={isSubmitting || cartLines.length === 0}
                                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "กำลังส่งรายการ..." : "คิดเงิน"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-line bg-background/70 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-sm text-muted">สรุปสต็อกในกะ</p>
                                <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground sm:text-2xl">มีเท่าไหร่ ขายไปกี่ชิ้น คงเหลือเท่าไร</h2>
                            </div>
                            <p className="max-w-md text-sm leading-6 text-muted">สรุปนี้จะอัปเดตทันทีเมื่อแก้สต็อกหรือกดขายสินค้าในกะปัจจุบัน</p>
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
                                <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                                    <div className="h-full rounded-[22px] border border-line bg-[#161510] p-4">
                                        <p className="text-xs font-semibold text-muted">สต็อกตั้งต้นรวม</p>
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

                                <div className="mt-4 rounded-3xl border border-line bg-[#161510] p-3">
                                    <div className="mb-3 text-xs leading-5 text-muted">เลื่อนซ้ายขวาเพื่อดูข้อมูลสต็อกให้ครบทุกคอลัมน์</div>
                                    <div className="overflow-x-auto overscroll-x-contain pb-2">
                                        <table className="min-w-[620px] divide-y divide-line text-sm">
                                            <thead className="bg-[#0d0d0a]">
                                                <tr>
                                                    <th className="min-w-[160px] px-4 py-3 text-left font-semibold text-muted">สินค้า</th>
                                                    <th className="min-w-[108px] px-4 py-3 text-left font-semibold text-muted">SKU</th>
                                                    <th className="min-w-[72px] px-4 py-3 text-left font-semibold text-muted">มีในกะ</th>
                                                    <th className="min-w-[72px] px-4 py-3 text-left font-semibold text-muted">ขายไป</th>
                                                    <th className="min-w-[84px] px-4 py-3 text-left font-semibold text-muted">คงเหลือ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                                {inventorySummary.map((row) => (
                                                    <tr key={row.product_id} aria-label={`Inventory ${row.name}`}>
                                                        <td className="px-4 py-4 align-top text-[#f3e8ba]">{row.name}</td>
                                                        <td className="px-4 py-4 align-top text-[#f3e8ba] break-all">{row.sku}</td>
                                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{row.opening_stock}</td>
                                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{row.sold_quantity}</td>
                                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{row.remaining_stock}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                                ยังไม่มีข้อมูลสต็อกสำหรับกะนี้
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

                    {postCheckoutWarning ? (
                        <div className="mt-5 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                            {postCheckoutWarning}
                        </div>
                    ) : null}

                </section>

                {isCheckoutConfirmOpen ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
                        <div className="w-full max-w-2xl rounded-[28px] border border-line bg-[#12110d] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-8">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-muted">ยืนยันการคิดเงิน</p>
                                    <h2 className="mt-2 text-3xl font-semibold text-foreground">ตรวจสอบรายการก่อนบันทึกบิล</h2>
                                    <p className="mt-3 text-sm leading-6 text-muted">ตรวจสอบสินค้า จำนวน วิธีรับชำระ และข้อมูลลูกค้าอีกครั้งก่อนยืนยัน</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCheckoutConfirmOpen(false)}
                                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                >
                                    ปิด
                                </button>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <div className="rounded-[22px] border border-line bg-background/70 p-4">
                                    <p className="text-xs text-muted">จำนวนรายการ</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{checkoutSummary.lineCount}</p>
                                </div>
                                <div className="rounded-[22px] border border-line bg-background/70 p-4">
                                    <p className="text-xs text-muted">จำนวนชิ้นรวม</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{checkoutSummary.itemCount}</p>
                                </div>
                                <div className="rounded-[22px] border border-line bg-background/70 p-4">
                                    <p className="text-xs text-muted">ยอดรวมย่อย</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(checkoutSummary.subtotal)}</p>
                                </div>
                            </div>

                            <div className="mt-5 rounded-[24px] border border-line bg-background/70 p-5">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <p className="text-sm font-semibold text-foreground">ข้อมูลการรับชำระ</p>
                                    <p className="text-sm text-muted">{paymentMethodLabel[paymentMethod]}</p>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-[18px] bg-[#161510] px-4 py-3 text-sm text-foreground">
                                        <p className="text-xs text-muted">ลูกค้า</p>
                                        <p className="mt-1">{customerName.trim() || "ลูกค้าทั่วไป"}</p>
                                    </div>
                                    <div className="rounded-[18px] bg-[#161510] px-4 py-3 text-sm text-foreground">
                                        <p className="text-xs text-muted">เลขผู้เสียภาษี</p>
                                        <p className="mt-1">{customerTaxId.trim() || "ไม่ระบุ"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                                {cartSummaryRows.map((row) => (
                                    <div key={row.productId} className="flex items-start justify-between gap-3 rounded-[20px] border border-line bg-[#161510] px-4 py-4 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-foreground">{row.name}</p>
                                            <p className="mt-1 text-muted">จำนวน {row.quantity} ชิ้น</p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-foreground">{formatCurrency(row.total)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsCheckoutConfirmOpen(false)}
                                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-warning hover:bg-warning-soft"
                                >
                                    กลับไปแก้รายการ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleCheckout()}
                                    disabled={isSubmitting}
                                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting ? "กำลังบันทึกรายการ..." : "ยืนยันการคิดเงิน"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </ShiftGuard>
    );
}