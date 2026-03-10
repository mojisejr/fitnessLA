"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { formatCurrency, formatDateTime, getErrorMessage } from "@/lib/utils";

export default function OpenShiftPage() {
  const { activeShift, openShift } = useAuth();
  const [startingCash, setStartingCash] = useState("500");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const parsed = Number(startingCash);

    if (Number.isNaN(parsed) || parsed < 0) {
      setErrorMessage("เงินทอนตั้งต้นต้องเป็นศูนย์หรือมากกว่า");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await openShift(parsed);
      setSuccessMessage(`เปิดกะ #${result.shift_id} เมื่อ ${formatDateTime(result.opened_at)} เรียบร้อยแล้ว`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถเปิดกะได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">จุดเริ่มต้นของกะ</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">เปิดกะ</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          ระบบจะยังไม่ให้เข้า flow แคชเชียร์จนกว่าจะมีกะ เพื่อให้ POS และเงินสดย่อยตรงกับกติกาบัญชี
        </p>

        {activeShift ? (
          <div className="mt-6 rounded-[24px] border border-line bg-accent-soft p-5">
            <p className="text-sm font-semibold text-foreground">ตอนนี้มีกะที่เปิดอยู่แล้ว</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              เปิดเมื่อ {formatDateTime(activeShift.opened_at)} ด้วยเงินทอน {formatCurrency(activeShift.starting_cash)}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/pos" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black">
                ไปหน้า POS
              </Link>
              <Link href="/shift/close" className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground">
                ไปปิดกะ
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-foreground">เงินทอนตั้งต้น</span>
              <input
                inputMode="decimal"
                value={startingCash}
                onChange={(event) => setStartingCash(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังเปิดกะ..." : "ยืนยันเปิดกะ"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">หมายเหตุการเชื่อมต่อ</p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
          <li>เมื่อเปิดกะสำเร็จ session จะถูกอัปเดตทันทีเพื่อปลดล็อกหน้าที่ guard ไว้</li>
          <li>เงินทอนตั้งต้นถูกเก็บไว้เพื่อให้หน้าปิดกะคำนวณยอดคาดหวังได้ภายหลัง</li>
          <li>flow นี้ย้ายมาใช้ adapter แล้ว จึงสลับไป API จริงได้โดยไม่ต้องรื้อ UI อีกก้อน</li>
        </ul>
      </section>
    </div>
  );
}