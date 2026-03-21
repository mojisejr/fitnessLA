"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { DailySummary, ReportPeriod } from "@/lib/contracts";
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

export default function DailySummaryPage() {
    const adapter = useAppAdapter();
    const [period, setPeriod] = useState<ReportPeriod>("DAY");
    const [date, setDate] = useState(todayAsInput);
    const [startDate, setStartDate] = useState(todayAsInput);
    const [endDate, setEndDate] = useState(todayAsInput);
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isActive = true;

        async function loadSummary() {
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

        void loadSummary();

        return () => {
            isActive = false;
        };
    }, [adapter, period, date, startDate, endDate]);

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
                                    <h2 className="mt-2 text-2xl font-semibold text-foreground">ขายอะไรไปบ้าง ใครขาย รับเงินแบบไหน</h2>
                                </div>
                                <p className="text-sm text-muted">แสดงตามบิลที่บันทึกในช่วงที่เลือก</p>
                            </div>

                            {summary.sales_rows.length > 0 ? (
                                <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                                    <table className="min-w-full divide-y divide-line text-sm">
                                        <thead className="bg-[#0d0d0a]">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">เวลา</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">รายการที่ขาย</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ผู้รับผิดชอบ</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ผู้ขาย</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ลูกค้า</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">รับชำระ</th>
                                                <th className="px-4 py-3 text-left font-semibold text-muted">ยอดเงิน</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {summary.sales_rows.map((row) => (
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