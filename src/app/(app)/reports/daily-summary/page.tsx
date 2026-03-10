"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { DailySummary } from "@/lib/contracts";
import { formatCurrency, getErrorMessage } from "@/lib/utils";

function todayAsInput() {
  return new Date().toISOString().slice(0, 10);
}

function previousDateInput(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export default function DailySummaryPage() {
  const adapter = useAppAdapter();
  const [date, setDate] = useState(todayAsInput);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [comparisonSummary, setComparisonSummary] = useState<DailySummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [result, previousResult] = await Promise.all([
          adapter.getDailySummary(date),
          adapter.getDailySummary(previousDateInput(date)),
        ]);
        if (isActive) {
          setSummary(result);
          setComparisonSummary(previousResult);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดสรุปรายวันได้"));
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
  }, [adapter, date]);

  const comparisonBars = useMemo(() => {
    if (!summary || !comparisonSummary) {
      return [];
    }

    const rows = [
      { label: "ยอดขายรวม", current: summary.total_sales, previous: comparisonSummary.total_sales },
      { label: "รายจ่ายรวม", current: summary.total_expenses, previous: comparisonSummary.total_expenses },
      { label: "กระแสเงินสดสุทธิ", current: summary.net_cash_flow, previous: comparisonSummary.net_cash_flow },
    ];

    const maxValue = Math.max(...rows.flatMap((row) => [Math.abs(row.current), Math.abs(row.previous)]), 1);

    return rows.map((row) => ({
      ...row,
      currentWidth: `${Math.max((Math.abs(row.current) / maxValue) * 100, 8)}%`,
      previousWidth: `${Math.max((Math.abs(row.previous) / maxValue) * 100, 8)}%`,
    }));
  }, [comparisonSummary, summary]);

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">ภาพรวมสำหรับเจ้าของและแอดมิน</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">สรุปรายวัน</h1>
              <p className="mt-3 text-sm leading-7 text-muted">
                หน้านี้อิงกับ report contract ที่ล็อกแล้ว จึงสลับจาก mock ไป real API ได้โดยไม่ต้องเปลี่ยนโครงสร้างหน้าจอ
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-foreground">วันที่ธุรกิจ</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              />
            </label>
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

            {comparisonSummary ? (
              <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted">กราฟเปรียบเทียบ</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">เทียบกับวันก่อนหน้า</h2>
                  </div>
                  <p className="text-sm text-muted">วันที่อ้างอิงก่อนหน้า: {previousDateInput(date)}</p>
                </div>

                <div className="mt-6 space-y-5">
                  {comparisonBars.map((row) => (
                    <div key={row.label} className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-foreground">{row.label}</p>
                        <p className="text-xs text-muted">
                          วันนี้ {formatCurrency(row.current)} · วันก่อนหน้า {formatCurrency(row.previous)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-xs text-muted">วันนี้</span>
                          <div className="h-4 flex-1 overflow-hidden rounded-full bg-background">
                            <div className="h-full rounded-full bg-accent" style={{ width: row.currentWidth }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-xs text-muted">วันก่อน</span>
                          <div className="h-4 flex-1 overflow-hidden rounded-full bg-background">
                            <div className="h-full rounded-full bg-warning" style={{ width: row.previousWidth }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.28em] text-muted">ยอดขายตามวิธีชำระ</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {Object.entries(summary.sales_by_method).map(([method, amount]) => (
                  <div key={method} className="rounded-3xl border border-line bg-[#161510] p-5">
                    <p className="text-sm text-muted">{method}</p>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{formatCurrency(amount)}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-line bg-surface-strong p-8 text-sm text-muted">
            ไม่มีข้อมูลสำหรับวันที่เลือก
          </div>
        )}
      </div>
    </RoleGuard>
  );
}