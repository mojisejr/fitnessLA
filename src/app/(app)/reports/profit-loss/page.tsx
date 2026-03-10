"use client";

import { RoleGuard } from "@/components/guards/role-guard";
import { ReportPlaceholder } from "@/components/reports/report-placeholder";

const profitLossComparisons = [
  { label: "รายได้สมาชิก", current: 42000, previous: 39000, variance: 3000 },
  { label: "รายได้บริการ", current: 33700, previous: 31200, variance: 2500 },
  { label: "ค่าใช้จ่ายรวม", current: 21450, previous: 19980, variance: -1470 },
  { label: "กำไรสุทธิ", current: 62750, previous: 58220, variance: 4530 },
];

const maxPnLValue = Math.max(...profitLossComparisons.map((item) => Math.max(item.current, item.previous)));

export default function ProfitLossPage() {
  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <ReportPlaceholder
        eyebrow="มุมมองบัญชีสำหรับเจ้าของ"
        title="กำไรขาดทุน"
        description="placeholder นี้กำหนด flow การอ่านรายงานกำไรขาดทุนระหว่างที่ Phase 1 ยังสรุป contract รายงานไม่ครบ"
        integrationStatus="demo shell พร้อมต่อ P&L API"
        demoNote="หน้านี้ใช้ demo โครง P&L ที่แยก section รายได้, ค่าใช้จ่าย และกำไรสุทธิก่อนล็อก hierarchy ของ backend"
        filters={[
          "ตัวเลือกงวดเวลา",
          "สลับเทียบงวดก่อนหน้า",
          "ตัวแทนสาขาหรือหน่วยธุรกิจ",
          "รูปแบบการจัดกลุ่มบัญชี",
        ]}
        metrics={[
          { label: "รายได้รวม", value: "THB 84,200.00", tone: "accent" },
          { label: "ค่าใช้จ่ายรวม", value: "THB 21,450.00", tone: "danger" },
          { label: "กำไรสุทธิ", value: "THB 62,750.00", tone: "success" },
        ]}
        previewColumns={["หมวด", "งวดปัจจุบัน", "งวดก่อนหน้า", "% เปลี่ยนแปลง"]}
        previewRows={[
          ["Membership Revenue", "42,000.00", "39,000.00", "+7.69%"],
          ["Service Revenue", "33,700.00", "31,200.00", "+8.01%"],
          ["Operating Expense", "21,450.00", "19,980.00", "+7.36%"],
        ]}
        waitingFor={[
          "P&L API contract และลำดับชั้นของแถวรายงาน",
          "กฎการรวมยอดรายได้และค่าใช้จ่ายเงินสดย่อยแบบ real-time",
          "พฤติกรรม export และ print สำหรับงานตรวจบัญชี",
        ]}
      >
        <section className="rounded-3xl border border-line bg-[#12100a] p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">กราฟเปรียบเทียบกำไรขาดทุน</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">เทียบงวดปัจจุบันกับงวดก่อนหน้าแบบอ่านเร็ว</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted">กำไรแสดงด้วยโทนเขียว ส่วนรายการที่กดกำไรลงหรือขาดทุนใช้โทนแดงเพื่อให้แยกได้ทันที</p>
          </div>

          <div className="mt-5 space-y-4">
            {profitLossComparisons.map((item) => {
              const currentWidth = `${(item.current / maxPnLValue) * 100}%`;
              const previousWidth = `${(item.previous / maxPnLValue) * 100}%`;
              const varianceClass = item.variance >= 0 ? "text-[#8dffbe]" : "text-[#ff9f9f]";
              const currentBarClass = item.label === "ค่าใช้จ่ายรวม" ? "bg-[#d44949]" : item.label === "กำไรสุทธิ" ? "bg-[#2ea36a]" : "bg-[#f4cf3a]";

              return (
                <div key={item.label} className="rounded-[20px] border border-line bg-[#19150a] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className={`text-base font-semibold ${item.label === "กำไรสุทธิ" ? "text-[#8dffbe]" : item.label === "ค่าใช้จ่ายรวม" ? "text-[#ff9f9f]" : "text-foreground"}`}>
                      {item.label}
                    </p>
                    <p className={`text-sm font-semibold ${varianceClass}`}>
                      {item.variance >= 0 ? "เพิ่มขึ้น" : "ลดลง"} {item.variance >= 0 ? "+" : ""}{item.variance.toLocaleString("th-TH")}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>งวดปัจจุบัน</span>
                        <span>{item.current.toLocaleString("th-TH")}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#2a2411]">
                        <div className={`h-full rounded-full ${currentBarClass}`} style={{ width: currentWidth }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>งวดก่อนหน้า</span>
                        <span>{item.previous.toLocaleString("th-TH")}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#2a2411]">
                        <div className="h-full rounded-full bg-[#7b6a2f]" style={{ width: previousWidth }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </ReportPlaceholder>
    </RoleGuard>
  );
}