"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { getErrorMessage } from "@/lib/utils";

function todayAsInput() {
  return new Date().toISOString().slice(0, 10);
}

function parseFilenameFromContentDisposition(headerValue: string | null, fallback: string) {
  if (!headerValue) {
    return fallback;
  }

  const match = headerValue.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export default function GeneralLedgerPage() {
  const [startDate, setStartDate] = useState(todayAsInput);
  const [endDate, setEndDate] = useState(todayAsInput);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleDownload() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!startDate || !endDate) {
      setErrorMessage("กรุณาระบุวันเริ่มต้นและวันสิ้นสุด");
      return;
    }

    setIsDownloading(true);

    try {
      const fallbackFileName = `general-ledger-${startDate}-to-${endDate}.csv`;
      const response = await fetch(`/api/v1/reports/gl?start_date=${startDate}&end_date=${endDate}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let body: { message?: string } | null = null;
        try {
          body = (await response.json()) as { message?: string };
        } catch {
          body = null;
        }

        throw new Error(body?.message ?? "ไม่สามารถดาวน์โหลดรายงาน GL ได้");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fileName = parseFilenameFromContentDisposition(response.headers.get("Content-Disposition"), fallbackFileName);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setSuccessMessage(`ระบบเริ่มดาวน์โหลดไฟล์ ${fileName} แล้ว`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถดาวน์โหลดรายงาน GL ได้"));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">General Ledger จาก backend truth</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">General Ledger</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            ดาวน์โหลดรายการสมุดรายวันแยกประเภทจากข้อมูล journal ในฐานข้อมูลจริง โดยกำหนดช่วงวันที่ที่ต้องการแล้ว export เป็น CSV ได้ทันที
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block">
              <span className="text-sm font-medium text-foreground">วันเริ่มต้น</span>
              <input
                type="date"
                aria-label="วันเริ่มต้น"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">วันสิ้นสุด</span>
              <input
                type="date"
                aria-label="วันสิ้นสุด"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? "กำลังเตรียมไฟล์..." : "ดาวน์โหลด CSV"}
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
              {successMessage}
            </div>
          ) : null}
        </section>
      </div>
    </RoleGuard>
  );
}
