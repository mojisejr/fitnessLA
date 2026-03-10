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
        integrationStatus="demo shell พร้อมต่อ general ledger API"
        demoNote="หน้านี้ใช้ demo ตาราง ledger ที่เน้น filter หนัก, reference ย้อนกลับ, และโครง export ก่อนเชื่อม query จริง"
        filters={[
          "ตัวเลือกบัญชี",
          "ช่วงวันที่",
          "ตัวกรองประเภทเอกสารต้นทาง",
          "ตัวกรองสถานะบันทึกหรือกลับรายการ",
        ]}
        metrics={[
          { label: "รายการในหน้า", value: "25 rows" },
          { label: "บัญชีที่เลือก", value: "1010 Cash on Hand", tone: "accent" },
          { label: "สถานะ sync", value: "รอ API", tone: "warning" },
        ]}
        previewColumns={["วันที่", "บัญชี", "เดบิต", "เครดิต", "Reference"]}
        previewRows={[
          ["2026-03-10", "Cash on Hand", "1,500.00", "-", "SHIFT-1001"],
          ["2026-03-10", "Service Revenue", "-", "850.00", "ORD-2401"],
          ["2026-03-10", "Operating Expense", "240.00", "-", "EXP-3001"],
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