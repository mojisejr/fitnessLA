"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoSlot } from "@/components/branding/logo-slot";
import { useMockSession } from "@/features/auth/mock-session-provider";
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
  { href: "/shift/close", label: "ปิดกะ", roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/pos", label: "POS", roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/expenses", label: "เงินสดย่อย", roles: ["OWNER", "ADMIN", "CASHIER"] },
  { href: "/coa", label: "ผังบัญชี", roles: ["OWNER"] },
  { href: "/admin/users", label: "จัดการผู้ใช้", roles: ["OWNER", "ADMIN"] },
  { href: "/reports/daily-summary", label: "สรุปรายวัน", roles: ["OWNER", "ADMIN"] },
  { href: "/reports/shift-summary", label: "สรุปกะ", roles: ["OWNER", "ADMIN"] },
  { href: "/reports/profit-loss", label: "กำไรขาดทุน", roles: ["OWNER"] },
  { href: "/reports/general-ledger", label: "สมุดรายวันแยกประเภท", roles: ["OWNER"] },
];

const roleTone: Record<Role, string> = {
  OWNER: "bg-accent text-black",
  ADMIN: "bg-foreground text-white border border-white/15",
  CASHIER: "bg-warning text-black",
};

const roleLabel: Record<Role, string> = {
  OWNER: "เจ้าของ",
  ADMIN: "แอดมิน",
  CASHIER: "แคชเชียร์",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, activeShift, logout, switchRole } = useMockSession();

  if (!session) {
    return null;
  }

  const visibleNav = navItems.filter((item) => item.roles.includes(session.role));

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-line bg-surface p-5 shadow-[var(--shadow)] backdrop-blur md:p-6">
          <div className="rounded-[24px] border border-[#f6d94a]/18 bg-[#0f0f0f] px-5 py-5 text-white">
            <LogoSlot />
            <p className="mt-5 text-xs uppercase tracking-[0.32em] text-white/56">fitnessLA</p>
            <h1 className="mt-3 text-2xl font-semibold">ศูนย์ควบคุมงานหน้าร้าน</h1>
            <p className="mt-2 text-sm leading-6 text-white/72">
              โหมด mock-first สำหรับคุมกะ, POS, เงินสดย่อย และงานบัญชีที่ต้องเดินต่อได้ก่อน backend ครบ
            </p>
          </div>

          <div className="mt-5 rounded-[24px] border border-line bg-surface-strong p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted">User</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{session.full_name}</p>
                <p className="text-sm text-muted">@{session.username}</p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", roleTone[session.role])}>
                {roleLabel[session.role]}
              </span>
            </div>

            <div className="mt-4 rounded-2xl bg-accent-soft p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-muted">สถานะกะ</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {activeShift ? "มีกะที่เปิดอยู่" : "ยังไม่มีกะที่เปิด"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {activeShift
                  ? `${formatDateTime(activeShift.opened_at)} · ${formatCurrency(activeShift.starting_cash)}`
                  : "เปิดกะก่อนเข้าใช้งาน POS หรือเงินสดย่อย"}
              </p>
            </div>
          </div>

          <nav className="mt-5 space-y-2">
            {visibleNav.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface-strong text-foreground hover:border-accent hover:bg-accent-soft",
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-xs uppercase tracking-[0.24em] opacity-70">เปิด</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-[24px] border border-line bg-surface-strong p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">สลับบทบาทใน mock</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["OWNER", "ADMIN", "CASHIER"] as Role[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => switchRole(role)}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                    session.role === role
                      ? "bg-accent text-black"
                      : "bg-background text-foreground hover:bg-accent-soft",
                  )}
                >
                  {roleLabel[role]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-3 w-full rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-foreground transition hover:border-warning hover:bg-warning-soft"
            >
              ออกจากระบบ mock
            </button>
          </div>
        </aside>

        <main className="rounded-[32px] border border-line bg-surface p-4 shadow-[var(--shadow)] backdrop-blur md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}