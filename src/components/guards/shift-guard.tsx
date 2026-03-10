"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";

export function ShiftGuard({ children }: { children: ReactNode }) {
  const { session, activeShift, status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (!session?.active_shift_id || !activeShift) {
    return (
      <div className="rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">ต้องเปิดกะก่อน</p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">หน้านี้จะใช้งานได้เมื่อมีกะที่เปิดอยู่</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          POS และเงินสดย่อยถูก guard ไว้เพื่อให้ลำดับงานตรงกับกติกาบัญชีของ Phase 1
        </p>
        <Link
          href="/shift/open"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
        >
          ไปเปิดกะ
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}