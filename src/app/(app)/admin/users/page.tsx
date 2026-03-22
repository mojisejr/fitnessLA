"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { CreateAdminUserInput } from "@/features/adapters/types";
import type {
  AttendanceDeviceStatusRecord,
  BulkDeleteManagedUsersResult,
  DeleteManagedUserResult,
  ManagedStaffUserRecord,
  StaffAttendanceRecord,
} from "@/lib/contracts";
import { getErrorMessage } from "@/lib/utils";

const roleLabel = {
  OWNER: "เจ้าของ",
  ADMIN: "แอดมิน",
  CASHIER: "แคชเชียร์",
} as const;

type AdminUsersResponse = {
  users: ManagedStaffUserRecord[];
  attendance_rows: StaffAttendanceRecord[];
};

type UserSettingsDraft = {
  scheduled_start_time: string;
  scheduled_end_time: string;
  allowed_machine_ip: string;
};

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
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(`${dateKey}T00:00:00+07:00`),
  );
}

function formatScheduleWindow(user: ManagedStaffUserRecord) {
  if (!user.scheduled_start_time || !user.scheduled_end_time) {
    return "ยังไม่ได้กำหนดเวลางาน";
  }

  return `${user.scheduled_start_time} - ${user.scheduled_end_time}`;
}

function mapManagedUserToDeleteResult(user: ManagedStaffUserRecord): DeleteManagedUserResult {
  if (user.role !== "ADMIN" && user.role !== "CASHIER") {
    throw new Error("ลบได้เฉพาะ admin และ cashier เท่านั้น");
  }

  return {
    user_id: user.user_id,
    full_name: user.full_name,
    username: user.username,
    role: user.role,
  };
}

export default function AdminUsersPage() {
  const adapter = useAppAdapter();
  const [managedUsers, setManagedUsers] = useState<ManagedStaffUserRecord[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<StaffAttendanceRecord[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "ADMIN" | "CASHIER">("CASHIER");
  const [scheduledStartTime, setScheduledStartTime] = useState("08:00");
  const [scheduledEndTime, setScheduledEndTime] = useState("17:00");
  const [userSettingsDrafts, setUserSettingsDrafts] = useState<Record<string, UserSettingsDraft>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(adapter.mode === "real");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [attendanceDeviceStatus, setAttendanceDeviceStatus] = useState<AttendanceDeviceStatusRecord | null>(null);
  const [attendanceDeviceLabel, setAttendanceDeviceLabel] = useState("เครื่องลงเวลาเข้างานหน้าร้าน");
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);

  async function loadOwnerData() {
    if (adapter.mode !== "real") {
      return;
    }

    setIsLoadingData(true);
    setLoadError(null);

    try {
      const response = await fetchJson<AdminUsersResponse>("/api/v1/admin/users");
      setManagedUsers(response.users);
      setAttendanceRows(response.attendance_rows);
      setSelectedUserIds((current) => current.filter((userId) => response.users.some((user) => String(user.user_id) === userId)));
      setUserSettingsDrafts(
        Object.fromEntries(
          response.users.map((user) => [
            String(user.user_id),
            {
              scheduled_start_time: user.scheduled_start_time ?? "",
              scheduled_end_time: user.scheduled_end_time ?? "",
              allowed_machine_ip: user.allowed_machine_ip ?? "",
            },
          ]),
        ),
      );
    } catch (error) {
      setLoadError(getErrorMessage(error, "ไม่สามารถโหลดรายชื่อพนักงานได้"));
    } finally {
      setIsLoadingData(false);
    }
  }

  async function loadAttendanceDeviceStatus() {
    if (adapter.mode !== "real") {
      setAttendanceDeviceStatus({
        current_ip: "127.0.0.1",
        current_user_agent: "mock-browser",
        current_device_authorized: false,
        active_device: null,
      });
      return;
    }

    try {
      const response = await fetchJson<AttendanceDeviceStatusRecord>("/api/v1/attendance/device");
      setAttendanceDeviceStatus(response);
    } catch (error) {
      setAttendanceDeviceStatus(null);
      setLoadError((current) => current ?? getErrorMessage(error, "ไม่สามารถโหลดสถานะเครื่องลงเวลาได้"));
    }
  }

  useEffect(() => {
    void loadOwnerData();
    void loadAttendanceDeviceStatus();
  }, [adapter.mode]);

  const attendanceSummary = useMemo(() => {
    const lateCount = attendanceRows.filter((row) => row.arrival_status === "LATE").length;
    const earlyCount = attendanceRows.filter((row) => row.arrival_status === "EARLY").length;
    const onTimeCount = attendanceRows.filter((row) => row.arrival_status === "ON_TIME").length;

    return { lateCount, earlyCount, onTimeCount };
  }, [attendanceRows]);

  const selectedUsersCount = selectedUserIds.length;

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const payload: CreateAdminUserInput = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      username: username.trim(),
      password,
      role,
      scheduled_start_time: scheduledStartTime,
      scheduled_end_time: scheduledEndTime,
    };

    if (payload.full_name.length < 3) {
      setErrorMessage("ชื่อพนักงานต้องยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }

    if (!/^[a-z0-9._-]{3,}$/i.test(payload.username)) {
      setErrorMessage("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง, ขีดกลาง");
      return;
    }

    if (!/^[0-9+()\-\s]{8,30}$/.test(payload.phone)) {
      setErrorMessage("กรุณากรอกเบอร์โทรอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (payload.password.length < 8) {
      setErrorMessage("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setIsSubmitting(true);

    try {
      const createdUser = await adapter.createAdminUser(payload);
      setFullName("");
      setPhone("");
      setUsername("");
      setPassword("");
      setRole("CASHIER");
      setScheduledStartTime("08:00");
      setScheduledEndTime("17:00");
      setStatusMessage(
        `สร้าง user ${createdUser.username} เรียบร้อยแล้ว สามารถนำ username/password นี้ไป login และลงชื่อเข้างานได้ทันที`,
      );

      if (adapter.mode === "real") {
        await loadOwnerData();
      } else {
        const managedRecord: ManagedStaffUserRecord = {
          ...createdUser,
          scheduled_start_time: createdUser.scheduled_start_time ?? payload.scheduled_start_time ?? null,
          scheduled_end_time: createdUser.scheduled_end_time ?? payload.scheduled_end_time ?? null,
          allowed_machine_ip: createdUser.allowed_machine_ip ?? null,
          latest_attendance: null,
        };
        setManagedUsers((current) => [managedRecord, ...current]);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างผู้ใช้ได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveUserSettings(userId: string) {
    const draft = userSettingsDrafts[userId];
    if (!draft) {
      return;
    }

    setSavingUserId(userId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const updatedUser = await fetchJson<ManagedStaffUserRecord>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_start_time: draft.scheduled_start_time || null,
          scheduled_end_time: draft.scheduled_end_time || null,
          allowed_machine_ip: draft.allowed_machine_ip || null,
        }),
      });

      setManagedUsers((current) =>
        current.map((user) => (String(user.user_id) === userId ? updatedUser : user)),
      );
      setStatusMessage(`อัปเดตเวลางานสำหรับ ${updatedUser.full_name} แล้ว`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถบันทึกข้อมูลเวลางานได้"));
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleRegisterCurrentDevice() {
    setIsRegisteringDevice(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetchJson<{ device: { label: string } }>("/api/v1/attendance/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: attendanceDeviceLabel.trim() || undefined }),
      });
      await loadAttendanceDeviceStatus();
      setStatusMessage(`อนุมัติเครื่องนี้สำหรับลงเวลาแล้ว: ${response.device.label}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถอนุมัติเครื่องลงเวลาได้"));
    } finally {
      setIsRegisteringDevice(false);
    }
  }

  function removeDeletedUsersFromState(deletedUsers: Array<DeleteManagedUserResult>) {
    const deletedIds = new Set(deletedUsers.map((user) => String(user.user_id)));

    setManagedUsers((current) => current.filter((user) => !deletedIds.has(String(user.user_id))));
    setAttendanceRows((current) => current.filter((row) => !deletedIds.has(String(row.user_id))));
    setSelectedUserIds((current) => current.filter((userId) => !deletedIds.has(userId)));
    setUserSettingsDrafts((current) => {
      const next = { ...current };
      for (const deletedUser of deletedUsers) {
        delete next[String(deletedUser.user_id)];
      }
      return next;
    });
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((value) => value !== userId) : [...current, userId],
    );
  }

  async function handleDeleteUser(user: ManagedStaffUserRecord) {
    const userId = String(user.user_id);
    setDeletingUserId(userId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (adapter.mode === "real") {
        const deletedUser = await fetchJson<DeleteManagedUserResult>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
          method: "DELETE",
        });
        removeDeletedUsersFromState([deletedUser]);
        setStatusMessage(`ลบ ${deletedUser.full_name} (@${deletedUser.username}) เรียบร้อยแล้ว`);
      } else {
        removeDeletedUsersFromState([mapManagedUserToDeleteResult(user)]);
        setStatusMessage(`ลบ ${user.full_name} (@${user.username}) เรียบร้อยแล้ว`);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถลบผู้ใช้ได้"));
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleBulkDeleteSelectedUsers() {
    if (selectedUserIds.length === 0) {
      return;
    }

    setIsBulkDeleting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (adapter.mode === "real") {
        const deleted = await fetchJson<BulkDeleteManagedUsersResult>("/api/v1/admin/users/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_ids: selectedUserIds }),
        });
        removeDeletedUsersFromState(deleted.deleted_users);
        setStatusMessage(`ลบผู้ใช้ ${deleted.deleted_count} รายการเรียบร้อยแล้ว`);
      } else {
        const selectedSet = new Set(selectedUserIds);
        const deletedUsers = managedUsers
          .filter((user) => selectedSet.has(String(user.user_id)))
          .map(mapManagedUserToDeleteResult);
        removeDeletedUsersFromState(deletedUsers);
        setStatusMessage(`ลบผู้ใช้ ${deletedUsers.length} รายการเรียบร้อยแล้ว`);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถลบผู้ใช้ที่เลือกได้"));
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function formatDeviceSummary() {
    if (!attendanceDeviceStatus?.active_device) {
      return "ยังไม่ได้อนุมัติเครื่องลงเวลา";
    }

    return `${attendanceDeviceStatus.active_device.label}${attendanceDeviceStatus.active_device.registered_ip ? ` · ${attendanceDeviceStatus.active_device.registered_ip}` : ""}`;
  }

  function formatCurrentDeviceSummary() {
    if (!attendanceDeviceStatus) {
      return "กำลังโหลดข้อมูลเครื่องปัจจุบัน...";
    }

    return attendanceDeviceStatus.current_ip ? `IP ปัจจุบัน ${attendanceDeviceStatus.current_ip}` : "ยังไม่พบ IP ปัจจุบัน";
  }

  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">สร้างและกำกับ USER สำหรับใช้งานจริง</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">จัดการผู้ใช้และเวลาเข้างาน</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
            owner ใช้หน้านี้สร้าง admin และ cashier, กำหนดเวลาเข้างานและออกงาน, อนุมัติเครื่องสำหรับลงชื่อเข้างาน และตรวจตาราง attendance ย้อนหลังจากฐานข้อมูลจริง โดยการอนุมัติเครื่องนี้ใช้บังคับเฉพาะตอนกดเข้างาน ไม่ได้บล็อกการ login จากเครื่องอื่น
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">พนักงานในระบบ</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{managedUsers.length}</p>
            <p className="mt-2 text-sm text-muted">รวม admin และ cashier ที่ owner จัดการได้จากฐานจริง</p>
          </div>
          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">มาสาย</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{attendanceSummary.lateCount}</p>
            <p className="mt-2 text-sm text-muted">จำนวนรอบที่ check-in หลังเวลาเริ่มงานที่กำหนด</p>
          </div>
          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">เครื่องลงเวลา</p>
            <p className="mt-3 text-lg font-semibold text-foreground">{formatDeviceSummary()}</p>
            <p className="mt-2 text-sm text-muted">{formatCurrentDeviceSummary()}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">อนุมัติเครื่องลงเวลา</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">ใช้เครื่องนี้เป็นจุดลงเวลาเข้างานของร้าน</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              หลังจาก owner อนุมัติเครื่องนี้แล้ว browser เครื่องนี้จะถือ device token สำหรับกดเข้างานได้ ส่วนเครื่องหรือมือถืออื่นยัง login ได้ แต่จะลงเวลาเข้างานไม่ได้
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-line bg-background/70 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">เครื่องที่กำลังใช้งาน</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {attendanceDeviceStatus?.current_device_authorized ? "เครื่องนี้ได้รับอนุมัติแล้ว" : "เครื่องนี้ยังไม่ได้รับอนุมัติ"}
                </p>
                <p className="mt-2 text-sm text-muted">{formatCurrentDeviceSummary()}</p>
                <p className="mt-2 text-xs leading-6 text-muted line-clamp-3">
                  {attendanceDeviceStatus?.current_user_agent ?? "ไม่พบข้อมูล browser ปัจจุบัน"}
                </p>
              </div>
              <div className="rounded-3xl border border-line bg-background/70 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">เครื่องที่ระบบอนุมัติอยู่ตอนนี้</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{attendanceDeviceStatus?.active_device?.label ?? "ยังไม่ได้อนุมัติ"}</p>
                <p className="mt-2 text-sm text-muted">
                  {attendanceDeviceStatus?.active_device?.registered_ip ? `IP ล่าสุด ${attendanceDeviceStatus.active_device.registered_ip}` : "ยังไม่มี IP ที่บันทึกไว้"}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={attendanceDeviceLabel}
                onChange={(event) => setAttendanceDeviceLabel(event.target.value)}
                placeholder="ชื่อเครื่อง เช่น Front Desk Counter"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
              <button
                type="button"
                onClick={() => void handleRegisterCurrentDevice()}
                disabled={isRegisteringDevice}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRegisteringDevice ? "กำลังอนุมัติเครื่อง..." : "อนุมัติเครื่องนี้สำหรับลงเวลา"}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">สร้าง user ใหม่โดย owner เท่านั้น</p>
            <form className="mt-5 space-y-4" onSubmit={handleCreateUser}>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="ชื่อ"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                required
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="เบอร์โทร"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                required
              />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                required
              />
              <div className="grid gap-4 xl:grid-cols-2">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="password"
                  className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                  required
                />
                <select
                  aria-label="บทบาท"
                  value={role}
                  onChange={(event) => setRole(event.target.value as "OWNER" | "ADMIN" | "CASHIER")}
                  className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                >
                  <option value="OWNER">เจ้าของ</option>
                  <option value="CASHIER">แคชเชียร์</option>
                  <option value="ADMIN">แอดมิน</option>
                </select>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <label className="text-sm text-muted">
                  เวลาเข้างาน
                  <input
                    type="time"
                    value={scheduledStartTime}
                    onChange={(event) => setScheduledStartTime(event.target.value)}
                    className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                  />
                </label>
                <label className="text-sm text-muted">
                  เวลาออกงาน
                  <input
                    type="time"
                    value={scheduledEndTime}
                    onChange={(event) => setScheduledEndTime(event.target.value)}
                    className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                  />
                </label>
              </div>
              <p className="text-sm leading-7 text-muted">
                ผู้ใช้ใหม่จะใช้เครื่องลงเวลาร่วมกับเครื่องที่ owner อนุมัติไว้ด้านซ้าย ไม่ต้องกำหนด IP รายคนแล้ว
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "กำลังสร้างผู้ใช้..." : "สร้างผู้ใช้"}
              </button>
            </form>

            {errorMessage ? (
              <div className="mt-4 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                {errorMessage}
              </div>
            ) : null}

            {statusMessage ? (
              <div className="mt-4 rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                {statusMessage}
              </div>
            ) : null}

            <div className="mt-6 rounded-3xl border border-line bg-background/70 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">กติกาการทำงานปัจจุบัน</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-foreground">
                <li>owner เป็นคนเดียวที่สร้าง user และอนุมัติเครื่องสำหรับ check-in</li>
                <li>admin และ cashier จะลงชื่อเข้างานได้เมื่อใช้ browser ของเครื่องที่ owner อนุมัติไว้</li>
                <li>การ login จากเครื่องอื่นยังทำได้ แต่จะกดเข้างานไม่ได้</li>
                <li>check-out จะทำได้หลังปิดกะแล้วเท่านั้น เพื่อไม่ให้หลุดงานก่อนจบรอบหน้าร้าน</li>
              </ul>
            </div>
          </section>
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">รายชื่อ admin และ cashier</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">กำหนดเวลางานของพนักงาน</h2>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => void handleBulkDeleteSelectedUsers()}
                disabled={selectedUsersCount === 0 || isBulkDeleting}
                className="rounded-full border border-warning bg-warning-soft px-4 py-3 text-sm font-semibold text-foreground transition hover:border-warning disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkDeleting ? "กำลังลบ..." : `ลบที่เลือก ${selectedUsersCount > 0 ? `(${selectedUsersCount})` : ""}`}
              </button>
              <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground">
                {managedUsers.length} user
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="mt-6 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
              {loadError}
            </div>
          ) : null}

          {isLoadingData ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm leading-7 text-muted">
              กำลังโหลดรายชื่อพนักงานและตารางเวลา...
            </div>
          ) : managedUsers.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm leading-7 text-muted">
              ยังไม่มี admin หรือ cashier ในฐานข้อมูลจริง
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {managedUsers.map((user) => {
                const userId = String(user.user_id);
                const draft = userSettingsDrafts[userId] ?? {
                  scheduled_start_time: user.scheduled_start_time ?? "",
                  scheduled_end_time: user.scheduled_end_time ?? "",
                  allowed_machine_ip: user.allowed_machine_ip ?? "",
                };

                return (
                  <div key={userId} className="rounded-3xl border border-line bg-background/70 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`เลือก ${user.full_name}`}
                          checked={selectedUserIds.includes(userId)}
                          onChange={() => toggleUserSelection(userId)}
                          className="mt-1 h-5 w-5 rounded border-line bg-surface-strong"
                        />
                        <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">{roleLabel[user.role]}</p>
                        <h3 className="mt-2 text-xl font-semibold text-foreground">{user.full_name}</h3>
                        <p className="mt-1 text-sm text-muted">@{user.username}</p>
                        <p className="mt-1 text-sm text-muted">เวลางาน: {formatScheduleWindow(user)}</p>
                        <p className="mt-1 text-sm text-muted">ใช้เครื่องลงเวลา: {attendanceDeviceStatus?.active_device?.label ?? "ยังไม่ได้อนุมัติเครื่อง"}</p>
                        {user.latest_attendance ? (
                          <p className="mt-2 text-sm text-muted">
                            ล่าสุด {formatWorkDate(user.latest_attendance.work_date)} - {user.latest_attendance.arrival_status}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted">ยังไม่มี attendance log</p>
                        )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-96">
                        <label className="text-sm text-muted">
                          เข้างาน
                          <input
                            type="time"
                            value={draft.scheduled_start_time}
                            onChange={(event) =>
                              setUserSettingsDrafts((current) => ({
                                ...current,
                                [userId]: { ...draft, scheduled_start_time: event.target.value },
                              }))
                            }
                            className="mt-2 w-full rounded-[18px] border border-line bg-surface-strong px-3 py-2 text-foreground outline-none transition focus:border-accent"
                          />
                        </label>
                        <label className="text-sm text-muted">
                          ออกงาน
                          <input
                            type="time"
                            value={draft.scheduled_end_time}
                            onChange={(event) =>
                              setUserSettingsDrafts((current) => ({
                                ...current,
                                [userId]: { ...draft, scheduled_end_time: event.target.value },
                              }))
                            }
                            className="mt-2 w-full rounded-[18px] border border-line bg-surface-strong px-3 py-2 text-foreground outline-none transition focus:border-accent"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => void handleDeleteUser(user)}
                        disabled={deletingUserId === userId || isBulkDeleting}
                        className="rounded-full border border-warning bg-warning-soft px-4 py-2 text-sm font-semibold text-foreground transition hover:border-warning disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingUserId === userId ? "กำลังลบ..." : "ลบผู้ใช้"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveUserSettings(userId)}
                        disabled={savingUserId === userId || deletingUserId === userId}
                        className="rounded-full border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent-strong hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingUserId === userId ? "กำลังบันทึก..." : "บันทึกเวลางาน"}
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-muted">
                      เครื่องลงเวลาเป็นระดับร้าน ใช้ร่วมกันทั้งทีมหน้าร้าน ส่วนการ login จากเครื่องอื่นยังทำได้ตามปกติ
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">ตารางเข้างานออกงาน</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">ย้อนหลังล่าสุด</h2>
            </div>
            <p className="text-sm text-muted">ดูได้ทั้งเวลาเข้า เวลาออก มาสาย มาก่อนเวลา และสถานะออกงาน</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-4 py-2 font-medium">วันที่</th>
                  <th className="px-4 py-2 font-medium">พนักงาน</th>
                  <th className="px-4 py-2 font-medium">เวลาเข้า/ออก</th>
                  <th className="px-4 py-2 font-medium">กะที่กำหนด</th>
                  <th className="px-4 py-2 font-medium">สถานะมา</th>
                  <th className="px-4 py-2 font-medium">สถานะกลับ</th>
                  <th className="px-4 py-2 font-medium">เครื่อง</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="rounded-3xl border border-dashed border-line bg-background px-4 py-6 text-center text-muted">
                      ยังไม่มีข้อมูลลงชื่อเข้างานในฐานข้อมูลจริง
                    </td>
                  </tr>
                ) : (
                  attendanceRows.map((row) => (
                    <tr key={String(row.attendance_id)} className="rounded-3xl bg-background/70 text-foreground">
                      <td className="rounded-l-3xl px-4 py-4">{formatWorkDate(row.work_date)}</td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{row.full_name}</p>
                          <p className="text-xs text-muted">@{row.username} · {roleLabel[row.role]}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p>
                          เข้า {row.checked_in_at ? new Date(row.checked_in_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </p>
                        <p className="text-xs text-muted">
                          ออก {row.checked_out_at ? new Date(row.checked_out_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {row.scheduled_start_time && row.scheduled_end_time ? `${row.scheduled_start_time} - ${row.scheduled_end_time}` : "-"}
                      </td>
                      <td className="px-4 py-4">
                        {row.arrival_status}
                        {row.late_minutes > 0 ? ` (${row.late_minutes} นาที)` : row.early_arrival_minutes > 0 ? ` (${row.early_arrival_minutes} นาที)` : ""}
                      </td>
                      <td className="px-4 py-4">
                        {row.departure_status}
                        {row.early_leave_minutes > 0 ? ` (${row.early_leave_minutes} นาที)` : row.overtime_minutes > 0 ? ` (${row.overtime_minutes} นาที)` : ""}
                      </td>
                      <td className="rounded-r-3xl px-4 py-4">{row.machine_ip ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}
