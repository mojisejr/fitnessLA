"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { DailySummary } from "@/lib/contracts";
import { formatCurrency, getErrorMessage } from "@/lib/utils";

function todayAsInput() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthAsInput() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export default function ProfitLossPage() {
  const adapter = useAppAdapter();
  const [startDate, setStartDate] = useState(firstDayOfMonthAsInput);
  const [endDate, setEndDate] = useState(todayAsInput);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfitAndLoss() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await adapter.getDailySummary({
          period: "CUSTOM",
          start_date: startDate,
          end_date: endDate,
        });

        if (isActive) {
          setSummary(result);
        }
      } catch (error) {
        if (isActive) {
          setSummary(null);
          setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดงบกำไรขาดทุนได้"));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProfitAndLoss();

    return () => {
      isActive = false;
    };
  }, [adapter, startDate, endDate]);

  const netProfit = summary?.total_sales ?? 0;
  const totalExpenses = summary?.total_expenses ?? 0;
  const operatingResult = summary ? summary.total_sales - summary.total_expenses : 0;
  const isProfitable = operatingResult >= 0;

  const paymentRows = useMemo(() => {
    if (!summary) {
      return [] as Array<{ label: string; value: number }>;
    }

    return [
      { label: "เงินสด", value: summary.sales_by_method.CASH },
      { label: "พร้อมเพย์", value: summary.sales_by_method.PROMPTPAY },
      { label: "บัตรเครดิต", value: summary.sales_by_method.CREDIT_CARD },
    ];
  }, [summary]);

  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">รายงานฐานข้อมูลจริง</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">กำไรขาดทุน</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            หน้านี้คำนวณกำไรขาดทุนเบื้องต้นจากยอดขายและรายจ่ายจริงของระบบ Phase 1 โดยอิงข้อมูลจากฐานข้อมูลเดียวกับรายงานสรุปยอด
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_auto] xl:items-end">
            <label className="block">
              <span className="text-sm font-medium text-foreground">วันเริ่มต้น</span>
              <input
                type="date"
                aria-label="วันเริ่มต้น P&L"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">วันสิ้นสุด</span>
              <input
                type="date"
                aria-label="วันสิ้นสุด P&L"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              />
            </label>

            <div className="rounded-[20px] border border-line bg-background/70 px-4 py-3 text-sm text-muted">
              อ่านข้อมูลจริงจาก {startDate} ถึง {endDate}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[28px] border border-dashed border-line bg-background/70 px-6 py-12 text-sm text-muted">
            กำลังโหลดงบกำไรขาดทุน...
          </div>
        ) : summary ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">รายได้รวม</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(netProfit)}</p>
                <p className="mt-3 text-sm leading-7 text-muted">ยอดขายรวมจากทุกวิธีชำระเงินในช่วงวันที่ที่เลือก</p>
              </article>

              <article className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">รายจ่ายรวม</p>
                <p className="mt-3 text-3xl font-semibold text-[#ff8e7a]">{formatCurrency(totalExpenses)}</p>
                <p className="mt-3 text-sm leading-7 text-muted">รวม petty cash ที่บันทึกและโพสต์บัญชีแล้วในฐานข้อมูล</p>
              </article>

              <article className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">ผลการดำเนินงาน</p>
                <p className={`mt-3 text-3xl font-semibold ${isProfitable ? "text-[#8fe388]" : "text-[#ff8e7a]"}`}>
                  {formatCurrency(operatingResult)}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">คำนวณจากรายได้รวมลบด้วยรายจ่ายรวมในช่วงเดียวกัน</p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">โครงสร้างรายได้ตามวิธีชำระเงิน</p>
                <div className="mt-4 space-y-3">
                  {paymentRows.map((row) => (
                    <div key={row.label} className="rounded-[20px] border border-line bg-background/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted">{row.label}</span>
                        <span className="text-lg font-semibold text-foreground">{formatCurrency(row.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">หมายเหตุการอ่านตัวเลข</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
                  <li>รายงานนี้ใช้ข้อมูลจริงจาก daily summary API ที่อ่านจากฐานข้อมูลและ journal-backed flows</li>
                  <li>ถ้าผลต่างปิดกะยังมีอยู่ ตัวเลข cash discrepancy จะแสดงอยู่ใน daily summary แยกจากกำไรขาดทุนนี้</li>
                  <li>ผลการดำเนินงานเป็นภาพรวมเบื้องต้นของ Phase 1 ยังไม่รวมการจัดประเภทรายได้และค่าใช้จ่ายเชิงลึกแบบงบการเงินเต็มรูป</li>
                </ul>

                <div className="mt-5 rounded-[20px] border border-line bg-background/70 px-4 py-4">
                  <p className="text-sm text-muted">Net Cash Flow</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(summary.net_cash_flow)}</p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </RoleGuard>
  );
}