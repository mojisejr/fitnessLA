"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { getMemberRegistrySnapshot, subscribeMemberRegistry } from "@/features/members/member-registry";
import { formatDate, formatDateTime } from "@/lib/utils";

function referenceDateAsInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function MembersPage() {
  const [referenceDate, setReferenceDate] = useState(referenceDateAsInput);
  const memberRegistry = useSyncExternalStore(
    subscribeMemberRegistry,
    getMemberRegistrySnapshot,
    getMemberRegistrySnapshot,
  );

  const memberRows = useMemo(() => {
    const reference = new Date(`${referenceDate}T23:59:59`);

    return memberRegistry.map((member) => {
      const expiresAt = new Date(member.expires_at);
      const startsAt = new Date(member.started_at);

      let statusLabel = "ใช้งานอยู่";
      if (member.renewal_status === "RENEWED") {
        statusLabel = "ต่ออายุแล้ว";
      } else if (expiresAt < reference) {
        statusLabel = "หมดอายุและยังไม่ต่อ";
      } else if (expiresAt.toISOString().slice(0, 10) === referenceDate) {
        statusLabel = "หมดอายุวันนี้";
      }

      return {
        ...member,
        expiresAt,
        startsAt,
        statusLabel,
      };
    });
  }, [memberRegistry, referenceDate]);

  const expiringMembers = memberRows.filter((member) => member.statusLabel === "หมดอายุวันนี้");
  const expiredMembers = memberRows.filter((member) => member.statusLabel === "หมดอายุและยังไม่ต่อ");

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Mock membership registry</p>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">สมาชิกและวันหมดอายุ</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                หน้านี้เป็น mockup data ที่เตรียมไว้สำหรับต่อ API และฐานข้อมูลในรอบถัดไป โดยแยก daily, monthly, 3-month, 6-month, yearly และจะเพิ่มสมาชิกใหม่ทันทีเมื่อขายแพ็กเกจจากหน้า POS สำเร็จ
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-foreground">ดูสถานะ ณ วันที่</span>
              <input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
                className="mt-2 rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs font-semibold text-muted">สมาชิกทั้งหมด</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{memberRows.length}</p>
          </div>
          <div className="rounded-[28px] border border-warning bg-warning-soft p-6">
            <p className="text-xs font-semibold text-foreground">หมดอายุวันนี้</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{expiringMembers.length}</p>
          </div>
          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs font-semibold text-muted">หมดอายุแล้วและยังไม่ต่อ</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{expiredMembers.length}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <div className="overflow-hidden rounded-3xl border border-line bg-[#161510]">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-[#0d0d0a]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted">สมาชิก</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">แพ็กเกจ</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">เริ่มใช้</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">วันหมดอายุ</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">เข้าใช้ล่าสุด</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {memberRows.map((member) => (
                  <tr key={String(member.member_id)}>
                    <td className="px-4 py-4 text-[#f3e8ba]">
                      <p className="font-semibold">{member.full_name}</p>
                      <p className="text-xs text-muted">{member.member_code} · {member.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-[#f3e8ba]">{member.membership_name}</td>
                    <td className="px-4 py-4 text-[#f3e8ba]">{formatDate(member.started_at)}</td>
                    <td className="px-4 py-4 text-[#f3e8ba]">{formatDate(member.expires_at)}</td>
                    <td className="px-4 py-4 text-[#f3e8ba]">{member.checked_in_at ? formatDateTime(member.checked_in_at) : "ยังไม่เช็กอิน"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.statusLabel === "หมดอายุและยังไม่ต่อ" ? "bg-warning-soft text-foreground" : member.statusLabel === "หมดอายุวันนี้" ? "bg-accent text-black" : "bg-accent-soft text-foreground"}`}>
                        {member.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}