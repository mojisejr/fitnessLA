"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { DailySalesRow, PaymentMethod } from "@/lib/contracts";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";

const paymentMethodLabel: Record<PaymentMethod, string> = {
    CASH: "เงินสด",
    PROMPTPAY: "พร้อมเพย์",
    CREDIT_CARD: "บัตรเครดิต",
};

export default function CloseShiftPage() {
    const adapter = useAppAdapter();
    const { closeShift, clearLastClosedShift, lastClosedShift, activeShift, session } = useAuth();
    const [actualCash, setActualCash] = useState("");
    const [closingNote, setClosingNote] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shiftSalesRows, setShiftSalesRows] = useState<DailySalesRow[]>([]);
    const [salesLoading, setSalesLoading] = useState(true);
    const [salesError, setSalesError] = useState<string | null>(null);

    const responsibleName = activeShift?.responsible_name ?? lastClosedShift?.responsible_name ?? session?.full_name ?? "";
    const currentShiftId = activeShift?.shift_id ?? lastClosedShift?.shift_id ?? null;
    const businessDate = activeShift?.opened_at.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    const shiftSalesSummary = useMemo(
        () =>
            shiftSalesRows.reduce(
                (summary, row) => {
                    summary.receiptCount += 1;
                    summary.totalAmount += row.total_amount;
                    summary.byMethod[row.payment_method] += row.total_amount;
                    return summary;
                },
                {
                    receiptCount: 0,
                    totalAmount: 0,
                    byMethod: { CASH: 0, PROMPTPAY: 0, CREDIT_CARD: 0 },
                },
            ),
        [shiftSalesRows],
    );

    useEffect(() => {
        let isActive = true;

        async function loadShiftSales() {
            if (!businessDate) {
                if (isActive) {
                    setShiftSalesRows([]);
                    setSalesLoading(false);
                }
                return;
            }

            setSalesLoading(true);

            try {
                const summary = await adapter.getDailySummary({ period: "DAY", date: businessDate });
                if (!isActive) {
                    return;
                }

                const rows = currentShiftId
                    ? summary.sales_rows.filter((row) => String(row.shift_id) === String(currentShiftId))
                    : summary.sales_rows;

                setShiftSalesRows(rows);
                setSalesError(null);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setShiftSalesRows([]);
                setSalesError(getErrorMessage(error, "ยังไม่สามารถดึงรายการขายของกะนี้ได้"));
            } finally {
                if (isActive) {
                    setSalesLoading(false);
                }
            }
        }

        void loadShiftSales();

        return () => {
            isActive = false;
        };
    }, [adapter, businessDate, currentShiftId, lastClosedShift?.shift_id]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);

        const parsed = Number(actualCash);

        if (Number.isNaN(parsed) || parsed < 0) {
            setErrorMessage("เงินสดที่นับได้ต้องเป็นศูนย์หรือมากกว่า");
            return;
        }

        setIsSubmitting(true);

        try {
            await closeShift(parsed, closingNote, responsibleName.trim());
            setActualCash("");
            setClosingNote("");
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "ไม่สามารถปิดกะได้"));
        } finally {
            setIsSubmitting(false);
        }
    }

    const canRenderCloseFlow = Boolean(session?.active_shift_id && activeShift) || Boolean(lastClosedShift);

    if (!canRenderCloseFlow) {
        return (
            <div className="rounded-[28px] border border-line bg-surface p-8 shadow-(--shadow) backdrop-blur">
                <p className="text-sm uppercase tracking-[0.28em] text-muted">ต้องเปิดกะก่อน</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">หน้านี้เริ่มใช้งานได้เมื่อมีกะที่เปิดอยู่</h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                    หลังปิดกะสำเร็จ หน้านี้ยังค้างผลลัพธ์ไว้ให้ตรวจสอบได้ แต่ต้องมีกะก่อนจึงจะเริ่ม blind drop ได้
                </p>
                <Link
                    href="/shift/open"
                    className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                >
                    ไปเปิดกะ
                </Link>
            </div>
        );
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.28em] text-muted">การนับเงินแบบไม่เห็นยอดคาดหวัง</p>
                <h1 className="mt-3 text-3xl font-semibold text-foreground">ปิดกะ</h1>
                <p className="mt-3 text-sm leading-7 text-muted">
                    หน้านี้จะไม่แสดงยอดคาดหวังก่อนกดยืนยัน โดยยอดนั้นจะแสดงหลังผลปิดกะตอบกลับเท่านั้น
                </p>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                    <label className="block">
                        <span className="text-sm font-medium text-foreground">ชื่อผู้รับผิดชอบ</span>
                        <input
                            value={responsibleName}
                            readOnly
                            className="mt-2 w-full rounded-[20px] border border-line bg-surface-strong px-4 py-3 text-foreground outline-none cursor-not-allowed opacity-80"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-foreground">เงินสดที่นับได้จริง</span>
                        <input
                            inputMode="decimal"
                            value={actualCash}
                            onChange={(event) => setActualCash(event.target.value)}
                            placeholder="กรอกจำนวนเงินที่นับได้"
                            className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-foreground">หมายเหตุปิดกะ</span>
                        <textarea
                            value={closingNote}
                            onChange={(event) => setClosingNote(event.target.value)}
                            rows={4}
                            placeholder="บันทึกหมายเหตุเพิ่มเติมได้ถ้าต้องการ"
                            className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                        />
                    </label>

                    {errorMessage ? (
                        <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                            {errorMessage}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isSubmitting || !activeShift}
                        className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "กำลังปิดกะ..." : "ส่งผลการนับเงิน"}
                    </button>
                </form>
            </section>

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.28em] text-muted">ผลการปิดกะ</p>
                {!lastClosedShift ? (
                    <div className="mt-4 rounded-3xl border border-dashed border-line bg-background p-6">
                        <h2 className="text-xl font-semibold text-foreground">ยอดคาดหวังยังถูกซ่อนไว้ตามตั้งใจ</h2>
                        <p className="mt-3 text-sm leading-7 text-muted">
                            ต้องส่งยอดที่นับได้จริงก่อน แล้วระบบจะแสดงยอดคาดหวัง, ผลต่าง และเลขอ้างอิงรายการบัญชี
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 rounded-3xl border border-line bg-background p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted">ยอดคาดหวัง</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(lastClosedShift.expected_cash)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">ยอดที่นับได้</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(lastClosedShift.actual_cash)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">ผู้รับผิดชอบ</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{lastClosedShift.responsible_name ?? session?.full_name ?? "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">ผลต่าง</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(lastClosedShift.difference)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted">เลขที่สมุดรายวัน</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">#{lastClosedShift.journal_entry_id}</p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-[20px] bg-accent-soft px-4 py-3 text-sm font-medium text-foreground">
                            {lastClosedShift.difference === 0
                                ? "ไม่พบส่วนต่าง"
                                : lastClosedShift.difference < 0
                                    ? "พบเงินสดขาด"
                                    : "พบเงินสดเกิน"}
                        </div>

                        <button
                            type="button"
                            onClick={clearLastClosedShift}
                            className="mt-5 rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                        >
                            ล้างผลลัพธ์นี้
                        </button>
                    </div>
                )}

                <div className="mt-6 rounded-3xl border border-line bg-background p-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-sm text-muted">รายการขายในกะนี้</p>
                            <h2 className="mt-2 text-2xl font-semibold text-foreground">ขายอะไรบ้าง รับเงินเท่าไร และมาจากช่องทางไหน</h2>
                        </div>
                        <p className="text-sm text-muted">แสดงตามบิลของกะนี้โดยตรง ทั้งก่อนกดปิดกะและหลังปิดกะสำเร็จ</p>
                    </div>

                    {salesError ? (
                        <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                            {salesError}
                        </div>
                    ) : null}

                    {salesLoading ? (
                        <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                            กำลังโหลดรายการขายของกะ...
                        </div>
                    ) : shiftSalesRows.length > 0 ? (
                        <>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-[22px] border border-line bg-[#161510] p-4">
                                    <p className="text-xs font-semibold text-muted">จำนวนบิลในกะ</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{shiftSalesSummary.receiptCount}</p>
                                </div>
                                <div className="rounded-[22px] border border-line bg-[#161510] p-4">
                                    <p className="text-xs font-semibold text-muted">ยอดขายรวมทั้งกะ</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(shiftSalesSummary.totalAmount)}</p>
                                </div>
                                <div className="rounded-[22px] border border-line bg-[#161510] p-4">
                                    <p className="text-xs font-semibold text-muted">เงินสดในกะนี้</p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(shiftSalesSummary.byMethod.CASH)}</p>
                                </div>
                            </div>

                            <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                                <table className="min-w-full divide-y divide-line text-sm">
                                    <thead className="bg-[#0d0d0a]">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">เวลา / เลขบิล</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">ขายอะไร</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">ผู้รับผิดชอบ</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">ผู้ขาย</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">ลูกค้า</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">รับชำระจาก</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted">ยอดเงิน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {shiftSalesRows.map((row) => (
                                            <tr key={String(row.order_id)}>
                                                <td className="px-4 py-4 text-[#f3e8ba]">
                                                    <p>{formatDateTime(row.sold_at)}</p>
                                                    <p className="mt-1 text-xs text-muted">{row.order_number}</p>
                                                </td>
                                                <td className="px-4 py-4 text-[#f3e8ba]">{row.items_summary}</td>
                                                <td className="px-4 py-4 text-[#f3e8ba]">{row.responsible_name ?? row.cashier_name}</td>
                                                <td className="px-4 py-4 text-[#f3e8ba]">{row.cashier_name}</td>
                                                <td className="px-4 py-4 text-[#f3e8ba]">{row.customer_name ?? "ลูกค้าทั่วไป"}</td>
                                                <td className="px-4 py-4 text-[#f3e8ba]">{paymentMethodLabel[row.payment_method]}</td>
                                                <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.total_amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="mt-4 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
                            ยังไม่มีรายการขายที่บันทึกในกะนี้
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}