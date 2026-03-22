"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/auth-provider";
import { generalLedgerEnabled } from "@/lib/feature-flags";
import { type AttendanceStatusRecord, type StaffAttendanceRecord } from "@/lib/contracts";
import { formatCurrency, formatDateTime } from "@/lib/utils";

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        ...init,
        credentials: "include",
        headers: new Headers(init?.headers),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "Request failed" }));
        throw body;
    }

    return response.json() as Promise<T>;
}

function formatWorkDate(dateKey: string) {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${dateKey}T00:00:00+07:00`));
}

export default function DashboardPage() {
    const { session, activeShift, lastClosedShift } = useAuth();
    const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusRecord | null>(null);
    const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
    const [attendanceError, setAttendanceError] = useState<string | null>(null);
    const [isAttendanceBusy, setIsAttendanceBusy] = useState(false);

    const quickLinks = [
        { href: "/shift/open", label: "เปิดกะ", description: "เริ่มงานแคชเชียร์ด้วยเงินทอนตั้งต้น" },
        { href: "/pos", label: "POS", description: "จัดการการขาย, ตะกร้า และการชำระเงินหน้าเคาน์เตอร์" },
        { href: "/members", label: "สมาชิก", description: "ดูข้อมูลสมาชิก แพ็กเกจ วันเริ่มใช้ และวันหมดอายุ" },
        { href: "/expenses", label: "รายจ่าย", description: "บันทึกรายจ่ายและตรวจสอบบัญชีรายจ่ายที่ใช้งานอยู่" },
        { href: "/coa", label: "ผังบัญชี", description: "ตรวจบัญชีรายได้และค่าใช้จ่ายจากฐานข้อมูลจริง และปรับสถานะบัญชีได้" },
        { href: "/admin/attendance", label: "attendance ทีม", description: "ดูเวลาเข้าออก สรุปรายคนย้อนหลัง และยอดมาสายหรือมาก่อนของทีมหน้าร้าน" },
        { href: "/admin/users", label: "สร้างผู้ใช้", description: "สร้าง user ใหม่พร้อม username และ password เพื่อใช้งานจริง" },
        { href: "/reports/daily-summary", label: "สรุปยอด", description: "ดูยอดรวมรายวัน รายสัปดาห์ รายเดือน หรือช่วงเวลาที่กำหนด" },
        { href: "/reports/shift-summary", label: "สรุปกะ", description: "ดูโครงรายงานกระทบยอดกะและสถานะข้อมูลที่เชื่อมแล้ว" },
        { href: "/reports/profit-loss", label: "กำไรขาดทุน", description: "ดูรายได้ รายจ่าย และผลการดำเนินงานแบบ real-time จากฐานข้อมูลจริง" },
    ];

    useEffect(() => {
        let ignore = false;

        async function loadAttendanceData() {
            if (!session) {
                return;
            }

            try {
                if (session.role === "ADMIN" || session.role === "CASHIER") {
                    const status = await fetchJson<AttendanceStatusRecord>("/api/v1/attendance/status");
                    if (!ignore) {
                        setAttendanceStatus(status);
                    }
                }

            } catch (error) {
                if (!ignore) {
                    const message =
                        typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
                            ? error.message
                            : "ไม่สามารถโหลดข้อมูล attendance ได้";
                    setAttendanceError(message);
                }
            }
        }

        void loadAttendanceData();

        return () => {
            ignore = true;
        };
    }, [session]);

    async function reloadAttendanceStatus() {
        if (!session) {
            return;
        }

        if (session.role !== "ADMIN" && session.role !== "CASHIER") {
            return;
        }

        const status = await fetchJson<AttendanceStatusRecord>("/api/v1/attendance/status");
        setAttendanceStatus(status);
    }

    async function handleCheckIn() {
        if (!session) {
            return;
        }

        setAttendanceError(null);
        setAttendanceMessage(null);
        setIsAttendanceBusy(true);

        try {
            const response = await fetchJson<{ attendance: StaffAttendanceRecord; warning: { code: string; message: string } | null }>(
                "/api/v1/attendance/check-in",
                {
                    method: "POST",
                },
            );
            await reloadAttendanceStatus();
            const message = response.warning?.message ?? "ลงชื่อเข้างานเรียบร้อยแล้ว";
            setAttendanceMessage(message);

            if (response.warning) {
                window.alert(message);
            }
        } catch (error) {
            setAttendanceError(
                typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
                    ? error.message
                    : "ไม่สามารถลงชื่อเข้างานได้",
            );
        } finally {
            setIsAttendanceBusy(false);
        }
    }

    async function handleCheckOut() {
        if (!session) {
            return;
        }

        setAttendanceError(null);
        setAttendanceMessage(null);
        setIsAttendanceBusy(true);

        try {
            await fetchJson("/api/v1/attendance/check-out", {
                method: "POST",
            });
            await reloadAttendanceStatus();
            setAttendanceMessage("ลงชื่อออกงานเรียบร้อยแล้ว");
        } catch (error) {
            setAttendanceError(
                typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
                    ? error.message
                    : "ไม่สามารถลงชื่อออกงานได้",
            );
        } finally {
            setIsAttendanceBusy(false);
        }
    }

    if (!session) {
        return null;
    }

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

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                {session.role === "ADMIN" || session.role === "CASHIER" ? (
                    <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">ลงชื่อเข้างานประจำวัน</p>
                        <h2 className="mt-3 text-2xl font-semibold text-foreground">เช็กเวลาเข้างานและออกงาน</h2>
                        <p className="mt-3 text-sm leading-7 text-muted">
                            owner ต้องอนุมัติ browser ของเครื่องลงเวลาไว้ก่อนจึงจะ check-in ได้ โดยกติกานี้ใช้เฉพาะตอนลงชื่อเข้างาน ไม่ได้บล็อกการ login จากเครื่องอื่น และ check-out จะทำได้หลังปิดกะเรียบร้อยแล้วเท่านั้น
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-3xl border border-line bg-background/70 p-4">
                                <p className="text-sm text-muted">เครื่องปัจจุบัน</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">{attendanceStatus?.current_ip ?? "ไม่พบ IP"}</p>
                            </div>
                            <div className="rounded-3xl border border-line bg-background/70 p-4">
                                <p className="text-sm text-muted">สิทธิ์เครื่องสำหรับเข้างาน</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">
                                    {attendanceStatus?.device_allowed ? "พร้อมใช้งาน" : "ยังไม่ได้รับอนุญาต"}
                                </p>
                            </div>
                            <div className="rounded-3xl border border-line bg-background/70 p-4">
                                <p className="text-sm text-muted">เครื่องลงเวลาที่อนุมัติ</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">{attendanceStatus?.active_device?.label ?? "ยังไม่ได้ตั้งค่า"}</p>
                            </div>
                        </div>

                        {attendanceStatus?.today ? (
                            <div className="mt-5 rounded-3xl border border-line bg-background/70 p-5">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted">บันทึกของวันนี้</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">{formatWorkDate(attendanceStatus.today.work_date)}</p>
                                <p className="mt-2 text-sm text-muted">
                                    เข้า: {attendanceStatus.today.checked_in_at ? formatDateTime(attendanceStatus.today.checked_in_at) : "-"}
                                </p>
                                <p className="mt-1 text-sm text-muted">
                                    ออก: {attendanceStatus.today.checked_out_at ? formatDateTime(attendanceStatus.today.checked_out_at) : "-"}
                                </p>
                                <p className="mt-2 text-sm text-muted">
                                    สถานะมา: {attendanceStatus.today.arrival_status}
                                    {attendanceStatus.today.late_minutes > 0
                                        ? ` (${attendanceStatus.today.late_minutes} นาที)`
                                        : attendanceStatus.today.early_arrival_minutes > 0
                                            ? ` (${attendanceStatus.today.early_arrival_minutes} นาที)`
                                            : ""}
                                </p>
                            </div>
                        ) : null}

                        {attendanceError ? (
                            <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                                {attendanceError}
                            </div>
                        ) : null}

                        {attendanceMessage ? (
                            <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                                {attendanceMessage}
                            </div>
                        ) : null}

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleCheckIn()}
                                disabled={!attendanceStatus?.can_check_in || isAttendanceBusy}
                                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isAttendanceBusy ? "กำลังทำรายการ..." : "ลงชื่อเข้างาน"}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCheckOut()}
                                disabled={!attendanceStatus?.can_check_out || isAttendanceBusy}
                                className="rounded-full border border-line bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                ลงชื่อออกงาน
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">attendance ทีมหน้าร้าน</p>
                        <h2 className="mt-3 text-2xl font-semibold text-foreground">ย้ายสรุป attendance owner ไปหน้าแยกแล้ว</h2>
                        <p className="mt-3 text-sm leading-7 text-muted">
                            ใช้หน้า attendance ทีม เพื่อดูเวลาเข้าออกของวันนี้, สรุปรายวัน รายสัปดาห์ รายเดือน, หรือเลือกช่วงวันพร้อมดูย้อนหลังรายคนแบบเต็มหน้า
                        </p>
                        <div className="mt-5 rounded-3xl border border-line bg-background/70 p-5">
                            <p className="text-sm leading-7 text-muted">
                                หน้านี้คงไว้เป็นภาพรวมเริ่มงาน ส่วน attendance owner แบบละเอียดถูกย้ายออกไปเพื่อให้ดูรายวันและย้อนหลังได้เต็มพื้นที่มากขึ้น
                            </p>
                            <Link
                                href="/admin/attendance"
                                className="mt-4 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                            >
                                ไปหน้า attendance ทีม
                            </Link>
                        </div>
                    </div>
                )}

                <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">เงื่อนไขเวลาเข้างาน</p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
                        <li>admin และ cashier ต้องลงชื่อเข้างานจาก browser ของเครื่องที่ owner อนุมัติเท่านั้น</li>
                        <li>การ login เข้าใช้งานระบบจากเครื่องอื่นยังทำได้ แต่ถ้าไม่ใช่เครื่องที่อนุมัติจะกดเข้างานไม่ได้</li>
                        <li>หากมาสาย ระบบจะแจ้งเตือนทันทีหลัง check-in พร้อมนับจำนวนนาที</li>
                        <li>check-out จะเปิดได้เมื่อไม่มีกะเปิดค้างอยู่ในระบบแล้ว</li>
                        <li>owner สามารถอนุมัติเครื่องลงเวลาได้จากหน้าสร้างผู้ใช้เพื่อควบคุมรอบงานจริง</li>
                    </ul>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {quickLinks
                    .filter((item) => item.href !== "/reports/daily-summary" || session.role !== "CASHIER")
                    .filter((item) => item.href !== "/coa" || session.role !== "CASHIER")
                    .filter((item) => item.href !== "/reports/profit-loss" || session.role === "OWNER")
                    .filter((item) => generalLedgerEnabled || item.href !== "/reports/general-ledger")
                    .filter((item) => item.href !== "/admin/users" || session.role === "OWNER")
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