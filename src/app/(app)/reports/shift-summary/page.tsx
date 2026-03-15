"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { PaymentMethod, ShiftSummary } from "@/lib/contracts";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";

const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  PROMPTPAY: "พร้อมเพย์",
  CREDIT_CARD: "บัตรเครดิต",
};

function todayAsInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function ShiftSummaryPage() {
  const adapter = useAppAdapter();
  const [date, setDate] = useState(todayAsInput);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [responsibleFilter, setResponsibleFilter] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await adapter.getShiftSummary(date);
        if (isActive) {
          setSummary(result);
        }
      } catch (error) {
        if (isActive) {
          setSummary(null);
          setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดสรุปกะของวันที่เลือกได้"));
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

  const responsibleOptions = useMemo(() => {
    if (!summary) {
      return [] as string[];
    }

    return Array.from(
      new Set(summary.sales_rows.map((row) => row.responsible_name ?? row.cashier_name).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right, "th"));
  }, [summary]);

  useEffect(() => {
    if (responsibleFilter !== "ALL" && !responsibleOptions.includes(responsibleFilter)) {
      setResponsibleFilter("ALL");
    }
  }, [responsibleFilter, responsibleOptions]);

  const filteredRows = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.sales_rows.filter((row) => {
      const responsibleName = row.responsible_name ?? row.cashier_name;
      return responsibleFilter === "ALL" ? true : responsibleName === responsibleFilter;
    });
  }, [responsibleFilter, summary]);

  const metrics = useMemo(() => {
    return filteredRows.reduce(
      (result, row) => {
        result.receiptCount += 1;
        result[row.payment_method] += row.total_amount;
        return result;
      },
      {
        receiptCount: 0,
        CASH: 0,
        PROMPTPAY: 0,
        CREDIT_CARD: 0,
      },
    );
  }, [filteredRows]);

  const responsibleSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        responsibleName: string;
        receiptCount: number;
        cash: number;
        promptpay: number;
        creditCard: number;
      }
    >();

    for (const row of filteredRows) {
      const responsibleName = row.responsible_name ?? row.cashier_name;
      const current = grouped.get(responsibleName) ?? {
        responsibleName,
        receiptCount: 0,
        cash: 0,
        promptpay: 0,
        creditCard: 0,
      };

      current.receiptCount += 1;
      if (row.payment_method === "CASH") {
        current.cash += row.total_amount;
      } else if (row.payment_method === "PROMPTPAY") {
        current.promptpay += row.total_amount;
      } else {
        current.creditCard += row.total_amount;
      }

      grouped.set(responsibleName, current);
    }

    return Array.from(grouped.values()).sort((left, right) => left.responsibleName.localeCompare(right.responsibleName, "th"));
  }, [filteredRows]);

  const filteredShiftRows = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.shift_rows.filter((row) => (responsibleFilter === "ALL" ? true : row.responsible_name === responsibleFilter));
  }, [responsibleFilter, summary]);

  const cashDifference = useMemo(() => {
    return filteredShiftRows.reduce(
      (result, row) => {
        if (row.difference > 0) {
          result.overage += row.difference;
        } else if (row.difference < 0) {
          result.shortage += Math.abs(row.difference);
        }
        return result;
      },
      { overage: 0, shortage: 0 },
    );
  }, [filteredShiftRows]);

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">กระทบยอดกะจากข้อมูลขายจริง</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">สรุปกะ</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                รายงานนี้ยึดข้อมูลรายการขายของวันที่เลือก แล้วแยกดูตามผู้รับผิดชอบได้ทันที โดยไม่เอายอดเงินสดไปรวมกับพร้อมเพย์หรือบัตร
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-foreground">วันที่ธุรกิจ</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-2 rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">ผู้รับผิดชอบ</span>
                <select
                  value={responsibleFilter}
                  onChange={(event) => setResponsibleFilter(event.target.value)}
                  className="mt-2 rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                >
                  <option value="ALL">ทุกคน</option>
                  {responsibleOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
            ยอดปิดกะเงินสดในหน้านี้อิงจากบิลที่รับชำระด้วยเงินสดของชุดข้อมูลที่เลือกเท่านั้น ส่วนพร้อมเพย์และบัตรเครดิตแยกสรุปคนละก้อน
          </div>
        </section>

        {isLoading ? (
          <div className="rounded-[28px] border border-dashed border-line bg-surface-strong p-8 text-sm text-muted">
            กำลังโหลดสรุปกะ...
          </div>
        ) : errorMessage ? (
          <div className="rounded-[28px] border border-warning bg-warning-soft p-8 text-sm text-foreground">
            {errorMessage}
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">จำนวนบิล</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{metrics.receiptCount}</p>
              </div>
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">ยอดขายเงินสด</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(metrics.CASH)}</p>
              </div>
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">ยอดขายพร้อมเพย์</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(metrics.PROMPTPAY)}</p>
              </div>
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">ยอดขายบัตรเครดิต</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(metrics.CREDIT_CARD)}</p>
              </div>
              <div className="rounded-[28px] border border-accent bg-accent-soft p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">ยอดปิดกะเงินสด</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(metrics.CASH)}</p>
              </div>
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">เงินสดเกิน</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(cashDifference.overage)}</p>
              </div>
              <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">เงินสดขาด</p>
                <p className="mt-4 text-3xl font-semibold text-foreground">{formatCurrency(cashDifference.shortage)}</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted">สรุปตามผู้รับผิดชอบ</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">แยกยอดแต่ละคนโดยไม่รวมช่องทางรับชำระเข้าด้วยกัน</h2>
                </div>
                <p className="text-sm text-muted">เลือกดูรายคน หรือดูทุกคนพร้อมกันจากตัวกรองด้านบน</p>
              </div>

              {responsibleSummaries.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                  <table className="min-w-full divide-y divide-line text-sm">
                    <thead className="bg-[#0d0d0a]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted">ผู้รับผิดชอบ</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">บิล</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เงินสด</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">พร้อมเพย์</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">บัตรเครดิต</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">ยอดปิดกะเงินสด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {responsibleSummaries.map((row) => (
                        <tr key={row.responsibleName}>
                          <td className="px-4 py-4 font-semibold text-[#f3e8ba]">{row.responsibleName}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.receiptCount}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.cash)}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.promptpay)}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.creditCard)}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.cash)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                  ยังไม่มีรายการขายของวันที่หรือผู้รับผิดชอบที่เลือก
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted">ผลต่างเงินสดจากการปิดกะ</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">เงินสดเกินและเงินสดขาดของกะที่ปิดแล้ว</h2>
                </div>
                <p className="text-sm text-muted">คิดจากยอดคาดหวังเทียบยอดนับจริงของแต่ละกะ แล้วแยกเกิน/ขาดคนละฝั่ง</p>
              </div>

              {filteredShiftRows.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                  <table className="min-w-full divide-y divide-line text-sm">
                    <thead className="bg-[#0d0d0a]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เวลากปิดกะ</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">ผู้รับผิดชอบ</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เงินสดคาดหวัง</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เงินสดนับจริง</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เงินสดเกิน</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เงินสดขาด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredShiftRows.map((row) => (
                        <tr key={String(row.shift_id)}>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatDateTime(row.closed_at)}</td>
                          <td className="px-4 py-4 font-semibold text-[#f3e8ba]">{row.responsible_name}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.expected_cash)}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.actual_cash)}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.difference > 0 ? row.difference : 0)}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.difference < 0 ? Math.abs(row.difference) : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                  ยังไม่มีกะที่ปิดแล้วของวันที่หรือผู้รับผิดชอบที่เลือก
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted">บิลขายของวันที่เลือก</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">รายการขายของวันนั้นที่ใช้คำนวณสรุปกะ</h2>
                </div>
                <p className="text-sm text-muted">ทุกแถวด้านล่างเป็น source data ของตัวเลขด้านบน</p>
              </div>

              {filteredRows.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                  <table className="min-w-full divide-y divide-line text-sm">
                    <thead className="bg-[#0d0d0a]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted">เวลา / เลขบิล</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">รายการที่ขาย</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">ผู้รับผิดชอบ</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">รับชำระ</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted">ยอดเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredRows.map((row) => (
                        <tr key={String(row.order_id)}>
                          <td className="px-4 py-4 text-[#f3e8ba]">
                            <p>{formatDateTime(row.sold_at)}</p>
                            <p className="mt-1 text-xs text-muted">{row.order_number}</p>
                          </td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.items_summary}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{row.responsible_name ?? row.cashier_name}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{paymentMethodLabel[row.payment_method]}</td>
                          <td className="px-4 py-4 text-[#f3e8ba]">{formatCurrency(row.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                  ยังไม่มีรายการขายของวันที่หรือผู้รับผิดชอบที่เลือก
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </RoleGuard>
  );
}