"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { DailySummary, ReportPeriod, SalesEntryItem } from "@/lib/contracts";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";

const paymentMethodLabel = {
    CASH: "เงินสด",
    PROMPTPAY: "พร้อมเพย์",
    CREDIT_CARD: "บัตรเครดิต",
} as const;

const periodLabel: Record<ReportPeriod, string> = {
    DAY: "รายวัน",
    WEEK: "รายสัปดาห์",
    MONTH: "รายเดือน",
    CUSTOM: "กำหนดเอง",
};

function todayAsInput() {
    return new Date().toISOString().slice(0, 10);
}

function computeDraftTotal(items: SalesEntryItem[]) {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

function increaseDraftItem(items: SalesEntryItem[], targetIndex: number) {
    return items.map((item, index) =>
        index === targetIndex
            ? { ...item, quantity: item.quantity + 1, line_total: (item.quantity + 1) * item.unit_price }
            : item,
    );
}

function decreaseDraftItem(items: SalesEntryItem[], targetIndex: number) {
    return items.flatMap((item, index) => {
        if (index !== targetIndex) {
            return item;
        }

        const nextQuantity = item.quantity - 1;
        if (nextQuantity <= 0) {
            return [];
        }

        return {
            ...item,
            quantity: nextQuantity,
            line_total: nextQuantity * item.unit_price,
        };
    });
}

export default function DailySummaryPage() {
    const adapter = useAppAdapter();
    const { session } = useAuth();
    const [period, setPeriod] = useState<ReportPeriod>("DAY");
    const [date, setDate] = useState(todayAsInput);
    const [startDate, setStartDate] = useState(todayAsInput);
    const [endDate, setEndDate] = useState(todayAsInput);
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [draftItems, setDraftItems] = useState<SalesEntryItem[]>([]);
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

    const canEditSales = session?.role === "OWNER";

    async function loadSummary() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const query =
                period === "CUSTOM"
                    ? { period, start_date: startDate, end_date: endDate }
                    : { period, date };

            const result = await adapter.getDailySummary(query);
            setSummary(result);
            setSelectedOrderIds([]);
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดสรุปยอดได้"));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        let isActive = true;

        async function loadSummarySafely() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const query =
                    period === "CUSTOM"
                        ? { period, start_date: startDate, end_date: endDate }
                        : { period, date };

                const result = await adapter.getDailySummary(query);
                if (isActive) {
                    setSummary(result);
                    setSelectedOrderIds([]);
                }
            } catch (error) {
                if (isActive) {
                    setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดสรุปยอดได้"));
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadSummarySafely();

        return () => {
            isActive = false;
        };
    }, [adapter, period, date, startDate, endDate]);

    async function handleSaveSale(orderId: string) {
        if (draftItems.length === 0) {
            setSaveErrorMessage("กรุณาระบุรายการที่ขาย");
            return;
        }

        if (draftItems.some((item) => item.quantity <= 0 || item.unit_price < 0 || !Number.isFinite(item.unit_price))) {
            setSaveErrorMessage("ข้อมูลจำนวนหรือราคาต่อหน่วยไม่ถูกต้อง");
            return;
        }

        setIsSaving(true);
        setSaveErrorMessage(null);
        setSaveSuccessMessage(null);

        try {
            await adapter.updateSalesEntry(orderId, {
                items: draftItems.map((item) => ({
                    order_item_id: item.order_item_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                })),
            });
            await loadSummary();
            setEditingOrderId(null);
            setDraftItems([]);
            setSaveSuccessMessage("อัปเดตรายการขายเรียบร้อยแล้ว");
        } catch (error) {
            setSaveErrorMessage(getErrorMessage(error, "ไม่สามารถแก้ไขรายการขายได้"));
        } finally {
            setIsSaving(false);
        }
    }

    function toggleOrderSelection(orderId: string, checked: boolean) {
        setSelectedOrderIds((current) =>
            checked ? Array.from(new Set([...current, orderId])) : current.filter((id) => id !== orderId),
        );
    }

    function toggleAllVisibleOrders(orderIds: string[], checked: boolean) {
        setSelectedOrderIds(checked ? orderIds : []);
    }

    async function handleDeleteSale(orderId: string, orderNumber: string) {
        if (!window.confirm(`ลบบิล ${orderNumber} ใช่หรือไม่`)) {
            return;
        }

        setDeletingOrderId(orderId);
        setSaveErrorMessage(null);
        setSaveSuccessMessage(null);

        try {
            const result = await adapter.deleteSalesEntry(orderId);
            await loadSummary();
            if (editingOrderId === orderId) {
                setEditingOrderId(null);
                setDraftItems([]);
            }
            setSaveSuccessMessage(`ลบบิล ${result.order_number} เรียบร้อยแล้ว`);
        } catch (error) {
            setSaveErrorMessage(getErrorMessage(error, "ไม่สามารถลบบิลขายได้"));
        } finally {
            setDeletingOrderId(null);
        }
    }

    async function handleBulkDeleteSales() {
        if (selectedOrderIds.length === 0) {
            setSaveErrorMessage("กรุณาเลือกรายการขายอย่างน้อย 1 บิล");
            return;
        }

        if (!window.confirm(`ลบบิลที่เลือก ${selectedOrderIds.length} บิล ใช่หรือไม่`)) {
            return;
        }

        setBulkDeleting(true);
        setSaveErrorMessage(null);
        setSaveSuccessMessage(null);

        try {
            const result = await adapter.deleteSalesEntries(selectedOrderIds);
            await loadSummary();
            if (editingOrderId && selectedOrderIds.includes(editingOrderId)) {
                setEditingOrderId(null);
                setDraftItems([]);
            }
            setSaveSuccessMessage(`ลบบิล ${result.deleted_count} รายการเรียบร้อยแล้ว`);
        } catch (error) {
            setSaveErrorMessage(getErrorMessage(error, "ไม่สามารถลบบิลที่เลือกได้"));
        } finally {
            setBulkDeleting(false);
        }
    }

    return (
        <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
            <div className="space-y-6">
                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-muted">ภาพรวมสำหรับเจ้าของและแอดมิน</p>
                            <h1 className="mt-3 text-3xl font-semibold text-foreground">สรุปยอด</h1>
                            <p className="mt-3 text-sm leading-7 text-muted">
                                สรุปยอดขาย รายจ่าย และเงินสดสุทธิ พร้อมแยกตามหมวดหมู่และวิธีชำระ
                            </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <span className="text-sm font-medium text-foreground">ช่วงเวลา</span>
                                <div className="mt-2 flex gap-1">
                                    {(["DAY", "WEEK", "MONTH", "CUSTOM"] as ReportPeriod[]).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPeriod(p)}
                                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${period === p
                                                ? "bg-accent text-black"
                                                : "border border-line bg-surface-strong text-foreground hover:border-accent hover:bg-accent-soft"
                                                }`}
                                        >
                                            {periodLabel[p]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {period === "CUSTOM" ? (
                                <div className="flex gap-2">
                                    <label className="block">
                                        <span className="text-sm font-medium text-foreground">เริ่ม</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="mt-2 block rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-sm font-medium text-foreground">สิ้นสุด</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="mt-2 block rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="block">
                                    <span className="text-sm font-medium text-foreground">วันที่</span>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="mt-2 block rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </section>

                {isLoading ? (
                    <div className="rounded-[28px] border border-dashed border-line bg-surface-strong p-8 text-sm text-muted">
                        กำลังโหลดรายงาน...
                    </div>
                ) : errorMessage ? (
                    <div className="rounded-[28px] border border-warning bg-warning-soft p-8 text-sm text-foreground">
                        {errorMessage}
                    </div>
                ) : summary ? (
                    <>
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {[
                                ["ยอดขายรวม", summary.total_sales],
                                ["รายจ่ายรวม", summary.total_expenses],
                                ["กระแสเงินสดสุทธิ", summary.net_cash_flow],
                                ["ผลต่างจากการปิดกะ", summary.shift_discrepancies],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-[28px] border border-line bg-surface-strong p-6">
                                    <p className="text-xs uppercase tracking-[0.28em] text-muted">{label}</p>
                                    <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(Number(value))}</p>
                                </div>
                            ))}
                        </section>

                        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                            <p className="text-xs uppercase tracking-[0.28em] text-muted">ยอดขายแยกตามหมวด POS</p>
                            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                {summary.sales_by_category.map((cat) => (
                                    <div key={cat.category} className="rounded-3xl border border-line bg-[#161510] p-5">
                                        <p className="text-sm font-medium text-foreground">{cat.label}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted">{cat.category}</p>
                                        <p className="mt-3 text-2xl font-semibold text-foreground">{formatCurrency(cat.total_amount)}</p>
                                        <p className="mt-1 text-xs text-muted">{cat.receipt_count} บิล · {cat.item_count} ชิ้น</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                            <p className="text-xs uppercase tracking-[0.28em] text-muted">ยอดขายตามวิธีชำระ</p>
                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                {Object.entries(summary.sales_by_method).map(([method, amount]) => (
                                    <div key={method} className="rounded-3xl border border-line bg-[#161510] p-5">
                                        <p className="text-sm text-muted">{paymentMethodLabel[method as keyof typeof paymentMethodLabel]}</p>
                                        <p className="mt-3 text-2xl font-semibold text-foreground">{formatCurrency(amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.28em] text-muted">รายการขาย</p>
                                    <h2 className="mt-2 text-2xl font-semibold text-foreground">รายการขายตามบิล</h2>
                                </div>
                                <p className="text-sm text-muted">แสดงตามบิลที่บันทึกในช่วงที่เลือก</p>
                            </div>

                            {saveErrorMessage ? (
                                <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                                    {saveErrorMessage}
                                </div>
                            ) : null}
                            {saveSuccessMessage ? (
                                <div className="mt-4 rounded-[20px] border border-line bg-accent-soft px-4 py-3 text-sm text-foreground">
                                    {saveSuccessMessage}
                                </div>
                            ) : null}

                            {canEditSales && summary.sales_rows.length > 0 ? (
                                <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-line bg-[#11110d] px-4 py-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {selectedOrderIds.length > 0 ? `เลือกบิลแล้ว ${selectedOrderIds.length} รายการ` : "เลือกรายการขายเพื่อลบหลายบิล"}
                                        </p>
                                        <p className="text-xs text-muted">ลบบิลที่เลือกออกจากหน้าสรุปยอดและฐานข้อมูลทันที</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={summary.sales_rows.length > 0 && summary.sales_rows.every((row) => selectedOrderIds.includes(String(row.order_id)))}
                                                onChange={(event) => toggleAllVisibleOrders(summary.sales_rows.map((row) => String(row.order_id)), event.target.checked)}
                                                disabled={bulkDeleting}
                                                aria-label="เลือกทุกบิล"
                                                className="h-4 w-4 rounded border border-line bg-surface-strong accent-[#f4d54d]"
                                            />
                                            เลือกทั้งหมด
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => void handleBulkDeleteSales()}
                                            disabled={selectedOrderIds.length === 0 || bulkDeleting}
                                            className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-4 py-2 text-xs font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {bulkDeleting ? "กำลังลบ..." : "ลบที่เลือก"}
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {summary.sales_rows.length > 0 ? (
                                <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                                    <table className="min-w-full divide-y divide-line text-sm">
                                        <thead className="bg-[#0d0d0a]">
                                            <tr>
                                                {canEditSales ? <th className="px-3 py-3 text-left font-semibold text-muted">เลือก</th> : null}
                                                <th className="px-4 py-3 text-left font-semibold text-muted">เวลา</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">รายการที่ขาย</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ผู้รับผิดชอบ</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ผู้ขาย</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ลูกค้า</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">รับชำระ</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ยอดเงิน</th>
                                                {canEditSales ? <th className="px-4 py-3 text-left font-semibold text-muted">จัดการ</th> : null}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {summary.sales_rows.map((row) => (
                                                <tr key={String(row.order_id)}>
                                                    {canEditSales ? (
                                                        <td className="px-3 py-4 text-[#f3e8ba] align-top">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedOrderIds.includes(String(row.order_id))}
                                                                onChange={(event) => toggleOrderSelection(String(row.order_id), event.target.checked)}
                                                                disabled={bulkDeleting}
                                                                aria-label={`เลือกบิล ${row.order_number}`}
                                                                className="mt-1 h-4 w-4 rounded border border-line bg-surface-strong accent-[#f4d54d]"
                                                            />
                                                        </td>
                                                    ) : null}
                                                    <td className="px-4 py-4 text-[#f3e8ba]">
                                                        <p>{formatDateTime(row.sold_at)}</p>
                                                        <p className="mt-1 text-xs text-muted">{row.order_number}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-[#f3e8ba]">
                                                        {editingOrderId === String(row.order_id) ? (
                                                            <div className="space-y-2">
                                                                {draftItems.map((item, index) => (
                                                                    <div key={String(item.order_item_id)} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line/60 bg-[#12110c] px-3 py-2 text-[#f3e8ba]">
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate font-semibold leading-6">{item.product_name} x{item.quantity}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setDraftItems((current) => decreaseDraftItem(current, index));
                                                                                }}
                                                                                aria-label={`ลดสินค้า ${item.product_name}`}
                                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-base font-semibold text-[#17130a] transition hover:border-accent hover:bg-[#f5edc9]"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span aria-label={`จำนวน ${item.product_name}`} className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setDraftItems((current) => increaseDraftItem(current, index));
                                                                                }}
                                                                                aria-label={`เพิ่มสินค้า ${item.product_name}`}
                                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2e7d32] bg-[#2e7d32] text-base font-semibold text-white transition hover:bg-[#256628]"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                        <div className="text-sm font-semibold text-[#f3e8ba]">
                                                                            <p className="text-xs text-muted">ราคาต่อหน่วย</p>
                                                                            <p>{formatCurrency(item.unit_price)}</p>
                                                                        </div>
                                                                        <div className="text-sm font-semibold text-[#f3e8ba]">
                                                                            <p className="text-xs text-muted">รวม</p>
                                                                            <p>{formatCurrency(item.quantity * item.unit_price)}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {(row.items ?? []).length > 0 ? (row.items ?? []).map((item) => (
                                                                    <div key={String(item.order_item_id)} className="flex items-center justify-between gap-4 rounded-2xl border border-line/60 px-3 py-2">
                                                                        <span>{item.product_name} x{item.quantity}</span>
                                                                        <span className="text-sm text-muted">{formatCurrency(item.line_total)}</span>
                                                                    </div>
                                                                )) : row.items_summary}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-[#f3e8ba]">{row.responsible_name ?? row.cashier_name}</td>
                                                    <td className="px-4 py-4 text-[#f3e8ba]">{row.cashier_name}</td>
                                                    <td className="px-4 py-4 text-[#f3e8ba]">{row.customer_name ?? "ลูกค้าทั่วไป"}</td>
                                                    <td className="px-4 py-4 text-[#f3e8ba]">{paymentMethodLabel[row.payment_method]}</td>
                                                    <td className="px-4 py-4 text-[#f3e8ba]">
                                                        {editingOrderId === String(row.order_id) ? (
                                                            <div>
                                                                <p className="text-xs text-muted">ยอดรวมจากรายการ</p>
                                                                <p className="mt-1 font-semibold text-[#f3e8ba]">{formatCurrency(computeDraftTotal(draftItems))}</p>
                                                            </div>
                                                        ) : (
                                                            formatCurrency(row.total_amount)
                                                        )}
                                                    </td>
                                                    {canEditSales ? (
                                                        <td className="px-4 py-4 text-[#f3e8ba]">
                                                            {editingOrderId === String(row.order_id) ? (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isSaving}
                                                                        onClick={() => void handleSaveSale(String(row.order_id))}
                                                                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isSaving}
                                                                        onClick={() => {
                                                                            setEditingOrderId(null);
                                                                            setDraftItems([]);
                                                                            setSaveErrorMessage(null);
                                                                        }}
                                                                        className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        ยกเลิก
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={!row.items || row.items.length === 0 || deletingOrderId === String(row.order_id) || bulkDeleting}
                                                                        onClick={() => {
                                                                            setEditingOrderId(String(row.order_id));
                                                                            setDraftItems((row.items ?? []).map((item) => ({ ...item })));
                                                                            setSaveErrorMessage(null);
                                                                            setSaveSuccessMessage(null);
                                                                        }}
                                                                        className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        แก้ไข
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={deletingOrderId === String(row.order_id) || bulkDeleting}
                                                                        onClick={() => void handleDeleteSale(String(row.order_id), row.order_number)}
                                                                        className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-4 py-2 text-xs font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        {deletingOrderId === String(row.order_id) ? "กำลังลบ..." : "ลบ"}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    ) : null}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                                    ยังไม่มีรายการขายในช่วงที่เลือก
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    <div className="rounded-[28px] border border-dashed border-line bg-surface-strong p-8 text-sm text-muted">
                        ไม่มีข้อมูลสำหรับช่วงที่เลือก
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}