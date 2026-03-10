"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import type { Role } from "@/lib/contracts";

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: ReactNode;
}) {
  const { session, status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (!session || !allowedRoles.includes(session.role)) {
    return (
      <div className="rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">ไม่มีสิทธิ์</p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">บทบาทของคุณยังเข้าใช้งานหน้านี้ไม่ได้</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          guard ฝั่ง frontend ยังอยู่เพื่อคุม flow แต่สุดท้าย backend ต้องบังคับสิทธิ์ซ้ำด้วย
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
        >
          กลับไปหน้าภาพรวม
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}