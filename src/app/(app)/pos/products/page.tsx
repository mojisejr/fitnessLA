"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { ChartOfAccountRecord, IngredientRecord, Product, ProductRecipeRecord, ProductStockAdjustmentRecord } from "@/lib/contracts";
import { POS_CATEGORY_LABEL, getPosSalesCategoryFromProduct } from "@/lib/pos-categories";
import { formatCurrency, formatDateTime, getErrorCode, getErrorMessage } from "@/lib/utils";

type SellCategory = "ALL" | keyof typeof POS_CATEGORY_LABEL;
type PosEditorCategory = Exclude<SellCategory, "ALL">;
type FeaturedSlot = 1 | 2 | 3 | 4;
type EditableProductType = "GOODS" | "SERVICE";
type StockAdjustmentDirection = "INCREASE" | "DECREASE";
type InlineRestockDraft = {
    quantity: string;
    note: string;
    direction: StockAdjustmentDirection;
};
type DraftRecipeItem = {
    key: string;
    ingredientId: string;
    quantity: string;
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

const ingredientUnitLabel: Record<IngredientRecord["unit"], string> = {
    G: "กรัม",
    ML: "มิลลิลิตร",
    PIECE: "ชิ้น",
};

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
    const canManageProductCatalog = session?.role === "OWNER" || session?.role === "ADMIN";
    const canDeleteProducts = session?.role === "OWNER";
    const canDecreaseStock = session?.role === "OWNER";

    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<SellCategory>("ALL");
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
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
    const [isDeletingProducts, setIsDeletingProducts] = useState(false);
    const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
    const [bulkDeleteMessage, setBulkDeleteMessage] = useState<string | null>(null);
    const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
    const [ingredientsLoading, setIngredientsLoading] = useState(true);
    const [ingredientsError, setIngredientsError] = useState<string | null>(null);
    const [ingredientEditorMode, setIngredientEditorMode] = useState<"create" | "edit">("create");
    const [editingIngredientId, setEditingIngredientId] = useState("");
    const [ingredientName, setIngredientName] = useState("");
    const [ingredientUnit, setIngredientUnit] = useState<IngredientRecord["unit"]>("G");
    const [ingredientPurchaseQuantity, setIngredientPurchaseQuantity] = useState("");
    const [ingredientPurchasePrice, setIngredientPurchasePrice] = useState("");
    const [ingredientNotes, setIngredientNotes] = useState("");
    const [ingredientEditorMessage, setIngredientEditorMessage] = useState<string | null>(null);
    const [ingredientEditorError, setIngredientEditorError] = useState<string | null>(null);
    const [isSavingIngredient, setIsSavingIngredient] = useState(false);
    const [recipe, setRecipe] = useState<ProductRecipeRecord | null>(null);
    const [recipeRows, setRecipeRows] = useState<DraftRecipeItem[]>([]);
    const [recipeLoading, setRecipeLoading] = useState(false);
    const [recipeError, setRecipeError] = useState<string | null>(null);
    const [recipeMessage, setRecipeMessage] = useState<string | null>(null);
    const [isSavingRecipe, setIsSavingRecipe] = useState(false);

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

    const filteredProductIds = useMemo(
        () => filteredProducts.map((product) => String(product.product_id)),
        [filteredProducts],
    );

    const selectedFilteredCount = useMemo(
        () => selectedProductIds.filter((productId) => filteredProductIds.includes(productId)).length,
        [filteredProductIds, selectedProductIds],
    );

    const trackedProducts = useMemo(() => products.filter((product) => product.track_stock), [products]);
    const lowStockProducts = useMemo(
        () => trackedProducts.filter((product) => (product.stock_on_hand ?? 0) <= 5),
        [trackedProducts],
    );

    const recipePreview = useMemo(() => {
        const items = recipeRows
            .filter((row) => row.ingredientId && row.quantity.trim())
            .map((row) => {
                const ingredient = ingredients.find((candidate) => String(candidate.ingredient_id) === row.ingredientId) ?? null;
                const quantity = Number(row.quantity);
                const lineCost = ingredient && Number.isFinite(quantity) && quantity > 0
                    ? Number((ingredient.cost_per_unit * quantity).toFixed(6))
                    : 0;

                return {
                    key: row.key,
                    ingredient,
                    quantity,
                    lineCost,
                };
            });

        return {
            items,
            totalCost: Number(items.reduce((sum, item) => sum + item.lineCost, 0).toFixed(6)),
        };
    }, [ingredients, recipeRows]);

    const refreshProducts = useCallback(async () => {
        setProductsLoading(true);
        setProductsError(null);

        try {
            const result = await adapter.listProducts();
            setProducts(result);
        } catch (error) {
            setProducts([]);
            setProductsError(getErrorMessage(error, "ไม่สามารถโหลดรายการสินค้าได้"));
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

    const refreshIngredients = useCallback(async () => {
        setIngredientsLoading(true);
        setIngredientsError(null);

        try {
            const result = await adapter.listIngredients();
            setIngredients(result);
        } catch (error) {
            setIngredients([]);
            setIngredientsError(getErrorMessage(error, "ไม่สามารถโหลดคลังวัตถุดิบได้"));
        } finally {
            setIngredientsLoading(false);
        }
    }, [adapter]);

    const refreshRecipe = useCallback(async (productId?: string) => {
        if (!productId) {
            setRecipe(null);
            setRecipeRows([]);
            setRecipeLoading(false);
            setRecipeError(null);
            return;
        }

        setRecipeLoading(true);

        try {
            const result = await adapter.getProductRecipe(productId);
            setRecipe(result);
            setRecipeRows(result.items.map((item) => ({
                key: String(item.recipe_item_id),
                ingredientId: String(item.ingredient_id),
                quantity: String(item.quantity),
            })));
            setRecipeError(null);
        } catch (error) {
            setRecipe(null);
            setRecipeRows([]);
            setRecipeError(getErrorMessage(error, "ไม่สามารถโหลดสูตรสินค้านี้ได้"));
        } finally {
            setRecipeLoading(false);
        }
    }, [adapter]);

    useEffect(() => {
        void refreshProducts();
    }, [refreshProducts]);

    useEffect(() => {
        void refreshIngredients();
    }, [refreshIngredients]);

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
        const activeProductIds = new Set(products.map((product) => String(product.product_id)));

        setSelectedProductIds((current) => current.filter((productId) => activeProductIds.has(productId)));

        if (selectedProductId && !activeProductIds.has(selectedProductId)) {
            setSelectedProductId(products[0] ? String(products[0].product_id) : "");
            setIsCreateMode(false);
            setActiveRestockProductId("");
        }
    }, [products, selectedProductId]);

    useEffect(() => {
        if (isCreateMode) {
            setSelectedRevenueAccountId("");
            setAdjustments([]);
            setAdjustmentsError(null);
            setAdjustmentsLoading(false);
            setRecipe(null);
            setRecipeRows([]);
            setRecipeError(null);
            setRecipeMessage(null);
            return;
        }

        void refreshAdjustments(selectedProduct ? String(selectedProduct.product_id) : undefined);
        void refreshRecipe(selectedProduct ? String(selectedProduct.product_id) : undefined);
    }, [isCreateMode, refreshAdjustments, refreshRecipe, selectedProduct]);

    function openCreateMode() {
        if (!canManageProductCatalog) {
            return;
        }

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
        setRecipe(null);
        setRecipeRows([]);
        setRecipeError(null);
        setRecipeMessage(null);
    }

    function openEditMode(productId?: string) {
        if (productId) {
            setSelectedProductId(productId);
        }

        setIsCreateMode(false);
        setEditorMessage(null);
        setEditorError(null);
    }

    function toggleProductSelection(productId: string) {
        setSelectedProductIds((current) =>
            current.includes(productId)
                ? current.filter((value) => value !== productId)
                : [...current, productId],
        );
        setBulkDeleteError(null);
        setBulkDeleteMessage(null);
    }

    function toggleSelectAllFilteredProducts() {
        if (selectedFilteredCount === filteredProductIds.length) {
            setSelectedProductIds((current) => current.filter((productId) => !filteredProductIds.includes(productId)));
        } else {
            setSelectedProductIds((current) => [...new Set([...current, ...filteredProductIds])]);
        }
        setBulkDeleteError(null);
        setBulkDeleteMessage(null);
    }

    function removeDeletedProductsFromState(productIds: string[]) {
        const deletedIdSet = new Set(productIds);

        setProducts((current) => current.filter((product) => !deletedIdSet.has(String(product.product_id))));
        setSelectedProductIds((current) => current.filter((productId) => !deletedIdSet.has(productId)));
        setInlineRestockDrafts((current) => {
            const next = { ...current };
            for (const productId of productIds) {
                delete next[productId];
            }
            return next;
        });
        setInlineRestockFeedback((current) => {
            const next = { ...current };
            for (const productId of productIds) {
                delete next[productId];
            }
            return next;
        });

        if (productIds.includes(selectedProductId)) {
            setSelectedProductId("");
            setAdjustments([]);
            setRecipe(null);
            setRecipeRows([]);
            setActiveRestockProductId("");
        }
    }

    async function handleDeleteSelectedProducts() {
        if (!canDeleteProducts || selectedProductIds.length === 0) {
            return;
        }

        setIsDeletingProducts(true);
        setBulkDeleteError(null);
        setBulkDeleteMessage(null);

        try {
            const result = await adapter.deleteProducts(selectedProductIds);
            removeDeletedProductsFromState(result.deleted_products.map((product) => String(product.product_id)));
            setBulkDeleteMessage(`ลบสินค้า ${result.deleted_count} รายการเรียบร้อยแล้ว`);
        } catch (error) {
            setBulkDeleteError(getErrorMessage(error, "ไม่สามารถลบสินค้าที่เลือกได้"));
        } finally {
            setIsDeletingProducts(false);
        }
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

    function resetIngredientEditor() {
        setIngredientEditorMode("create");
        setEditingIngredientId("");
        setIngredientName("");
        setIngredientUnit("G");
        setIngredientPurchaseQuantity("");
        setIngredientPurchasePrice("");
        setIngredientNotes("");
        setIngredientEditorMessage(null);
        setIngredientEditorError(null);
    }

    function editIngredient(ingredient: IngredientRecord) {
        setIngredientEditorMode("edit");
        setEditingIngredientId(String(ingredient.ingredient_id));
        setIngredientName(ingredient.name);
        setIngredientUnit(ingredient.unit);
        setIngredientPurchaseQuantity(String(ingredient.purchase_quantity));
        setIngredientPurchasePrice(String(ingredient.purchase_price));
        setIngredientNotes(ingredient.notes ?? "");
        setIngredientEditorMessage(null);
        setIngredientEditorError(null);
    }

    function addRecipeRow() {
        setRecipeRows((current) => [
            ...current,
            { key: `draft-${Date.now()}-${current.length}`, ingredientId: "", quantity: "" },
        ]);
        setRecipeMessage(null);
        setRecipeError(null);
    }

    function updateRecipeRow(key: string, patch: Partial<DraftRecipeItem>) {
        setRecipeRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
        setRecipeMessage(null);
        setRecipeError(null);
    }

    function removeRecipeRow(key: string) {
        setRecipeRows((current) => current.filter((row) => row.key !== key));
        setRecipeMessage(null);
        setRecipeError(null);
    }

    async function handleSaveIngredient() {
        const parsedQuantity = Number(ingredientPurchaseQuantity);
        const parsedPrice = Number(ingredientPurchasePrice);

        if (!ingredientName.trim()) {
            setIngredientEditorError("กรุณาระบุชื่อวัตถุดิบ");
            return;
        }

        if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
            setIngredientEditorError("ปริมาณที่ซื้อต้องมากกว่า 0");
            return;
        }

        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            setIngredientEditorError("ราคาซื้อต้องเป็นศูนย์หรือมากกว่า");
            return;
        }

        setIsSavingIngredient(true);
        setIngredientEditorError(null);
        setIngredientEditorMessage(null);

        try {
            if (ingredientEditorMode === "edit" && editingIngredientId) {
                await adapter.updateIngredient({
                    ingredientId: editingIngredientId,
                    name: ingredientName,
                    unit: ingredientUnit,
                    purchaseQuantity: parsedQuantity,
                    purchasePrice: parsedPrice,
                    notes: ingredientNotes || null,
                });
                setIngredientEditorMessage("อัปเดตวัตถุดิบเรียบร้อยแล้ว");
            } else {
                await adapter.createIngredient({
                    name: ingredientName,
                    unit: ingredientUnit,
                    purchaseQuantity: parsedQuantity,
                    purchasePrice: parsedPrice,
                    notes: ingredientNotes || null,
                });
                setIngredientEditorMessage("เพิ่มวัตถุดิบใหม่เรียบร้อยแล้ว");
                resetIngredientEditor();
            }

            await refreshIngredients();
        } catch (error) {
            setIngredientEditorError(getErrorMessage(error, ingredientEditorMode === "edit" ? "ไม่สามารถแก้ไขวัตถุดิบได้" : "ไม่สามารถเพิ่มวัตถุดิบได้"));
        } finally {
            setIsSavingIngredient(false);
        }
    }

    async function handleSaveRecipe() {
        if (!selectedProduct) {
            return;
        }

        const hasIncompleteRow = recipeRows.some((row) => (row.ingredientId && !row.quantity.trim()) || (!row.ingredientId && row.quantity.trim()));
        if (hasIncompleteRow) {
            setRecipeError("กรุณาเลือกวัตถุดิบและระบุปริมาณให้ครบทุกบรรทัด");
            return;
        }

        const payloadItems = recipeRows
            .filter((row) => row.ingredientId && row.quantity.trim())
            .map((row) => ({
                ingredientId: row.ingredientId,
                quantity: Number(row.quantity),
            }));

        if (payloadItems.some((item) => Number.isNaN(item.quantity) || item.quantity <= 0)) {
            setRecipeError("ปริมาณวัตถุดิบในสูตรต้องมากกว่า 0");
            return;
        }

        setIsSavingRecipe(true);
        setRecipeError(null);
        setRecipeMessage(null);

        try {
            const savedRecipe = await adapter.replaceProductRecipe({
                productId: selectedProduct.product_id,
                items: payloadItems,
            });

            setRecipe(savedRecipe);
            setRecipeRows(savedRecipe.items.map((item) => ({
                key: String(item.recipe_item_id),
                ingredientId: String(item.ingredient_id),
                quantity: String(item.quantity),
            })));
            setRecipeMessage(payloadItems.length > 0 ? "บันทึกสูตรสินค้าเรียบร้อยแล้ว" : "ล้างสูตรสินค้านี้เรียบร้อยแล้ว");
            await refreshProducts();
        } catch (error) {
            setRecipeError(getErrorMessage(error, "ไม่สามารถบันทึกสูตรสินค้าได้"));
        } finally {
            setIsSavingRecipe(false);
        }
    }

    function updateInlineRestockDraft(productId: string, patch: Partial<InlineRestockDraft>) {
        setInlineRestockDrafts((current) => ({
            ...current,
            [productId]: {
                quantity: current[productId]?.quantity ?? "",
                note: current[productId]?.note ?? "",
                direction: current[productId]?.direction ?? "INCREASE",
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
        if (!canManageProductCatalog) {
            return;
        }

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
        const draft = inlineRestockDrafts[productId] ?? { quantity: "", note: "", direction: "INCREASE" };
        const parsedQuantity = Number(draft.quantity);
        const quantityDelta = draft.direction === "DECREASE" ? -parsedQuantity : parsedQuantity;

        if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
            setInlineRestockFeedback((current) => ({
                ...current,
                [productId]: {
                    tone: "error",
                    message: draft.direction === "DECREASE"
                        ? "จำนวนที่ตัดออกต้องเป็นจำนวนเต็มมากกว่า 0"
                        : "จำนวนที่เติมต้องเป็นจำนวนเต็มมากกว่า 0",
                },
            }));
            return;
        }

        if (draft.direction === "DECREASE" && !canDecreaseStock) {
            setInlineRestockFeedback((current) => ({
                ...current,
                [productId]: {
                    tone: "error",
                    message: "เฉพาะ owner เท่านั้นที่ลดสต็อกสินค้าได้",
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
                addedQuantity: quantityDelta,
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
                    direction: current[productId]?.direction ?? "INCREASE",
                },
            }));
            setInlineRestockFeedback((current) => ({
                ...current,
                [productId]: {
                    tone: "success",
                    message: quantityDelta < 0
                        ? `ลดสต็อก ${created.product_name} จาก ${created.previous_stock} เป็น ${created.new_stock} เรียบร้อยแล้ว`
                        : `เติมสต็อก ${created.product_name} จาก ${created.previous_stock} เป็น ${created.new_stock} เรียบร้อยแล้ว`,
                },
            }));
        } catch (error) {
            const errorCode = getErrorCode(error);

            if (errorCode === "INVALID_STOCK_ADDITION") {
                setInlineRestockFeedback((current) => ({
                    ...current,
                    [productId]: {
                        tone: "error",
                        message: "จำนวนที่ปรับสต็อกต้องไม่เป็น 0",
                    },
                }));
            } else if (errorCode === "INSUFFICIENT_STOCK") {
                setInlineRestockFeedback((current) => ({
                    ...current,
                    [productId]: {
                        tone: "error",
                        message: "สต็อกคงเหลือไม่พอสำหรับการตัดออก",
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
        <RoleGuard allowedRoles={["OWNER", "ADMIN", "CASHIER"]}>
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
                        <div className="rounded-[22px] border border-line bg-background/70 p-4">
                            <p className="text-xs font-semibold text-muted">วัตถุดิบในคลังสูตร</p>
                            <p className="mt-2 text-3xl font-semibold text-foreground">{ingredients.length}</p>
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
                        {canManageProductCatalog ? (
                            <button
                                type="button"
                                onClick={openCreateMode}
                                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                            >
                                เพิ่มสินค้าใหม่
                            </button>
                        ) : (
                            <div className="rounded-[20px] border border-line bg-background/70 px-4 py-3 text-sm text-muted">
                                แคชเชียร์เข้าหน้านี้เพื่อเติมสต็อกและดูประวัติการปรับสินค้าได้
                            </div>
                        )}
                    </div>

                    {canDeleteProducts ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-line bg-background/70 p-4">
                            <button
                                type="button"
                                onClick={toggleSelectAllFilteredProducts}
                                disabled={filteredProductIds.length === 0}
                                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {selectedFilteredCount === filteredProductIds.length && filteredProductIds.length > 0 ? "ยกเลิกเลือกทั้งหมดในผลลัพธ์" : "เลือกทั้งหมดในผลลัพธ์"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDeleteSelectedProducts()}
                                disabled={selectedProductIds.length === 0 || isDeletingProducts}
                                className="rounded-full border border-warning px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-warning-soft disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isDeletingProducts ? "กำลังลบสินค้า..." : `ลบสินค้าที่เลือก ${selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ""}`}
                            </button>
                            {bulkDeleteError ? <div className="text-sm text-warning">{bulkDeleteError}</div> : null}
                            {bulkDeleteMessage ? <div className="text-sm text-foreground">{bulkDeleteMessage}</div> : null}
                        </div>
                    ) : null}

                    {productsLoading ? (
                        <div className="rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                            กำลังโหลดรายการสินค้า...
                        </div>
                    ) : productsError ? (
                        <div className="rounded-3xl border border-warning bg-warning-soft p-6 text-sm text-foreground">
                            {productsError}
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
                                                    {canDeleteProducts ? <th className="px-4 py-3 text-left font-semibold text-muted">เลือก</th> : null}
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">สินค้า</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">SKU</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">ประเภท</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">ราคา</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">คงเหลือ</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">บัญชีรายได้</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">ต้นทุนสูตร</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-muted">ปักหมุด</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-muted">จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-line">
                                                {section.products.map((product) => {
                                                    const productId = String(product.product_id);
                                                    const isSelected = String(product.product_id) === selectedProductId && !isCreateMode;
                                                    const isChecked = selectedProductIds.includes(productId);
                                                    const isInlineRestockOpen = activeRestockProductId === productId;
                                                    const restockDraft = inlineRestockDrafts[productId] ?? { quantity: "", note: "", direction: "INCREASE" };
                                                    const restockFeedback = inlineRestockFeedback[productId] ?? null;
                                                    const parsedDraftQuantity = Number(restockDraft.quantity);
                                                    const signedDraftQuantity = restockDraft.direction === "DECREASE" ? -parsedDraftQuantity : parsedDraftQuantity;
                                                    const projectedStock = !Number.isInteger(parsedDraftQuantity) || parsedDraftQuantity <= 0
                                                        ? product.stock_on_hand ?? 0
                                                        : Math.max(0, (product.stock_on_hand ?? 0) + signedDraftQuantity);
                                                    const revenueAccount = chartOfAccounts.find(
                                                        (account) => String(account.account_id) === String(product.revenue_account_id),
                                                    );

                                                    return (
                                                        <Fragment key={product.product_id}>
                                                            <tr
                                                                className={isSelected ? "bg-accent-soft/10" : "bg-transparent"}
                                                                aria-label={`Product row ${product.name}`}
                                                            >
                                                                {canDeleteProducts ? (
                                                                    <td className="px-4 py-4 align-top">
                                                                        <input
                                                                            aria-label={`เลือกสินค้า ${product.name}`}
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => toggleProductSelection(productId)}
                                                                            className="h-4 w-4 rounded border-line"
                                                                        />
                                                                    </td>
                                                                ) : null}
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
                                                                <td className="px-4 py-4 align-top text-xs text-muted">
                                                                    {typeof product.recipe_total_cost === "number" ? `${formatCurrency(product.recipe_total_cost)} · ${product.recipe_item_count ?? 0} รายการ` : "ยังไม่ตั้งสูตร"}
                                                                </td>
                                                                <td className="px-4 py-4 align-top text-[#f3e8ba]">{product.featured_slot ? `ช่อง ${product.featured_slot}` : "-"}</td>
                                                                <td className="px-4 py-4 align-top text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditMode(productId)}
                                                                        className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                                                    >
                                                                        {canManageProductCatalog ? "จัดการ" : "ดูรายละเอียด"}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {product.track_stock && isInlineRestockOpen ? (
                                                                <tr aria-label={`Restock row ${product.name}`}>
                                                                    <td colSpan={canDeleteProducts ? 10 : 9} className="px-4 pb-4 pt-0">
                                                                        <div className="rounded-[22px] border border-line bg-[#161510] p-4">
                                                                            <div className="grid gap-3 lg:grid-cols-[180px_180px_180px_minmax(0,1fr)_auto] lg:items-end">
                                                                                <div className="rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-foreground">
                                                                                    <p className="text-xs text-muted">ของเดิม</p>
                                                                                    <p className="mt-2 text-2xl font-semibold">{product.stock_on_hand ?? 0}</p>
                                                                                </div>
                                                                                {canDecreaseStock ? (
                                                                                    <label className="block">
                                                                                        <span className="text-sm font-medium text-foreground">ประเภทการปรับ</span>
                                                                                        <select
                                                                                            aria-label={`ประเภทการปรับ ${product.name}`}
                                                                                            value={restockDraft.direction}
                                                                                            onChange={(event) => updateInlineRestockDraft(productId, { direction: event.target.value as StockAdjustmentDirection })}
                                                                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                                                        >
                                                                                            <option value="INCREASE">เติมเข้า</option>
                                                                                            <option value="DECREASE">ตัดออก</option>
                                                                                        </select>
                                                                                    </label>
                                                                                ) : null}
                                                                                <label className="block">
                                                                                    <span className="text-sm font-medium text-foreground">{restockDraft.direction === "DECREASE" ? "จำนวนที่ตัดออก" : "จำนวนที่เติม"}</span>
                                                                                    <input
                                                                                        aria-label={`${restockDraft.direction === "DECREASE" ? "ตัดออก" : "เติมเพิ่ม"} ${product.name}`}
                                                                                        inputMode="numeric"
                                                                                        value={restockDraft.quantity}
                                                                                        onChange={(event) => updateInlineRestockDraft(productId, { quantity: event.target.value })}
                                                                                        className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                                                    />
                                                                                </label>
                                                                                <label className="block">
                                                                                    <span className="text-sm font-medium text-foreground">หมายเหตุการปรับสินค้า</span>
                                                                                    <input
                                                                                        aria-label={`หมายเหตุการปรับสินค้า ${product.name}`}
                                                                                        value={restockDraft.note}
                                                                                        onChange={(event) => updateInlineRestockDraft(productId, { note: event.target.value })}
                                                                                        placeholder={restockDraft.direction === "DECREASE" ? "เช่น สินค้าเสียหายหรือใช้ภายใน" : "เช่น รับของเข้ารอบเช้า"}
                                                                                        className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                                                    />
                                                                                </label>
                                                                                <div className="rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-foreground">
                                                                                    <p className="text-xs text-muted">ยอดหลังปรับ</p>
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
                                                                                    {restockingProductId === productId ? "กำลังบันทึก..." : restockDraft.direction === "DECREASE" ? "บันทึกการลดสต็อก" : "บันทึกการเติมสินค้า"}
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
                    {canManageProductCatalog ? (
                    <>
                    <section className="rounded-3xl border border-line bg-background/70 p-5">
                        {canManageProductCatalog ? (
                            <>
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
                            </>
                        ) : (
                            <div className="space-y-4 rounded-[22px] border border-line bg-[#161510] p-4 text-sm text-foreground">
                                <p className="text-xs font-semibold text-muted">สิทธิ์ของแคชเชียร์</p>
                                <h2 className="text-xl font-semibold text-foreground">หน้านี้เปิดให้เติมสต็อกและดูประวัติการปรับสินค้า</h2>
                                <p className="leading-7 text-muted">
                                    การสร้างสินค้าใหม่, แก้ไขรายละเอียดสินค้า, ผูกสูตร และลบหลายรายการ ยังสงวนไว้สำหรับ owner หรือ admin เพื่อป้องกันการแก้ catalog โดยไม่ตั้งใจ
                                </p>
                                {selectedProduct ? (
                                    <div className="rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-foreground">
                                        รายการที่เลือก: {selectedProduct.name}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl border border-line bg-background/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-muted">จัดการ stock แบบ inline</p>
                                <h2 className="mt-2 text-xl font-semibold text-foreground">ปรับสต็อกจากแถวสินค้าทันทีโดยอิงยอดคงเหลือจริง</h2>
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
                                    สินค้าที่ติดตาม stock จะปรับจากปุ่มในแถวของรายการนั้นโดยตรง เพื่อให้ยอดใหม่ถูกคำนวณจากของเดิมแล้วบันทึกเข้า database พร้อมประวัติทุกครั้ง
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
                                            <span className="rounded-full border border-line px-3 py-1 text-foreground">{adjustment.added_quantity >= 0 ? `เติม +${adjustment.added_quantity}` : `ตัด ${adjustment.added_quantity}`}</span>
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

                    <section className="rounded-3xl border border-line bg-background/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-muted">สูตรต้นทุนต่อหน่วยขาย</p>
                                <h2 className="mt-2 text-xl font-semibold text-foreground">ผูกวัตถุดิบต่อสินค้าเพื่อคำนวณต้นทุนต่อแก้วหรือจาน</h2>
                            </div>
                            {recipe ? <p className="text-sm text-muted">{recipe.product_name}</p> : null}
                        </div>

                        {isCreateMode || !selectedProduct ? (
                            <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                                สร้างหรือเลือกสินค้าจากตารางก่อน แล้วค่อยผูกวัตถุดิบเป็นสูตรของสินค้านั้น
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-[20px] border border-line bg-[#161510] px-4 py-4">
                                        <p className="text-xs text-muted">ต้นทุนรวมต่อหน่วยขาย</p>
                                        <p className="mt-2 text-2xl font-semibold text-[#f3e8ba]">{formatCurrency(recipePreview.totalCost)}</p>
                                    </div>
                                    <div className="rounded-[20px] border border-line bg-[#161510] px-4 py-4">
                                        <p className="text-xs text-muted">ส่วนต่างจากราคาขาย</p>
                                        <p className="mt-2 text-2xl font-semibold text-[#f3e8ba]">{formatCurrency((selectedProduct.price ?? 0) - recipePreview.totalCost)}</p>
                                    </div>
                                </div>

                                {recipeLoading ? <div className="mt-4 text-sm text-muted">กำลังโหลดสูตรสินค้า...</div> : null}
                                {recipeError ? <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">{recipeError}</div> : null}
                                {recipeMessage ? <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">{recipeMessage}</div> : null}

                                <div className="mt-4 space-y-3">
                                    {recipeRows.length > 0 ? recipeRows.map((row, index) => {
                                        const ingredient = ingredients.find((candidate) => String(candidate.ingredient_id) === row.ingredientId) ?? null;
                                        const quantity = Number(row.quantity);
                                        const lineCost = ingredient && Number.isFinite(quantity) && quantity > 0
                                            ? Number((ingredient.cost_per_unit * quantity).toFixed(6))
                                            : 0;

                                        return (
                                            <div key={row.key} className="rounded-[20px] border border-line bg-[#161510] p-4">
                                                <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.1fr)_140px_140px_auto] xl:items-end">
                                                    <label className="block min-w-0">
                                                        <span className="text-sm font-medium text-foreground">วัตถุดิบ #{index + 1}</span>
                                                        <select
                                                            aria-label={`วัตถุดิบสูตร ${index + 1}`}
                                                            value={row.ingredientId}
                                                            onChange={(event) => updateRecipeRow(row.key, { ingredientId: event.target.value })}
                                                            className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                        >
                                                            <option value="">เลือกวัตถุดิบ</option>
                                                            {ingredients.map((candidate) => (
                                                                <option key={candidate.ingredient_id} value={String(candidate.ingredient_id)}>
                                                                    {candidate.name} · {ingredientUnitLabel[candidate.unit]} · {formatCurrency(candidate.cost_per_unit)}/{ingredientUnitLabel[candidate.unit]}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <div className="flex min-w-0 flex-col gap-3 xl:contents">
                                                        <label className="block min-w-0">
                                                            <span className="text-sm font-medium text-foreground">ปริมาณต่อหน่วยขาย</span>
                                                            <input
                                                                aria-label={`ปริมาณสูตร ${index + 1}`}
                                                                inputMode="decimal"
                                                                value={row.quantity}
                                                                onChange={(event) => updateRecipeRow(row.key, { quantity: event.target.value })}
                                                                className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                                            />
                                                        </label>
                                                        <div className="min-w-0 rounded-[18px] border border-line bg-background/70 px-4 py-3 text-sm text-foreground xl:self-end">
                                                            <p className="text-xs text-muted">ต้นทุนบรรทัดนี้</p>
                                                            <p className="mt-2 text-lg font-semibold">{formatCurrency(lineCost)}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRecipeRow(row.key)}
                                                        className="w-full rounded-full border border-line px-4 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft xl:w-auto xl:justify-self-auto"
                                                    >
                                                        ลบบรรทัด
                                                    </button>
                                                </div>
                                                {ingredient ? (
                                                    <p className="mt-3 text-xs text-muted">{ingredient.name} ใช้หน่วย {ingredientUnitLabel[ingredient.unit]} และมีต้นทุน {formatCurrency(ingredient.cost_per_unit)} ต่อ {ingredientUnitLabel[ingredient.unit]}</p>
                                                ) : null}
                                            </div>
                                        );
                                    }) : (
                                        <div className="rounded-[20px] border border-dashed border-line bg-[#161510] px-4 py-4 text-sm text-muted">
                                            ยังไม่มีวัตถุดิบในสูตรนี้ กดเพิ่มบรรทัดเพื่อเริ่มผูกต้นทุนต่อหน่วยขาย
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={addRecipeRow}
                                        className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                    >
                                        เพิ่มวัตถุดิบในสูตร
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveRecipe()}
                                        disabled={isSavingRecipe}
                                        className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSavingRecipe ? "กำลังบันทึกสูตร..." : "บันทึกสูตรสินค้า"}
                                    </button>
                                </div>
                            </>
                        )}
                    </section>

                    <section className="rounded-3xl border border-line bg-background/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-muted">คลังวัตถุดิบ</p>
                                <h2 className="mt-2 text-xl font-semibold text-foreground">เพิ่มและแก้ไขวัตถุดิบที่ใช้เป็นต้นทุนเมนู</h2>
                            </div>
                            <button
                                type="button"
                                onClick={resetIngredientEditor}
                                className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                            >
                                เพิ่มวัตถุดิบใหม่
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">ชื่อวัตถุดิบ</span>
                                <input
                                    aria-label="ชื่อวัตถุดิบ"
                                    value={ingredientName}
                                    onChange={(event) => setIngredientName(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">หน่วย</span>
                                <select
                                    aria-label="หน่วยวัตถุดิบ"
                                    value={ingredientUnit}
                                    onChange={(event) => setIngredientUnit(event.target.value as IngredientRecord["unit"])}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                >
                                    {Object.entries(ingredientUnitLabel).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">ปริมาณที่ซื้อ</span>
                                <input
                                    aria-label="ปริมาณที่ซื้อ"
                                    inputMode="decimal"
                                    value={ingredientPurchaseQuantity}
                                    onChange={(event) => setIngredientPurchaseQuantity(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">ราคาซื้อรวม</span>
                                <input
                                    aria-label="ราคาซื้อรวม"
                                    inputMode="decimal"
                                    value={ingredientPurchasePrice}
                                    onChange={(event) => setIngredientPurchasePrice(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                        </div>

                        <label className="mt-4 block">
                            <span className="text-sm font-medium text-foreground">หมายเหตุ</span>
                            <input
                                aria-label="หมายเหตุวัตถุดิบ"
                                value={ingredientNotes}
                                onChange={(event) => setIngredientNotes(event.target.value)}
                                className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                            />
                        </label>

                        {ingredientEditorError ? <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">{ingredientEditorError}</div> : null}
                        {ingredientEditorMessage ? <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">{ingredientEditorMessage}</div> : null}
                        {ingredientsError ? <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">{ingredientsError}</div> : null}

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleSaveIngredient()}
                                disabled={isSavingIngredient}
                                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSavingIngredient ? "กำลังบันทึกวัตถุดิบ..." : ingredientEditorMode === "edit" ? "บันทึกวัตถุดิบ" : "เพิ่มวัตถุดิบ"}
                            </button>
                        </div>

                        {ingredientsLoading ? (
                            <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                                กำลังโหลดวัตถุดิบ...
                            </div>
                        ) : ingredients.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                {ingredients.map((ingredient) => (
                                    <button
                                        key={ingredient.ingredient_id}
                                        type="button"
                                        onClick={() => editIngredient(ingredient)}
                                        className="w-full rounded-[20px] border border-line bg-[#161510] px-4 py-4 text-left text-sm text-foreground transition hover:border-accent"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-[#f3e8ba]">{ingredient.name}</p>
                                                <p className="mt-1 text-xs text-muted">{ingredient.purchase_quantity} {ingredientUnitLabel[ingredient.unit]} · ต้นทุน {formatCurrency(ingredient.cost_per_unit)}/{ingredientUnitLabel[ingredient.unit]}</p>
                                            </div>
                                            <p className="text-xs text-muted">ซื้อ {formatCurrency(ingredient.purchase_price)}</p>
                                        </div>
                                        {ingredient.notes ? <p className="mt-3 text-sm leading-6 text-muted">{ingredient.notes}</p> : null}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                                ยังไม่มีวัตถุดิบในระบบ เริ่มจากเพิ่มเมล็ดกาแฟ, นม, น้ำผึ้ง หรือมัทฉะก่อน
                            </div>
                        )}
                    </section>
                    </>
                    ) : null}
                </aside>
            </div>
        </RoleGuard>
    );
}