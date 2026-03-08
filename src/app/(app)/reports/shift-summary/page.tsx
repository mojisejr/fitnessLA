"use client";

import { RoleGuard } from "@/components/guards/role-guard";
import { ReportPlaceholder } from "@/components/reports/report-placeholder";

export default function ShiftSummaryPage() {
  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <ReportPlaceholder
        eyebrow="กระทบยอดงานปฏิบัติการ"
        title="สรุปกะ"
        description="โครงนี้พร้อมสำหรับยอดคาดหวัง, ยอดจริง, เงินสดย่อย และผลต่าง โดยทีมสามารถรีวิว interaction และสถานะ export ได้ก่อน API มาจริง"
        filters={[
          "ช่วงวันที่ของกะ",
          "ตัวเลือกแคชเชียร์",
          "ตัวกรองสถานะกะ",
          "สลับแสดงเฉพาะกะที่มีผลต่าง",
        ]}
        waitingFor={[
          "contract response สำหรับสรุปกะจาก backend",
          "ฟิลด์แยกรายละเอียดผลต่างและชื่อที่ยืนยันแล้ว",
          "พฤติกรรม export endpoint และชื่อไฟล์",
        ]}
      />
    </RoleGuard>
  );
}