"use client";

import { RoleGuard } from "@/components/guards/role-guard";
import { ReportPlaceholder } from "@/components/reports/report-placeholder";

export default function GeneralLedgerPage() {
  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <ReportPlaceholder
        eyebrow="มุมมองบัญชีสำหรับเจ้าของ"
        title="สมุดรายวันแยกประเภท"
        description="หน้านี้กันพื้นที่ไว้สำหรับรายงานที่มีตัวกรองและ export หนัก โดยยังไม่เดารูปทรง response สุดท้ายของ backend"
        filters={[
          "ตัวเลือกบัญชี",
          "ช่วงวันที่",
          "ตัวกรองประเภทเอกสารต้นทาง",
          "ตัวกรองสถานะบันทึกหรือกลับรายการ",
        ]}
        waitingFor={[
          "contract query ของสมุดรายวันแยกประเภทและรูปแบบ pagination",
          "reference ย้อนกลับไป order, expense และรายการปิดกะ",
          "contract สำหรับส่งออก CSV/XLSX",
        ]}
      />
    </RoleGuard>
  );
}