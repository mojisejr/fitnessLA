"use client";

import { useEffect, useMemo, useState } from "react";

import { RoleGuard } from "@/components/guards/role-guard";
import type {
  AttendanceSummaryPeriod,
  AttendanceSummaryReport,
  StaffAttendanceRecord,
  StaffAttendanceSummaryRecord,
} from "@/lib/contracts";
import { getErrorMessage } from "@/lib/utils";

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

function formatTimeOnly(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildAttendanceSummaryUrl(input: {
  period: AttendanceSummaryPeriod;
  date?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}) {
  const params = new URLSearchParams({ period: input.period });

  if (input.period === "CUSTOM") {
    if (input.startDate) {
      params.set("start_date", input.startDate);
    }
    if (input.endDate) {
      params.set("end_date", input.endDate);
    }
  } else if (input.date) {
    params.set("date", input.date);
  }

  if (input.userId) {
    params.set("user_id", input.userId);
  }

  return `/api/v1/admin/users/attendance-summary?${params.toString()}`;
}

function getSummaryStatusLabel(status: StaffAttendanceSummaryRecord["summary_status"]) {
  switch (status) {
    case "ON_TIME":
      return "ตรงเวลา";
    case "EARLY":
      return "มาก่อนเวลา";
    case "LATE":
      return "มาสาย";
    case "MIXED":
      return "มีหลายสถานะ";
    default:
      return "ยังไม่มีข้อมูล";
  }
}

function getArrivalSummaryText(row: StaffAttendanceRecord) {
  if (row.late_minutes > 0) {
    return `มาสาย ${row.late_minutes} นาที`;
  }

  if (row.early_arrival_minutes > 0) {
    return `มาก่อน ${row.early_arrival_minutes} นาที`;
  }

  return row.arrival_status === "UNSCHEDULED" ? "ยังไม่มีกะกำหนด" : "ตรงเวลา";
}

function getDepartureSummaryText(row: StaffAttendanceRecord) {
  if (!row.checked_out_at) {
    return "ยังไม่ออกงาน";
  }

  if (row.early_leave_minutes > 0) {
    return `ออกก่อนเวลา ${row.early_leave_minutes} นาที`;
  }

  if (row.overtime_minutes > 0) {
    return `อยู่ต่อ ${row.overtime_minutes} นาที`;
  }

  return "ออกงานตามเวลา";
}

export default function AdminAttendancePage() {
  const todayDate = useMemo(() => getTodayDateKey(), []);
  const [todayReport, setTodayReport] = useState<AttendanceSummaryReport | null>(null);
  const [summaryReport, setSummaryReport] = useState<AttendanceSummaryReport | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState<AttendanceSummaryPeriod>("DAY");
  const [summaryDate, setSummaryDate] = useState(todayDate);
  const [summaryStartDate, setSummaryStartDate] = useState(todayDate);
  const [summaryEndDate, setSummaryEndDate] = useState(todayDate);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isTodayLoading, setIsTodayLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayAttendanceRows = useMemo(
    () => (todayReport?.filtered_attendance_rows ?? []).filter((row) => row.checked_in_at),
    [todayReport],
  );

  const summaryRows = summaryReport?.summary_rows ?? [];
  const selectedUserSummary = summaryRows.find((row) => String(row.user_id) === selectedUserId) ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadAttendanceSummary() {
      setIsTodayLoading(true);
      setIsSummaryLoading(true);
      setErrorMessage(null);

      try {
        const [nextTodayReport, nextSummaryReport] = await Promise.all([
          fetchJson<AttendanceSummaryReport>(buildAttendanceSummaryUrl({ period: "DAY", date: todayDate })),
          fetchJson<AttendanceSummaryReport>(
            buildAttendanceSummaryUrl({
              period: summaryPeriod,
              date: summaryDate,
              startDate: summaryStartDate,
              endDate: summaryEndDate,
              userId: selectedUserId || undefined,
            }),
          ),
        ]);

        if (isActive) {
          setTodayReport(nextTodayReport);
          setSummaryReport(nextSummaryReport);
        }
      } catch (error) {
        if (isActive) {
          setTodayReport(null);
          setSummaryReport(null);
          setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดสรุป attendance ได้"));
        }
      } finally {
        if (isActive) {
          setIsTodayLoading(false);
          setIsSummaryLoading(false);
        }
      }
    }

    void loadAttendanceSummary();

    return () => {
      isActive = false;
    };
  }, [selectedUserId, summaryDate, summaryEndDate, summaryPeriod, summaryStartDate, todayDate]);

  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">attendance ทีมหน้าร้าน</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">พนักงานที่เข้างาน วันนี้ กี่โมง ออกกี่โมง สายเท่าไหร่</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
            owner ดูเวลาเข้าออกของทีมวันนี้ได้ทันที และสลับดูสรุปรายคนย้อนหลังแบบรายวัน รายสัปดาห์ รายเดือน หรือเลือกช่วงวันที่ต้องการได้จากหน้าเดียว
          </p>
        </section>

        {errorMessage ? (
          <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-line bg-surface-strong p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">attendance วันนี้</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">ทีมที่ check-in วันนี้</h2>

          {isTodayLoading ? (
            <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-5 text-sm text-muted">
              กำลังโหลด attendance ของวันนี้...
            </div>
          ) : todayAttendanceRows.length > 0 ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {todayAttendanceRows.map((row) => (
                <div key={String(row.attendance_id)} className="rounded-3xl border border-line bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{row.full_name}</p>
                      <p className="text-sm text-muted">@{row.username} · {row.role}</p>
                    </div>
                    <p className="text-sm text-muted">
                      {row.scheduled_start_time && row.scheduled_end_time
                        ? `${row.scheduled_start_time} - ${row.scheduled_end_time}`
                        : "ยังไม่ตั้งกะเวลา"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">เข้างาน</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatTimeOnly(row.checked_in_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">ออกงาน</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatTimeOnly(row.checked_out_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">สถานะมา</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{getArrivalSummaryText(row)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted">สถานะกลับ: {getDepartureSummaryText(row)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-line bg-background p-5 text-sm text-muted">
              วันนี้ยังไม่มีพนักงานที่ check-in เข้างานในระบบ
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">สรุปรายคนย้อนหลัง</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">ดูรายวัน รายสัปดาห์ รายเดือน หรือเลือกช่วงวันที่ต้องการ</h2>
            </div>
            <div className="rounded-[18px] border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground">
              {summaryReport ? `${formatWorkDate(summaryReport.range_start)} - ${formatWorkDate(summaryReport.range_end)}` : "กำลังโหลดช่วงเวลา"}
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[180px_1fr_1fr_220px]">
            <label className="block">
              <span className="text-sm font-medium text-foreground">รูปแบบสรุป</span>
              <select
                aria-label="รูปแบบสรุป attendance"
                value={summaryPeriod}
                onChange={(event) => setSummaryPeriod(event.target.value as AttendanceSummaryPeriod)}
                className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              >
                <option value="DAY">รายวัน</option>
                <option value="WEEK">รายสัปดาห์</option>
                <option value="MONTH">รายเดือน</option>
                <option value="CUSTOM">เลือกช่วงวัน</option>
              </select>
            </label>

            {summaryPeriod === "CUSTOM" ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">วันเริ่มต้น</span>
                  <input
                    type="date"
                    aria-label="วันเริ่มต้น attendance"
                    value={summaryStartDate}
                    onChange={(event) => setSummaryStartDate(event.target.value)}
                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">วันสิ้นสุด</span>
                  <input
                    type="date"
                    aria-label="วันสิ้นสุด attendance"
                    value={summaryEndDate}
                    onChange={(event) => setSummaryEndDate(event.target.value)}
                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                  />
                </label>
              </>
            ) : (
              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-foreground">อ้างอิงวันที่</span>
                <input
                  type="date"
                  aria-label="วันที่อ้างอิง attendance"
                  value={summaryDate}
                  onChange={(event) => setSummaryDate(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-foreground">เลือกพนักงาน</span>
              <select
                aria-label="เลือกพนักงาน attendance"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              >
                <option value="">ทุกคน</option>
                {summaryRows.map((row) => (
                  <option key={String(row.user_id)} value={String(row.user_id)}>
                    {row.full_name} ({row.role})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isSummaryLoading ? (
            <div className="mt-5 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
              กำลังโหลดสรุป attendance...
            </div>
          ) : summaryRows.length > 0 ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 xl:grid-cols-2">
                {summaryRows.map((row) => (
                  <div key={String(row.user_id)} className="rounded-[22px] border border-line bg-[#161510] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{row.full_name}</p>
                        <p className="text-sm text-muted">@{row.username} · {row.role}</p>
                      </div>
                      <div className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-foreground">
                        {getSummaryStatusLabel(row.summary_status)}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">เข้างาน</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{row.checked_in_days} วัน</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">มาสายรวม</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{row.late_minutes_total} นาที</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">มาก่อนรวม</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{row.early_arrival_minutes_total} นาที</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">ออกงานครบ</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{row.checked_out_days} วัน</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted">
                      ล่าสุด {row.latest_work_date ? formatWorkDate(row.latest_work_date) : "ยังไม่มีข้อมูล"}
                      {row.latest_checked_in_at ? ` · เข้า ${formatTimeOnly(row.latest_checked_in_at)}` : ""}
                      {row.latest_checked_out_at ? ` · ออก ${formatTimeOnly(row.latest_checked_out_at)}` : ""}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-[22px] border border-line bg-[#161510] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">รายละเอียดตามช่วงที่เลือก</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {selectedUserSummary ? `ประวัติของ ${selectedUserSummary.full_name}` : "ประวัติรวมของทีมหน้าร้าน"}
                    </h3>
                  </div>
                  {selectedUserSummary ? (
                    <p className="text-sm text-muted">
                      สถานะรวม {getSummaryStatusLabel(selectedUserSummary.summary_status)} · มาสาย {selectedUserSummary.late_minutes_total} นาที · มาก่อน {selectedUserSummary.early_arrival_minutes_total} นาที
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3 text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="px-4 py-2 font-medium">วันที่</th>
                        <th className="px-4 py-2 font-medium">พนักงาน</th>
                        <th className="px-4 py-2 font-medium">เข้า</th>
                        <th className="px-4 py-2 font-medium">ออก</th>
                        <th className="px-4 py-2 font-medium">สถานะมา</th>
                        <th className="px-4 py-2 font-medium">สถานะกลับ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryReport?.filtered_attendance_rows.length ? (
                        summaryReport.filtered_attendance_rows.map((row) => (
                          <tr key={String(row.attendance_id)} className="rounded-3xl bg-background/70 text-foreground">
                            <td className="rounded-l-3xl px-4 py-4">{formatWorkDate(row.work_date)}</td>
                            <td className="px-4 py-4">
                              <p className="font-medium">{row.full_name}</p>
                              <p className="text-xs text-muted">@{row.username} · {row.role}</p>
                            </td>
                            <td className="px-4 py-4">{formatTimeOnly(row.checked_in_at)}</td>
                            <td className="px-4 py-4">{formatTimeOnly(row.checked_out_at)}</td>
                            <td className="px-4 py-4">{getArrivalSummaryText(row)}</td>
                            <td className="rounded-r-3xl px-4 py-4">{getDepartureSummaryText(row)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="rounded-3xl border border-dashed border-line bg-background px-4 py-6 text-center text-muted">
                            ไม่พบข้อมูล attendance ในช่วงที่เลือก
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-line bg-[#161510] p-4 text-sm text-muted">
              ยังไม่มีรายชื่อพนักงานหรือข้อมูล attendance สำหรับช่วงที่เลือก
            </div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}