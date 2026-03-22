"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { ChartOfAccountRecord, Product, ProductStockAdjustmentRecord } from "@/lib/contracts";
import { POS_CATEGORY_LABEL, getPosSalesCategoryFromProduct } from "@/lib/pos-categories";
import { formatCurrency, formatDateTime, getErrorCode, getErrorMessage } from "@/lib/utils";

type SellCategory = "ALL" | keyof typeof POS_CATEGORY_LABEL;
type PosEditorCategory = Exclude<SellCategory, "ALL">;
type FeaturedSlot = 1 | 2 | 3 | 4;
type EditableProductType = "GOODS" | "SERVICE";
type InlineRestockDraft = {
    quantity: string;
    note: string;
};
type InlineRestockFeedback = {
    tone: "error" | "success";
    message: string;
};

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

function normalizeSearchText(value: string) {
    return value.toLocaleLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
}

function getSellCategory(product: Product): PosEditorCategory {
    return getPosSalesCategoryFromProduct(product);
}

function getDefaultPosCategory(productType: Product["product_type"], sku: string): PosEditorCategory {
    return getPosSalesCategoryFromProduct({ sku, product_type: productType, pos_category: null });
}

function buildProductSearchIndex(product: Product) {
    const sellCategory = getSellCategory(product);

    return normalizeSearchText(
        [
            product.name,
            product.tagline,
            product.sku,
            product.product_type,
            sellCategory,
            sellCategoryLabel[sellCategory],
        ].join(" "),
    );
}

export default function PosProductsPage() {
    const adapter = useAppAdapter();
    const { session } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<SellCategory>("ALL");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [newProductType, setNewProductType] = useState<EditableProductType>("GOODS");
    const [editSku, setEditSku] = useState("");
    const [editName, setEditName] = useState("");
    const [editTagline, setEditTagline] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editStockOnHand, setEditStockOnHand] = useState("");
    const [editPosCategory, setEditPosCategory] = useState<PosEditorCategory>("COUNTER");
    const [editFeaturedSlot, setEditFeaturedSlot] = useState<"" | `${FeaturedSlot}`>("");
    const [selectedRevenueAccountId, setSelectedRevenueAccountId] = useState("");
    const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccountRecord[]>([]);
    const [revenueAccountsLoading, setRevenueAccountsLoading] = useState(true);
    const [revenueAccountsError, setRevenueAccountsError] = useState<string | null>(null);
    const [editorMessage, setEditorMessage] = useState<string | null>(null);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [adjustments, setAdjustments] = useState<ProductStockAdjustmentRecord[]>([]);
    const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
    const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
    const [activeRestockProductId, setActiveRestockProductId] = useState("");
    const [inlineRestockDrafts, setInlineRestockDrafts] = useState<Record<string, InlineRestockDraft>>({});
    const [inlineRestockFeedback, setInlineRestockFeedback] = useState<Record<string, InlineRestockFeedback>>({});
    const [restockingProductId, setRestockingProductId] = useState<string | null>(null);

    const selectedProduct = useMemo(
        () => products.find((product) => String(product.product_id) === selectedProductId) ?? null,
        [products, selectedProductId],
    );

    const revenueAccounts = useMemo(
        () => chartOfAccounts.filter((account) => account.account_type === "REVENUE" && account.is_active),
        [chartOfAccounts],
    );

    const selectedRevenueAccount = useMemo(
        () => chartOfAccounts.find((account) => String(account.account_id) === selectedRevenueAccountId) ?? null,
        [chartOfAccounts, selectedRevenueAccountId],
    );

    const mappedRevenueAccount = useMemo(() => {
        if (!selectedProduct?.revenue_account_id) {
            return null;
        }

        return chartOfAccounts.find((account) => String(account.account_id) === String(selectedProduct.revenue_account_id)) ?? null;
    }, [chartOfAccounts, selectedProduct]);

    const filteredProducts = useMemo(() => {
        const normalizedQuery = normalizeSearchText(query);

        return products.filter((product) => {
            if (selectedCategory !== "ALL" && getSellCategory(product) !== selectedCategory) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return buildProductSearchIndex(product).includes(normalizedQuery);
        });
    }, [products, query, selectedCategory]);

    const categorySections = useMemo(
        () =>
            (Object.keys(POS_CATEGORY_LABEL) as PosEditorCategory[])
                .map((category) => ({
                    category,
                    products: filteredProducts.filter((product) => getSellCategory(product) === category),
                }))
                .filter((section) => section.products.length > 0),
        [filteredProducts],
    );

    const trackedProducts = useMemo(() => products.filter((product) => product.track_stock), [products]);
    const lowStockProducts = useMemo(
        () => trackedProducts.filter((product) => (product.stock_on_hand ?? 0) <= 5),
        [trackedProducts],
    );

    const refreshProducts = useCallback(async () => {
        setProductsLoading(true);

        try {
            const result = await adapter.listProducts();
            setProducts(result);
        } finally {
            setProductsLoading(false);
        }
    }, [adapter]);

    const refreshAdjustments = useCallback(async (productId?: string) => {
        if (!productId) {
            setAdjustments([]);
            setAdjustmentsLoading(false);
            setAdjustmentsError(null);
            return;
        }

        setAdjustmentsLoading(true);

        try {
            const result = await adapter.listProductStockAdjustments(productId);
            setAdjustments(result);
            setAdjustmentsError(null);
        } catch (error) {
            setAdjustments([]);
            setAdjustmentsError(getErrorMessage(error, "ไม่สามารถโหลดประวัติการเติมสินค้าได้"));
        } finally {
            setAdjustmentsLoading(false);
        }
    }, [adapter]);

    useEffect(() => {
        void refreshProducts();
    }, [refreshProducts]);

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
        if (!selectedProductId && products.length > 0) {
            setSelectedProductId(String(products[0].product_id));
        }
    }, [products, selectedProductId]);

    useEffect(() => {
        if (!selectedProduct || isCreateMode) {
            return;
        }

        setEditSku(selectedProduct.sku);
        setEditName(selectedProduct.name);
        setEditTagline(selectedProduct.tagline ?? "");
        setEditPrice(String(selectedProduct.price));
        setEditStockOnHand(selectedProduct.track_stock ? String(selectedProduct.stock_on_hand ?? 0) : "");
        setEditPosCategory(getSellCategory(selectedProduct));
        setEditFeaturedSlot(selectedProduct.featured_slot ? String(selectedProduct.featured_slot) as `${FeaturedSlot}` : "");
        setSelectedRevenueAccountId(selectedProduct.revenue_account_id === undefined ? "" : String(selectedProduct.revenue_account_id));
    }, [isCreateMode, selectedProduct]);

    useEffect(() => {
        if (isCreateMode) {
            setSelectedRevenueAccountId("");
            setAdjustments([]);
            setAdjustmentsError(null);
            setAdjustmentsLoading(false);
            return;
        }

        void refreshAdjustments(selectedProduct ? String(selectedProduct.product_id) : undefined);
    }, [isCreateMode, refreshAdjustments, selectedProduct]);

    function openCreateMode() {
        setIsCreateMode(true);
        setActiveRestockProductId("");
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
    }

    function openEditMode(productId?: string) {
        if (productId) {
            setSelectedProductId(productId);
        }

        setIsCreateMode(false);
        setEditorMessage(null);
        setEditorError(null);
    }

    function clearInlineRestockFeedback(productId: string) {
        setInlineRestockFeedback((current) => {
            if (!(productId in current)) {
                return current;
            }

            const next = { ...current };
            delete next[productId];
            return next;
        });
    }

    function updateInlineRestockDraft(productId: string, patch: Partial<InlineRestockDraft>) {
        setInlineRestockDrafts((current) => ({
            ...current,
            [productId]: {
                quantity: current[productId]?.quantity ?? "",
                note: current[productId]?.note ?? "",
                ...patch,
            },
        }));
        clearInlineRestockFeedback(productId);
    }

    function toggleInlineRestock(productId: string) {
        setActiveRestockProductId((current) => current === productId ? "" : productId);
        setSelectedProductId(productId);
        setIsCreateMode(false);
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

        if (isCreateMode && newProductType === "GOODS" && (Number.isNaN(parsedStockOnHand) || parsedStockOnHand < 0)) {
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

                await refreshProducts();
                setSelectedProductId(String(createdProduct.product_id));
                setIsCreateMode(false);
                setEditorMessage("เพิ่มสินค้าใหม่เรียบร้อยแล้ว");
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
                });

                await refreshProducts();
                setSelectedProductId(String(updatedProduct.product_id));
                setEditorMessage("อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว");
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

    async function handleInlineRestock(product: Product) {
        if (!product.track_stock) {
            return;
        }

        const productId = String(product.product_id);
        const draft = inlineRestockDrafts[productId] ?? { quantity: "", note: "" };
        const parsedQuantity = Number(draft.quantity);

        if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
            setInlineRestockFeedback((current) => ({
                ...current,
                [productId]: {
                    tone: "error",
                    message: "จำนวนที่เติมต้องเป็นจำนวนเต็มมากกว่า 0",
                },
            }));
            return;
        }

        clearInlineRestockFeedback(productId);
        setRestockingProductId(productId);
        setSelectedProductId(productId);
        setIsCreateMode(false);

        try {
            const created = await adapter.addProductStockAdjustment({
                productId: product.product_id,
                addedQuantity: parsedQuantity,
                note: draft.note || null,
                performedByName: session?.full_name,
            });

            await Promise.all([
                refreshProducts(),
                refreshAdjustments(productId),
            ]);

            setEditStockOnHand(String(created.new_stock));
            setInlineRestockDrafts((current) => ({
                ...current,
                [productId]: {
                    quantity: "",
                    note: "",
                },
            }));
            setInlineRestockFeedback((current) => ({
                ...current,
                [productId]: {
                    tone: "success",
                    message: `เติมสต็อก ${created.product_name} จาก ${created.previous_stock} เป็น ${created.new_stock} เรียบร้อยแล้ว`,
                },
            }));
        } catch (error) {
            const errorCode = getErrorCode(error);

            if (errorCode === "INVALID_STOCK_ADDITION") {
                setInlineRestockFeedback((current) => ({
                    ...current,
                    [productId]: {
                        tone: "error",
                        message: "จำนวนที่เติมต้องมากกว่า 0",
                    },
                }));
            } else if (errorCode === "PRODUCT_STOCK_NOT_TRACKED") {
                setInlineRestockFeedback((current) => ({
                    ...current,
                    [productId]: {
                        tone: "error",
                        message: "สินค้านี้ไม่ได้ติดตาม stock จึงเติมสต็อกไม่ได้",
                    },
                }));
            } else {
                setInlineRestockFeedback((current) => ({
                    ...current,
                    [productId]: {
                        tone: "error",
                        message: getErrorMessage(error, "ไม่สามารถบันทึกการเติมสินค้าได้"),
                    },
                }));
            }
        } finally {
            setRestockingProductId(null);
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
            <section className="space-y-6 rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">สินค้า POS และคลังหน้าเคาน์เตอร์</p>
                        <h1 className="mt-3 text-3xl font-semibold text-foreground">ย้ายการจัดการสินค้าไปหน้าใหม่แบบตารางแยกหมวด</h1>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                            ดูสินค้าเป็นหมวดชัด ๆ, แก้ชื่อและราคาได้ในแผงเดียว, เติมสต็อกจากยอดคงเหลือจริง และมีประวัติการเติมให้ย้อนดูได้ทันที
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void refreshProducts()}
                            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                        >
                            รีเฟรชรายการสินค้า
                        </button>
                        <Link
                            href="/pos"
                            className="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                        >
                            กลับไปหน้า POS
                        </Link>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[22px] border border-line bg-background/70 p-4">
                        <p className="text-xs font-semibold text-muted">สินค้าทั้งหมด</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{products.length}</p>
                    </div>
                    <div className="rounded-[22px] border border-line bg-background/70 p-4">
                        <p className="text-xs font-semibold text-muted">สินค้าที่ติดตาม stock</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{trackedProducts.length}</p>
                    </div>
                    <div className="rounded-[22px] border border-line bg-background/70 p-4">
                        <p className="text-xs font-semibold text-muted">ใกล้หมด</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{lowStockProducts.length}</p>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_260px_auto]">
                    <input
                        aria-label="ค้นหาสินค้า"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="ค้นหาจากชื่อสินค้า, SKU, คำโปรย หรือหมวด"
                        className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                    />
                    <select
                        aria-label="กรองหมวดสินค้า"
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value as SellCategory)}
                        className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                    >
                        {(Object.keys(sellCategoryLabel) as SellCategory[]).map((category) => (
                            <option key={category} value={category}>
                                {sellCategoryLabel[category]}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={openCreateMode}
                        className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                    >
                        เพิ่มสินค้าใหม่
                    </button>
                </div>

                {productsLoading ? (
                    <div className="rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                        กำลังโหลดรายการสินค้า...
                    </div>
                ) : categorySections.length > 0 ? (
                    <div className="space-y-5">
                        {categorySections.map((section) => (
                            <section key={section.category} className="rounded-3xl border border-line bg-background/70 p-4 md:p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold text-muted">หมวดสินค้า</p>
                                        <h2 className="mt-1 text-xl font-semibold text-foreground">{POS_CATEGORY_LABEL[section.category]}</h2>
                                    </div>
                                    <p className="text-sm text-muted">{section.products.length} รายการ</p>
                                </div>

                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-230 divide-y divide-line text-sm">
                                        <thead className="bg-[#14130f]">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">สินค้า</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">SKU</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ประเภท</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ราคา</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">คงเหลือ</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">บัญชีรายได้</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ปักหมุด</th>
                                                <th className="px-4 py-3 text-right font-semibold text-muted">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {section.products.map((product) => {
                                                const productId = String(product.product_id);
                                                const isSelected = String(product.product_id) === selectedProductId && !isCreateMode;
                                                const isInlineRestockOpen = activeRestockProductId === productId;
                                                const restockDraft = inlineRestockDrafts[productId] ?? { quantity: "", note: "" };
                                                const restockFeedback = inlineRestockFeedback[productId] ?? null;
                                                const parsedDraftQuantity = Number(restockDraft.quantity);
                                                const projectedStock = !Number.isInteger(parsedDraftQuantity) || parsedDraftQuantity <= 0
                                                    ? product.stock_on_hand ?? 0
                                                    : (product.stock_on_hand ?? 0) + parsedDraftQuantity;
                                                const revenueAccount = chartOfAccounts.find(
                                                    (account) => String(account.account_id) === String(product.revenue_account_id),
                                                );

                                                return (
                                                    <Fragment key={product.product_id}>
                                                        <tr
                                                            className={isSelected ? "bg-accent-soft/10" : "bg-transparent"}
                                                            aria-label={`Product row ${product.name}`}
                                                        >
                                                            <td className="px-4 py-4 align-top">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditMode(productId)}
                                                                    className="text-left"
                                                                >
                                                                    <p className="font-semibold text-[#f3e8ba] transition hover:text-accent">{product.name}</p>
                                                                    <p className="mt-1 max-w-70 text-xs leading-6 text-muted">{product.tagline?.trim() || "ไม่มีคำโปรยสินค้า"}</p>
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-4 align-top text-[#f3e8ba]">{product.sku}</td>
                                                            <td className="px-4 py-4 align-top text-[#f3e8ba]">{product.product_type}</td>
                                                            <td className="px-4 py-4 align-top text-[#f3e8ba]">{formatCurrency(product.price)}</td>
                                                            <td className="px-4 py-4 align-top text-[#f3e8ba]">
                                                                {product.track_stock ? (
                                                                    <div className="space-y-2">
                                                                        <p className="font-semibold">{product.stock_on_hand ?? 0}</p>
                                                                        <button
                                                                            type="button"
                                                                            aria-label={`เติมสินค้า ${product.name}`}
                                                                            onClick={() => toggleInlineRestock(productId)}
                                                                            className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                                                        >
                                                                            {isInlineRestockOpen ? "ซ่อนช่องเติม" : "+ เติมสินค้า"}
                                                                        </button>
                                                                    </div>
                                                                ) : "บริการ"}
                                                            </td>
                                                            <td className="px-4 py-4 align-top text-xs text-muted">
                                                                {revenueAccount ? `${revenueAccount.account_code} · ${revenueAccount.account_name}` : "ใช้บัญชีหลักของระบบ"}
                                                            </td>
                                                            <td className="px-4 py-4 align-top text-[#f3e8ba]">{product.featured_slot ? `ช่อง ${product.featured_slot}` : "-"}</td>
                                                            <td className="px-4 py-4 align-top text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditMode(productId)}
                                                                    className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                                                >
                                                                    จัดการ
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {product.track_stock && isInlineRestockOpen ? (
                                                            <tr aria-label={`Restock row ${product.name}`}>
                                                                <td colSpan={8} className="px-4 pb-4 pt-0">
                                                                    <div className="rounded-[22px] border border-line bg-[#161510] p-4">
                                                                        <div className="grid gap-3 lg:grid-cols-[180px_180px_minmax(0,1fr)_auto] lg:items-end">
                                                                            <div className="rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-foreground">
                                                                                <p className="text-xs text-muted">ของเดิม</p>
                                                                                <p className="mt-2 text-2xl font-semibold">{product.stock_on_hand ?? 0}</p>
                                                                            </div>
                                                                            <label className="block">
                                                                                <span className="text-sm font-medium text-foreground">เติมเพิ่ม</span>
                                                                                <input
                                                                                    aria-label={`เติมเพิ่ม ${product.name}`}
                                                                                    inputMode="numeric"
                                                                                    value={restockDraft.quantity}
                                                                                    onChange={(event) => updateInlineRestockDraft(productId, { quantity: event.target.value })}
                                                                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                                                />
                                                                            </label>
                                                                            <label className="block">
                                                                                <span className="text-sm font-medium text-foreground">หมายเหตุการเติมสินค้า</span>
                                                                                <input
                                                                                    aria-label={`หมายเหตุการเติมสินค้า ${product.name}`}
                                                                                    value={restockDraft.note}
                                                                                    onChange={(event) => updateInlineRestockDraft(productId, { note: event.target.value })}
                                                                                    placeholder="เช่น รับของเข้ารอบเช้า"
                                                                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                                                />
                                                                            </label>
                                                                            <div className="rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-foreground">
                                                                                <p className="text-xs text-muted">ยอดหลังเติม</p>
                                                                                <p className="mt-2 text-2xl font-semibold">{projectedStock}</p>
                                                                            </div>
                                                                        </div>

                                                                        {restockFeedback ? (
                                                                            <div className={`mt-3 rounded-[18px] px-4 py-3 text-sm ${restockFeedback.tone === "error" ? "border border-warning bg-warning-soft text-foreground" : "border border-accent bg-accent-soft text-foreground"}`}>
                                                                                {restockFeedback.message}
                                                                            </div>
                                                                        ) : null}

                                                                        <div className="mt-4 flex flex-wrap gap-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void handleInlineRestock(product)}
                                                                                disabled={restockingProductId === productId}
                                                                                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                                                                            >
                                                                                {restockingProductId === productId ? "กำลังบันทึก..." : "บันทึกการเติมสินค้า"}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setActiveRestockProductId("")}
                                                                                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                                                            >
                                                                                ปิดช่องเติม
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ) : null}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                        ไม่พบสินค้าที่ตรงกับคำค้นหรือหมวดที่เลือก
                    </div>
                )}
            </section>

            <aside className="space-y-6 rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                <section className="rounded-3xl border border-line bg-background/70 p-5">
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={openCreateMode}
                            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                        >
                            เพิ่มสินค้าใหม่
                        </button>
                        <button
                            type="button"
                            onClick={() => openEditMode()}
                            disabled={!selectedProduct}
                            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            แก้ไขสินค้าที่เลือก
                        </button>
                    </div>

                    <div className="mt-5 space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-foreground">{isCreateMode ? "ประเภทสินค้าใหม่" : "สินค้า"}</span>
                            {isCreateMode ? (
                                <select
                                    aria-label="ประเภทสินค้าใหม่"
                                    value={newProductType}
                                    onChange={(event) => {
                                        const nextProductType = event.target.value as EditableProductType;
                                        setNewProductType(nextProductType);
                                        setEditPosCategory(getDefaultPosCategory(nextProductType, editSku));
                                        setEditStockOnHand(nextProductType === "GOODS" ? editStockOnHand || "0" : "");
                                    }}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                >
                                    <option value="GOODS">สินค้า</option>
                                    <option value="SERVICE">บริการ</option>
                                </select>
                            ) : (
                                <div className="mt-2 rounded-[18px] border border-line bg-[#161510] px-4 py-3 text-sm text-foreground">
                                    {selectedProduct ? selectedProduct.name : "เลือกสินค้าจากตารางด้านซ้าย"}
                                </div>
                            )}
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">SKU</span>
                                <input
                                    aria-label="SKU"
                                    value={editSku}
                                    onChange={(event) => setEditSku(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">ราคา</span>
                                <input
                                    aria-label="ราคา"
                                    inputMode="decimal"
                                    value={editPrice}
                                    onChange={(event) => setEditPrice(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-sm font-medium text-foreground">ชื่อสินค้า</span>
                            <input
                                aria-label="ชื่อสินค้า"
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                            />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">{isCreateMode ? "สต็อกคงเหลือ" : "สต็อกปัจจุบัน"}</span>
                                <input
                                    aria-label="สต็อกคงเหลือ"
                                    inputMode="numeric"
                                    value={editStockOnHand}
                                    onChange={(event) => setEditStockOnHand(event.target.value)}
                                    readOnly={!isCreateMode}
                                    disabled={isCreateMode ? newProductType !== "GOODS" : true}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent disabled:opacity-50"
                                />
                                {!isCreateMode && selectedProduct?.track_stock ? (
                                    <p className="mt-2 text-xs leading-6 text-muted">ถ้าต้องการเพิ่ม stock ให้ใช้ปุ่ม + เติมสินค้า ในคอลัมน์คงเหลือของตารางด้านซ้าย</p>
                                ) : null}
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

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">คำโปรยสินค้า</span>
                                <input
                                    aria-label="คำโปรยสินค้า"
                                    value={editTagline}
                                    onChange={(event) => setEditTagline(event.target.value)}
                                    placeholder="เช่น วางขายหน้าเคาน์เตอร์หรือแพ็กเกจขายดี"
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
                        </div>

                        <div className="rounded-3xl border border-line bg-background/70 p-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-medium text-foreground">บัญชีรายได้</p>
                                <p className="text-sm leading-6 text-muted">ผูกสินค้าเข้ากับบัญชีรายได้ที่ต้องการให้ระบบลงบันทึกแยกตามสินค้า</p>
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

                            {revenueAccountsLoading ? <div className="mt-4 text-sm text-muted">กำลังโหลดตัวเลือกบัญชีรายได้...</div> : null}
                            {revenueAccountsError ? <div className="mt-4 text-sm text-warning">{revenueAccountsError}</div> : null}
                            {!isCreateMode && mappedRevenueAccount && !mappedRevenueAccount.is_active ? (
                                <div className="mt-4 rounded-[18px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                                    บัญชี {mappedRevenueAccount.account_code} · {mappedRevenueAccount.account_name} ถูกปิดใช้งานแล้ว กรุณาเลือกบัญชีใหม่ก่อนบันทึก
                                </div>
                            ) : null}
                        </div>

                        {editorError ? <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">{editorError}</div> : null}
                        {editorMessage ? <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">{editorMessage}</div> : null}

                        <div className="flex flex-wrap gap-3">
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
                                        openCreateMode();
                                    } else if (selectedProduct) {
                                        openEditMode(String(selectedProduct.product_id));
                                    }
                                }}
                                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                            >
                                รีเซ็ตฟอร์ม
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-line bg-background/70 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-muted">จัดการ stock แบบ inline</p>
                            <h2 className="mt-2 text-xl font-semibold text-foreground">เติมจากแถวสินค้าทันที แล้วค่อย update ฐานข้อมูลจากยอดเดิม</h2>
                        </div>
                        {selectedProduct?.track_stock ? (
                            <div className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-foreground">
                                คงเหลือ {selectedProduct.stock_on_hand ?? 0}
                            </div>
                        ) : null}
                    </div>

                    {selectedProduct?.track_stock ? (
                        <div className="mt-4 space-y-3 rounded-[22px] border border-line bg-[#161510] p-4 text-sm text-foreground">
                            <p className="leading-7 text-muted">
                                สินค้าที่ติดตาม stock จะเติมจากปุ่ม + เติมสินค้า ในแถวของรายการนั้นโดยตรง เพื่อให้ยอดใหม่ถูกคำนวณจากของเดิมแล้วบันทึกเข้า database พร้อมประวัติการเติมทุกครั้ง
                            </p>
                            {inlineRestockFeedback[String(selectedProduct.product_id)] ? (
                                <div className={`rounded-[18px] px-4 py-3 ${inlineRestockFeedback[String(selectedProduct.product_id)]?.tone === "error" ? "border border-warning bg-warning-soft text-foreground" : "border border-accent bg-accent-soft text-foreground"}`}>
                                    {inlineRestockFeedback[String(selectedProduct.product_id)]?.message}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-[20px] border border-dashed border-line bg-[#161510] px-4 py-4 text-sm leading-7 text-muted">
                            เลือกสินค้าที่ติดตาม stock จากตารางด้านซ้ายก่อน ถ้าสินค้าเป็นบริการหรือสมาชิก ระบบจะไม่เปิดช่องเติมสินค้า
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-line bg-background/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-muted">ประวัติการเติมล่าสุด</p>
                            <h2 className="mt-2 text-xl font-semibold text-foreground">ดูย้อนหลังว่าเติมเมื่อไร เพิ่มเท่าไร และจบที่กี่ชิ้น</h2>
                        </div>
                        {selectedProduct ? <p className="text-sm text-muted">{selectedProduct.name}</p> : null}
                    </div>

                    {adjustmentsError ? <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">{adjustmentsError}</div> : null}

                    {adjustmentsLoading ? (
                        <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                            กำลังโหลดประวัติการเติมสินค้า...
                        </div>
                    ) : adjustments.length > 0 ? (
                        <div className="mt-4 space-y-3">
                            {adjustments.map((adjustment) => (
                                <article key={adjustment.adjustment_id} className="rounded-[20px] border border-line bg-[#161510] px-4 py-4 text-sm text-foreground">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-[#f3e8ba]">{adjustment.product_name}</p>
                                            <p className="mt-1 text-xs text-muted">{adjustment.product_sku} · โดย {adjustment.created_by_name}</p>
                                        </div>
                                        <p className="text-xs text-muted">{formatDateTime(adjustment.created_at)}</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                        <span className="rounded-full bg-accent-soft px-3 py-1 text-foreground">เดิม {adjustment.previous_stock}</span>
                                        <span className="rounded-full border border-line px-3 py-1 text-foreground">เติม +{adjustment.added_quantity}</span>
                                        <span className="rounded-full border border-line px-3 py-1 text-foreground">รวม {adjustment.new_stock}</span>
                                    </div>
                                    {adjustment.note ? <p className="mt-3 text-sm leading-6 text-muted">{adjustment.note}</p> : null}
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                            ยังไม่มีประวัติการเติมสินค้าสำหรับรายการที่เลือก
                        </div>
                    )}
                </section>
            </aside>
        </div>
    );
}