"use client";

import { useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { CreateAdminUserInput } from "@/features/adapters/types";
import type { AdminUserRecord } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/utils";

const roleLabel = {
  OWNER: "เจ้าของ",
  ADMIN: "แอดมิน",
  CASHIER: "แคชเชียร์",
} as const;

export default function AdminUsersPage() {
  const adapter = useAppAdapter();
  const [createdUsers, setCreatedUsers] = useState<AdminUserRecord[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "ADMIN" | "CASHIER">("CASHIER");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setCreatedUsers((current) => [createdUser, ...current]);
      setFullName("");
      setPhone("");
      setUsername("");
      setPassword("");
      setRole("CASHIER");
      setStatusMessage(`สร้าง user ${createdUser.username} เรียบร้อยแล้ว สามารถนำ username/password นี้ไป login ได้ทันที`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างผู้ใช้ได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["OWNER"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">สร้าง user สำหรับใช้งานจริง</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">สร้างผู้ใช้</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            หน้านี้ใช้สร้าง user ใหม่ลงฐานข้อมูลโดยตรง พร้อมสร้าง username และ password สำหรับ login ทันทีหลังบันทึกเสร็จ
          </p>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
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
              <p className="text-xs uppercase tracking-[0.16em] text-muted">แนวทางการทำงานปัจจุบัน</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-foreground">
                <li>owner เป็นคนเดียวที่สร้าง user จากหน้านี้ได้</li>
                <li>เมื่อบันทึกสำเร็จ ระบบจะสร้าง credential ลงฐานข้อมูลทันที</li>
                <li>user ใหม่สามารถใช้ username/password ที่ตั้งไว้เพื่อ login ได้ทันที</li>
              </ul>
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">ผลลัพธ์การสร้างล่าสุด</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">user ที่สร้างในรอบนี้</h2>
              </div>
              <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground">
                {createdUsers.length} user
              </div>
            </div>

            {createdUsers.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm leading-7 text-muted">
                ยังไม่มี user ที่สร้างในรอบนี้ เมื่อสร้างสำเร็จ ระบบจะแสดงข้อมูลล่าสุดไว้ตรงนี้เพื่อตรวจสอบรายละเอียด
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2 2xl:grid-cols-1">
                {createdUsers.map((user) => (
                  <div key={String(user.user_id)} className="rounded-3xl border border-line bg-background/70 p-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">{roleLabel[user.role as keyof typeof roleLabel]}</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">{user.full_name}</h3>
                    <p className="mt-1 text-sm text-muted">@{user.username}</p>
                    <p className="mt-2 text-sm text-muted">{user.phone ?? "ไม่ระบุเบอร์โทร"}</p>
                    <p className="mt-3 break-all text-xs uppercase tracking-[0.12em] text-muted">User ID: {String(user.user_id)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </RoleGuard>
  );
}
