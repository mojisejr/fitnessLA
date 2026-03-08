"use client";

import Link from "next/link";
import { useMockSession } from "@/features/auth/mock-session-provider";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { session, activeShift, lastClosedShift } = useMockSession();

  if (!session) {
    return null;
  }

  const quickLinks = [
    { href: "/shift/open", label: "เปิดกะ", description: "เริ่มงานแคชเชียร์ด้วยเงินทอนตั้งต้น" },
    { href: "/pos", label: "POS", description: "ทดสอบ flow ขาย, cart และการชำระเงิน" },
    { href: "/expenses", label: "เงินสดย่อย", description: "บันทึกรายจ่ายที่ต้องแนบใบเสร็จ" },
    { href: "/coa", label: "ผังบัญชี", description: "จัดการสถานะบัญชีและเตรียม UI รอ contract จริง" },
    { href: "/admin/users", label: "จัดการผู้ใช้", description: "เตรียม flow สร้างผู้ใช้และอนุมัติคำขอ" },
    { href: "/reports/daily-summary", label: "สรุปรายวัน", description: "ดูยอดรวมที่ map กับ contract ที่ล็อกแล้ว" },
    { href: "/reports/shift-summary", label: "สรุปกะ", description: "เตรียม layout กระทบยอดกะระหว่างรอ API เพิ่ม" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">หน้าเริ่มต้นตามบทบาท</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">สวัสดี {session.full_name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              หน้านี้ถูกจัดให้เป็นฐานของ Frontend Owner โดยตรง เพื่อให้เห็นบทบาทปัจจุบัน, สถานะกะ และ flow ที่เริ่มสร้างได้ทันทีแม้ backend ยังไม่ครบ
            </p>
          </div>
          <div className="rounded-[24px] bg-accent-soft px-5 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">โหมดปัจจุบัน</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{session.role}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">ภาพรวมกะ</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {activeShift ? "มีกะที่กำลังทำงานอยู่" : "ยังไม่มีกะที่เปิด"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            {activeShift
              ? `เปิดเมื่อ ${formatDateTime(activeShift.opened_at)} ด้วยเงินทอน ${formatCurrency(activeShift.starting_cash)}`
              : "เปิดกะเพื่อปลดล็อกหน้า POS และเงินสดย่อย"}
          </p>

          {lastClosedShift ? (
            <div className="mt-5 rounded-[24px] border border-line bg-background p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">ผลการปิดกะล่าสุด</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted">คาดหวัง</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(lastClosedShift.expected_cash)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">นับได้จริง</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(lastClosedShift.actual_cash)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">ผลต่าง</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(lastClosedShift.difference)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">หมายเหตุสำหรับ Frontend Owner</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <li>มี guard ครบทั้งตามบทบาทและตามสถานะกะ</li>
            <li>หน้าปิดกะยังซ่อนยอดคาดหวังก่อนกดยืนยันตามกติกา blind drop</li>
            <li>POS ใช้ Jotai และ response ผ่าน adapter ที่สลับ mock กับ real ได้</li>
            <li>รายงานที่เกิน daily summary ยังต้องรอการขยาย contract จาก backend</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks
          .filter((item) => item.href !== "/reports/daily-summary" || session.role !== "CASHIER")
          .filter((item) => item.href !== "/coa" || session.role === "OWNER")
          .filter((item) => item.href !== "/admin/users" || session.role !== "CASHIER")
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[28px] border border-line bg-surface-strong p-6 transition hover:-translate-y-0.5 hover:border-accent hover:bg-white"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-muted">ทางลัด</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">{item.label}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
            </Link>
          ))}
      </section>
    </div>
  );
}