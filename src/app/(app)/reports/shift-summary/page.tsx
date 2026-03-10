"use client";

import { RoleGuard } from "@/components/guards/role-guard";
import { ReportPlaceholder } from "@/components/reports/report-placeholder";

const shiftComparisons = [
  { shiftId: "SHIFT-1001", cashier: "Pim Counter", expected: 15420, actual: 15540, difference: 120 },
  { shiftId: "SHIFT-1002", cashier: "June Desk", expected: 14800, actual: 14800, difference: 0 },
  { shiftId: "SHIFT-1003", cashier: "Ton Front", expected: 16260, actual: 16200, difference: -60 },
];

const maxShiftValue = Math.max(...shiftComparisons.map((shift) => Math.max(shift.expected, shift.actual)));

export default function ShiftSummaryPage() {
  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <ReportPlaceholder
        eyebrow="กระทบยอดงานปฏิบัติการ"
        title="สรุปกะ"
        description="โครงนี้พร้อมสำหรับยอดคาดหวัง, ยอดจริง, เงินสดย่อย และผลต่าง โดยทีมสามารถรีวิว interaction และสถานะ export ได้ก่อน API มาจริง"
        integrationStatus="demo shell พร้อมต่อ shift summary API"
        demoNote="หน้านี้ใช้สาธิตลำดับการอ่านรายงานกะ, การวาง filter และการแยกสถานะผลต่างก่อนที่ backend จะส่ง response จริง"
        filters={[
          "ช่วงวันที่ของกะ",
          "ตัวเลือกแคชเชียร์",
          "ตัวกรองสถานะกะ",
          "สลับแสดงเฉพาะกะที่มีผลต่าง",
        ]}
        metrics={[
          { label: "กะที่ปิดแล้ว", value: "12 กะ", tone: "accent" },
          { label: "กะที่มีผลต่าง", value: "2 กะ", tone: "warning" },
          { label: "สถานะ export", value: "พร้อม UI" },
        ]}
        previewColumns={["รหัสกะ", "แคชเชียร์", "ผลต่าง", "สถานะ"]}
        previewRows={[
          ["SHIFT-1001", "Pim Counter", "+120.00", "ต้องตรวจสอบ"],
          ["SHIFT-1002", "June Desk", "0.00", "ปกติ"],
          ["SHIFT-1003", "Ton Front", "-60.00", "ต้องตรวจสอบ"],
        ]}
        waitingFor={[
          "contract response สำหรับสรุปกะจาก backend",
          "ฟิลด์แยกรายละเอียดผลต่างและชื่อที่ยืนยันแล้ว",
          "พฤติกรรม export endpoint และชื่อไฟล์",
        ]}
      >
        <section className="rounded-[24px] border border-line bg-[#12100a] p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">กราฟเปรียบเทียบแต่ละกะ</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">เทียบยอดคาดหวังกับยอดจริงของแต่ละกะ</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted">ดูได้ทันทีว่ากะไหนยอดตรง, เกิน หรือขาด โดยไม่ต้องไล่อ่านเฉพาะตารางอย่างเดียว</p>
          </div>

          <div className="mt-5 space-y-4">
            {shiftComparisons.map((shift) => {
              const expectedWidth = `${(shift.expected / maxShiftValue) * 100}%`;
              const actualWidth = `${(shift.actual / maxShiftValue) * 100}%`;
              const differenceClass = shift.difference > 0 ? "text-[#8dffbe]" : shift.difference < 0 ? "text-[#ff9f9f]" : "text-foreground";

              return (
                <div key={shift.shiftId} className="rounded-[20px] border border-line bg-[#19150a] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-foreground">{shift.shiftId}</p>
                      <p className="text-sm text-muted">แคชเชียร์ {shift.cashier}</p>
                    </div>
                    <p className={`text-sm font-semibold ${differenceClass}`}>
                      {shift.difference > 0 ? "เกิน" : shift.difference < 0 ? "ขาด" : "ตรง"} {shift.difference >= 0 ? "+" : ""}{shift.difference.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>ยอดคาดหวัง</span>
                        <span>{shift.expected.toLocaleString("th-TH")}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#2a2411]">
                        <div className="h-full rounded-full bg-[#806812]" style={{ width: expectedWidth }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>ยอดจริง</span>
                        <span>{shift.actual.toLocaleString("th-TH")}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#2a2411]">
                        <div className={`h-full rounded-full ${shift.difference < 0 ? "bg-[#d44949]" : shift.difference > 0 ? "bg-[#2ea36a]" : "bg-[#f4cf3a]"}`} style={{ width: actualWidth }} />
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