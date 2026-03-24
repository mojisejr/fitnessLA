"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoSlot } from "@/components/branding/logo-slot";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import { generalLedgerEnabled } from "@/lib/feature-flags";
import type { Role } from "@/lib/contracts";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type NavItem = {
    href: string;
    label: string;
    roles: Role[];
};

const navItems: NavItem[] = [
    { href: "/dashboard", label: "ภาพรวม", roles: ["OWNER", "ADMIN", "CASHIER"] },
    { href: "/shift/open", label: "เปิดกะ", roles: ["OWNER", "ADMIN", "CASHIER"] },
    { href: "/pos", label: "POS", roles: ["OWNER", "ADMIN", "CASHIER"] },
    { href: "/pos/products", label: "สินค้า POS", roles: ["OWNER", "ADMIN"] },
    { href: "/expenses", label: "รายจ่าย", roles: ["OWNER", "ADMIN", "CASHIER"] },
    { href: "/shift/close", label: "ปิดกะ", roles: ["OWNER", "ADMIN", "CASHIER"] },
    { href: "/members", label: "สมาชิก", roles: ["OWNER", "ADMIN"] },
    { href: "/trainers", label: "เทรนเนอร์", roles: ["OWNER", "ADMIN", "TRAINER"] },
    { href: "/coa", label: "ผังบัญชี", roles: ["OWNER", "ADMIN"] },
    { href: "/reports/daily-summary", label: "สรุปยอด", roles: ["OWNER", "ADMIN"] },
    { href: "/reports/shift-summary", label: "สรุปกะ", roles: ["OWNER", "ADMIN"] },
    { href: "/reports/profit-loss", label: "กำไรขาดทุน", roles: ["OWNER"] },
    { href: "/admin/attendance", label: "attendance ทีม", roles: ["OWNER"] },
    { href: "/admin/users", label: "สร้างผู้ใช้", roles: ["OWNER"] },
];

const roleTone: Record<Role, string> = {
    OWNER: "bg-accent text-black",
    ADMIN: "border border-line bg-[#262113] text-[#fff1b0]",
    CASHIER: "bg-warning text-black",
    TRAINER: "border border-line bg-[#13261f] text-[#b8f3d5]",
};

const roleLabel: Record<Role, string> = {
    OWNER: "เจ้าของ",
    ADMIN: "แอดมิน",
    CASHIER: "แคชเชียร์",
    TRAINER: "เทรนเนอร์",
};

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const adapter = useAppAdapter();
    const { session, activeShift, logout, switchRole, mode } = useAuth();
    const [activeShiftSales, setActiveShiftSales] = useState<number | null>(null);
    const showShiftStatus = session?.role !== "TRAINER";

    useEffect(() => {
        let isActive = true;

        async function loadActiveShiftSales() {
            if (!showShiftStatus || !activeShift) {
                setActiveShiftSales(null);
                return;
            }

            try {
                const result = await adapter.getDailySummary({
                    period: "DAY",
                    date: activeShift.opened_at.slice(0, 10),
                });
                const totalSales = result.sales_rows
                    .filter((row) => String(row.shift_id) === String(activeShift.shift_id))
                    .reduce((sum, row) => sum + row.total_amount, 0);

                if (isActive) {
                    setActiveShiftSales(Number(totalSales.toFixed(2)));
                }
            } catch {
                if (isActive) {
                    setActiveShiftSales(0);
                }
            }
        }

        void loadActiveShiftSales();

        return () => {
            isActive = false;
        };
    }, [adapter, activeShift, showShiftStatus]);

    if (!session) {
        return null;
    }

    if (session.role === "TRAINER" && pathname !== "/trainers") {
        return (
            <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
                <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl items-center">
                    <div className="w-full rounded-4xl border border-line bg-surface p-8 shadow-(--shadow) backdrop-blur md:p-10">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">trainer access</p>
                        <h1 className="mt-3 text-3xl font-semibold text-foreground">บัญชีเทรนเนอร์เปิดได้เฉพาะหน้าเทรนเนอร์</h1>
                        <p className="mt-3 text-sm leading-7 text-muted">
                            ระบบจำกัดสิทธิ์บทบาทนี้ให้ดูเฉพาะข้อมูลลูกเทรนของตัวเอง และไม่เปิดหน้าอื่นในฝั่งปฏิบัติการร้าน
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/trainers"
                                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
                            >
                                ไปหน้าเทรนเนอร์
                            </Link>
                            <button
                                type="button"
                                onClick={logout}
                                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-warning hover:bg-warning-soft"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const visibleNav = navItems.filter(
        (item) => item.roles.includes(session.role) && (generalLedgerEnabled || item.href !== "/reports/general-ledger"),
    );

    return (
        <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
            <div className="grid min-h-[calc(100vh-2rem)] w-full gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="rounded-4xl border border-line bg-surface p-5 shadow-(--shadow) backdrop-blur md:p-6">
                    <div className="rounded-4xl border border-[#f6d94a]/18 bg-[#0f0f0f] px-4 py-4 text-white">
                        <div className="flex items-center justify-between gap-4">
                            <LogoSlot className="h-25 w-25 rounded-4xl" />
                            <div className="text-right leading-[0.86] text-[#f6d94a]">
                                <h1 className="text-[3.35rem] font-extrabold tracking-[0.02em]">LA</h1>
                                <p className="mt-1 text-[3.35rem] font-extrabold tracking-[0.02em]">GYM</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-line bg-surface-strong p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold text-muted">ผู้ใช้งาน</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">{session.full_name}</p>
                                <p className="text-sm text-muted">@{session.username}</p>
                            </div>
                            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", roleTone[session.role])}>
                                {roleLabel[session.role]}
                            </span>
                        </div>

                        {showShiftStatus ? (
                            <div className="mt-4 rounded-2xl bg-accent-soft p-4">
                                <p className="text-xs font-semibold text-muted">สถานะกะ</p>
                                <p className="mt-2 text-lg font-semibold text-foreground">
                                    {activeShift ? "มีกะที่เปิดอยู่" : "ยังไม่มีกะที่เปิด"}
                                </p>
                                {activeShift ? (
                                    <>
                                        <p className="mt-1 text-sm text-muted">{formatDateTime(activeShift.opened_at)}</p>
                                        <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(activeShiftSales ?? 0)}</p>
                                        <p className="text-xs text-muted">เงินที่ทำได้</p>
                                    </>
                                ) : (
                                    <p className="mt-1 text-sm text-muted">เปิดกะก่อนเข้าใช้งาน POS หรือหน้ารายจ่าย</p>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <nav className="mt-5 space-y-2">
                        {visibleNav.map((item) => {
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                                        isActive
                                            ? "border-accent bg-accent text-black"
                                            : "border-line bg-surface-strong text-foreground hover:border-accent hover:bg-accent-soft",
                                    )}
                                >
                                    <span>{item.label}</span>
                                    <span className={cn("text-xs uppercase tracking-[0.12em] opacity-70 transition", isActive ? "text-black/70" : "group-hover:text-[#6f5711]")}>เปิด</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-5 rounded-3xl border border-line bg-surface-strong p-4">
                        {mode === "mock" ? (
                            <>
                                <p className="text-xs uppercase tracking-[0.16em] text-muted">สลับบทบาทในโหมดทดลอง</p>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {(["OWNER", "ADMIN", "CASHIER", "TRAINER"] as Role[]).map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => switchRole(role)}
                                            className={cn(
                                                "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                                                session.role === role
                                                    ? "bg-accent text-black"
                                                    : "bg-background text-foreground hover:bg-accent-soft hover:text-[#201703]",
                                            )}
                                        >
                                            {roleLabel[role]}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm leading-7 text-muted">
                                บทบาทในโหมดนี้อิงจาก backend และไม่สลับจาก client โดยตรง
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={logout}
                            className="mt-3 w-full rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-foreground transition hover:border-warning hover:bg-warning-soft"
                        >
                            {mode === "mock" ? "ออกจากโหมดทดลอง" : "ออกจากระบบ"}
                        </button>
                    </div>
                </aside>

                <main className="min-w-0 rounded-4xl border border-line bg-surface p-4 shadow-(--shadow) backdrop-blur md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}