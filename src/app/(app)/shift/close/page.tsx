"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMockSession } from "@/features/auth/mock-session-provider";
import { formatCurrency, getErrorMessage } from "@/lib/utils";

export default function CloseShiftPage() {
  const { closeShift, clearLastClosedShift, lastClosedShift, activeShift, session } = useMockSession();
  const [actualCash, setActualCash] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = Number(actualCash);

    if (Number.isNaN(parsed) || parsed < 0) {
      setErrorMessage("เงินสดที่นับได้ต้องเป็นศูนย์หรือมากกว่า");
      return;
    }

    setIsSubmitting(true);

    try {
      await closeShift(parsed, closingNote);
      setActualCash("");
      setClosingNote("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถปิดกะได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canRenderCloseFlow = Boolean(session?.active_shift_id && activeShift) || Boolean(lastClosedShift);

  if (!canRenderCloseFlow) {
    return (
      <div className="rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">ต้องเปิดกะก่อน</p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">หน้านี้เริ่มใช้งานได้เมื่อมีกะที่เปิดอยู่</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          หลังปิดกะสำเร็จ หน้านี้ยังค้างผลลัพธ์ไว้ให้ตรวจสอบได้ แต่ต้องมีกะก่อนจึงจะเริ่ม blind drop ได้
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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">Blind drop</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">ปิดกะ</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          หน้านี้จะไม่แสดงยอดคาดหวังก่อนกดยืนยัน โดยยอดนั้นจะแสดงหลังผลปิดกะตอบกลับเท่านั้น
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-foreground">เงินสดที่นับได้จริง</span>
            <input
              inputMode="decimal"
              value={actualCash}
              onChange={(event) => setActualCash(event.target.value)}
              placeholder="กรอกจำนวนเงินที่นับได้"
              className="mt-2 w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">หมายเหตุปิดกะ</span>
            <textarea
              value={closingNote}
              onChange={(event) => setClosingNote(event.target.value)}
              rows={4}
              placeholder="บันทึกหมายเหตุเพิ่มเติมได้ถ้าต้องการ"
              className="mt-2 w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !activeShift}
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "กำลังปิดกะ..." : "ส่งผล blind drop"}
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-muted">ผลการปิดกะ</p>
        {!lastClosedShift ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-line bg-background p-6">
            <h2 className="text-xl font-semibold text-foreground">ยอดคาดหวังยังถูกซ่อนไว้ตามตั้งใจ</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              ต้องส่งยอดที่นับได้จริงก่อน แล้วระบบจะแสดงยอดคาดหวัง, ผลต่าง และเลขอ้างอิงรายการบัญชี
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-line bg-background p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted">ยอดคาดหวัง</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(lastClosedShift.expected_cash)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">ยอดที่นับได้</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(lastClosedShift.actual_cash)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">ผลต่าง</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(lastClosedShift.difference)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">เลขที่สมุดรายวัน</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">#{lastClosedShift.journal_entry_id}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[20px] bg-accent-soft px-4 py-3 text-sm font-medium text-foreground">
              {lastClosedShift.difference === 0
                ? "ไม่พบส่วนต่าง"
                : lastClosedShift.difference < 0
                  ? "พบเงินสดขาด"
                  : "พบเงินสดเกิน"}
            </div>

            <button
              type="button"
              onClick={clearLastClosedShift}
              className="mt-5 rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
            >
              ล้างผลลัพธ์นี้
            </button>
          </div>
        )}
      </section>
    </div>
  );
}