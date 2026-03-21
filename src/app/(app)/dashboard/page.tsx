"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/auth-provider";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
    const { session, activeShift, lastClosedShift } = useAuth();

    if (!session) {
        return null;
    }

    const quickLinks = [
        { href: "/shift/open", label: "เปิดกะ", description: "เริ่มงานแคชเชียร์ด้วยเงินทอนตั้งต้น" },
        { href: "/pos", label: "POS", description: "จัดการการขาย, ตะกร้า และการชำระเงินหน้าเคาน์เตอร์" },
        { href: "/members", label: "สมาชิก", description: "ดูข้อมูลสมาชิก แพ็กเกจ วันเริ่มใช้ และวันหมดอายุ" },
        { href: "/expenses", label: "รายจ่าย", description: "บันทึกรายจ่ายและตรวจสอบบัญชีรายจ่ายที่ใช้งานอยู่" },
        { href: "/coa", label: "ผังบัญชี", description: "ดูผังบัญชีและตรวจสถานะการเชื่อมข้อมูลบัญชี" },
        { href: "/admin/users", label: "จัดการผู้ใช้", description: "สร้างผู้ใช้ใหม่และติดตามข้อมูลผู้ใช้ที่เพิ่งบันทึก" },
        { href: "/reports/daily-summary", label: "สรุปยอด", description: "ดูยอดรวมรายวัน รายสัปดาห์ รายเดือน หรือช่วงเวลาที่กำหนด" },
        { href: "/reports/shift-summary", label: "สรุปกะ", description: "ดูโครงรายงานกระทบยอดกะและสถานะข้อมูลที่เชื่อมแล้ว" },
    ];

    return (
        <div className="space-y-6">
            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">หน้าเริ่มต้นตามบทบาท</p>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">สวัสดี {session.full_name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                            หน้านี้สรุปบทบาทปัจจุบัน สถานะกะ และทางลัดหลักของระบบ เพื่อให้เริ่มงานประจำวันและตรวจความพร้อมของแต่ละหน้าจอได้ทันที
                        </p>
                    </div>
                    <div className="rounded-3xl border border-accent bg-accent-soft px-5 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">โหมดปัจจุบัน</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{session.role}</p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">ภาพรวมกะ</p>
                    <h2 className="mt-3 text-2xl font-semibold text-foreground">
                        {activeShift ? "มีกะที่กำลังทำงานอยู่" : "ยังไม่มีกะที่เปิด"}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-muted">
                        {activeShift
                            ? `เปิดเมื่อ ${formatDateTime(activeShift.opened_at)} ด้วยเงินทอน ${formatCurrency(activeShift.starting_cash)}`
                            : "เปิดกะเพื่อปลดล็อกหน้า POS และรายจ่าย"}
                    </p>

                    {lastClosedShift ? (
                        <div className="mt-5 rounded-3xl border border-line bg-background/70 p-5">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted">ผลการปิดกะล่าสุด</p>
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
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">หมายเหตุการใช้งาน</p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
                        <li>ระบบจำกัดสิทธิ์ตามบทบาทและสถานะกะก่อนเข้าแต่ละหน้า</li>
                        <li>หน้าปิดกะยังซ่อนยอดคาดหวังก่อนยืนยันตามกติกาการนับเงินแบบไม่เห็นยอดคาดหวัง</li>
                        <li>หน้า POS และหน้าหลักอื่น ๆ พร้อมสลับระหว่างข้อมูลทดลองกับข้อมูลจริงตามโหมดที่เลือก</li>
                        <li>รายงานบางชุดยังอยู่ระหว่างขยายข้อมูลฝั่งระบบส่วนกลาง</li>
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
                            className="group rounded-[28px] border border-line bg-surface-strong p-6 transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft"
                        >
                            <p className="text-xs uppercase tracking-[0.16em] text-muted transition group-hover:text-white/80">ทางลัด</p>
                            <h2 className="mt-3 text-2xl font-semibold text-foreground transition group-hover:text-white">{item.label}</h2>
                            <p className="mt-3 text-sm leading-7 text-muted transition group-hover:text-white/80">{item.description}</p>
                        </Link>
                    ))}
            </section>
        </div>
    );
}