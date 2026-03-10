"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, mode } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">กำลังโหลด</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">กำลังเตรียมหน้าจอ...</h1>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">ต้องเข้าสู่ระบบ</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">กรุณาเข้าสู่ระบบก่อนใช้งาน</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {mode === "mock"
              ? "ตอนนี้ระบบใช้ mock session เพื่อให้พัฒนา flow ต่อได้ก่อน auth จริงพร้อม"
              : "ตอนนี้ระบบต้องมี session bridge จาก backend ก่อนจึงจะเข้าใช้งานหน้าที่ต้องยืนยันตัวตนได้"}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong"
          >
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}