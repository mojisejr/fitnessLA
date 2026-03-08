"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { DailySummary } from "@/lib/contracts";
import { formatCurrency, getErrorMessage } from "@/lib/utils";

function todayAsInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailySummaryPage() {
  const adapter = useAppAdapter();
  const [date, setDate] = useState(todayAsInput);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await adapter.getDailySummary(date);
        if (isActive) {
          setSummary(result);
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
                className="mt-2 rounded-[18px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
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

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.28em] text-muted">ยอดขายตามวิธีชำระ</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {Object.entries(summary.sales_by_method).map(([method, amount]) => (
                  <div key={method} className="rounded-[24px] border border-line bg-white p-5">
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