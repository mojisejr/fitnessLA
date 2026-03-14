"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { getErrorCode, getErrorMessage } from "@/lib/utils";

function todayAsInput() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

async function getDownloadErrorMessage(response: Response) {
  const fallback = "ไม่สามารถดาวน์โหลดสมุดรายวันแยกประเภทได้";

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const errorBody = await response.json().catch(() => null);
    const errorCode = getErrorCode(errorBody);

    if (errorCode === "UNAUTHENTICATED") {
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งก่อนดาวน์โหลดรายงาน";
    }

    if (errorCode === "FORBIDDEN") {
      return "บทบาทปัจจุบันไม่มีสิทธิ์ดาวน์โหลดสมุดรายวันแยกประเภท";
    }

    if (errorCode === "VALIDATION_ERROR") {
      return "รูปแบบวันที่ต้องเป็น YYYY-MM-DD";
    }

    if (errorCode === "INVALID_DATE_RANGE") {
      return "ช่วงวันที่ไม่ถูกต้อง กรุณาตรวจสอบวันเริ่มต้นและวันสิ้นสุด";
    }

    return getErrorMessage(errorBody, fallback);
  }

  if (response.status === 401) {
    return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งก่อนดาวน์โหลดรายงาน";
  }

  if (response.status === 403) {
    return "บทบาทปัจจุบันไม่มีสิทธิ์ดาวน์โหลดสมุดรายวันแยกประเภท";
  }

  return fallback;
}

export default function GeneralLedgerPage() {
  const [startDate, setStartDate] = useState(firstDayOfCurrentMonth);
  const [endDate, setEndDate] = useState(todayAsInput);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!startDate || !endDate) {
      setErrorMessage("กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดก่อนดาวน์โหลด");
      return;
    }

    if (startDate > endDate) {
      setErrorMessage("วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด");
      return;
    }

    setIsDownloading(true);

    try {
      const query = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      const response = await fetch(`/api/v1/reports/gl?${query.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setErrorMessage(await getDownloadErrorMessage(response));
        return;
      }

      const csvBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `general-ledger-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);

      setSuccessMessage(`ระบบเริ่มดาวน์โหลดไฟล์ general-ledger-${startDate}-to-${endDate}.csv แล้ว`);
    } catch {
      setErrorMessage("เกิดปัญหาเครือข่ายระหว่างดาวน์โหลดรายงาน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">รายงานบัญชีสำหรับเจ้าของและแอดมิน</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">สมุดรายวันแยกประเภท</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                ส่งออกรายการบัญชีเป็นไฟล์ CSV ตามช่วงวันที่ที่เลือก โดยใช้สิทธิ์ของผู้ใช้ปัจจุบันในการยืนยันการดาวน์โหลด
              </p>
            </div>

            <div className="rounded-[20px] bg-accent-soft px-4 py-3 text-sm text-foreground">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">ปลายทางข้อมูล</p>
              <p className="mt-2 font-semibold">GET /api/v1/reports/gl</p>
              <p className="text-xs text-muted">ใช้พารามิเตอร์: start_date, end_date</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">ดาวน์โหลดไฟล์ CSV</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">เลือกช่วงวันที่ก่อนดาวน์โหลด</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              ระบบจะส่งออกไฟล์ CSV ของสมุดรายวันแยกประเภทตามช่วงวันที่ที่เลือก ถ้าช่วงวันไม่ถูกต้องหรือสิทธิ์ไม่พอ
              จะมีข้อความแจ้งกลับทันทีในหน้านี้
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-foreground">วันเริ่มต้น</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">วันสิ้นสุด</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                />
              </label>
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

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด CSV"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(firstDayOfCurrentMonth());
                  setEndDate(todayAsInput());
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                disabled={isDownloading}
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                รีเซ็ตช่วงวันที่
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">เงื่อนไขก่อนดาวน์โหลด</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
                <p>ต้องกรอกทั้งวันเริ่มต้นและวันสิ้นสุด</p>
                <p>รูปแบบวันที่ต้องเป็น YYYY-MM-DD ตาม input date ของ browser</p>
                <p>วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">ผลลัพธ์ที่คาดหวัง</p>
              <div className="mt-4 rounded-3xl border border-line bg-[#161510] p-5 text-sm leading-7 text-foreground">
                <p>ไฟล์จะถูกตั้งชื่อในรูปแบบ general-ledger-YYYY-MM-DD-to-YYYY-MM-DD.csv</p>
                <p className="mt-3">เหมาะสำหรับเปิดใน Excel หรือส่งต่อทีมบัญชีเพื่อตรวจสอบ debit และ credit ตามช่วงวัน</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </RoleGuard>
  );
}