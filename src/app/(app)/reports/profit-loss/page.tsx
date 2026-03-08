"use client";

import { RoleGuard } from "@/components/guards/role-guard";
import { ReportPlaceholder } from "@/components/reports/report-placeholder";

export default function ProfitLossPage() {
  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <ReportPlaceholder
        eyebrow="มุมมองบัญชีสำหรับเจ้าของ"
        title="กำไรขาดทุน"
        description="placeholder นี้กำหนด flow การอ่านรายงานกำไรขาดทุนระหว่างที่ Phase 1 ยังสรุป contract รายงานไม่ครบ"
        filters={[
          "ตัวเลือกงวดเวลา",
          "สลับเทียบงวดก่อนหน้า",
          "ตัวแทนสาขาหรือหน่วยธุรกิจ",
          "รูปแบบการจัดกลุ่มบัญชี",
        ]}
        waitingFor={[
          "P&L API contract และลำดับชั้นของแถวรายงาน",
          "กฎการรวมยอดรายได้และค่าใช้จ่ายเงินสดย่อยแบบ real-time",
          "พฤติกรรม export และ print สำหรับงานตรวจบัญชี",
        ]}
      />
    </RoleGuard>
  );
}