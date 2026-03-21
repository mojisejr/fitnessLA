"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { MemberSubscriptionRecord } from "@/lib/contracts";
import { formatDate, getErrorMessage } from "@/lib/utils";

function referenceDateAsInput() {
    return new Date().toISOString().slice(0, 10);
}

type StatusFilter = "ALL" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "INACTIVE";

const statusFilterLabel: Record<StatusFilter, string> = {
    ALL: "ทั้งหมด",
    ACTIVE: "ใช้งานอยู่",
    EXPIRING_SOON: "ใกล้หมดอายุ",
    EXPIRED: "หมดอายุแล้ว",
    INACTIVE: "ปิดใช้งาน",
};

const renewalMethodLabel: Record<string, string> = {
    NONE: "-",
    EXTEND_FROM_PREVIOUS_END: "ต่ออายุ",
    RESTART_FROM_NEW_START: "เริ่มใหม่",
};

export default function MembersPage() {
    const adapter = useAppAdapter();
    const { session } = useAuth();
    const [referenceDate, setReferenceDate] = useState(referenceDateAsInput);
    const [memberRegistry, setMemberRegistry] = useState<MemberSubscriptionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadMembers = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const result = await adapter.listMembers();
            setMemberRegistry(result);
        } catch (error) {
            setMemberRegistry([]);
            setLoadError(getErrorMessage(error, "ไม่สามารถโหลดข้อมูลสมาชิกได้"));
        } finally {
            setIsLoading(false);
        }
    }, [adapter]);

    useEffect(() => {
        void loadMembers();
    }, [loadMembers]);

    const memberRows = useMemo(() => {
        const reference = new Date(`${referenceDate}T23:59:59`);
        const expiringSoonThreshold = new Date(reference);
        expiringSoonThreshold.setDate(expiringSoonThreshold.getDate() + 7);

        return memberRegistry.map((member) => {
            const expiresAt = new Date(member.expires_at);
            const startsAt = new Date(member.started_at);

            let statusLabel = "ใช้งานอยู่";
            let statusGroup: StatusFilter = "ACTIVE";
            if (!member.is_active) {
                statusLabel = "ปิดใช้งาน";
                statusGroup = "INACTIVE";
            } else if (member.renewal_status === "RENEWED") {
                statusLabel = "ต่ออายุแล้ว";
                statusGroup = "ACTIVE";
            } else if (expiresAt < reference) {
                statusLabel = "หมดอายุและยังไม่ต่อ";
                statusGroup = "EXPIRED";
            } else if (expiresAt <= expiringSoonThreshold) {
                statusLabel = "ใกล้หมดอายุ";
                statusGroup = "EXPIRING_SOON";
            }

            return {
                ...member,
                expiresAt,
                startsAt,
                statusLabel,
                statusGroup,
            };
        });
    }, [memberRegistry, referenceDate]);

    const filteredRows = useMemo(() => {
        let rows = memberRows;

        if (statusFilter !== "ALL") {
            rows = rows.filter((m) => m.statusGroup === statusFilter);
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            rows = rows.filter(
                (m) =>
                    m.full_name.toLowerCase().includes(q) ||
                    m.member_code.toLowerCase().includes(q) ||
                    m.phone.toLowerCase().includes(q),
            );
        }

        return rows;
    }, [memberRows, statusFilter, search]);

    const expiringMembers = memberRows.filter((m) => m.statusGroup === "EXPIRING_SOON");
    const expiredMembers = memberRows.filter((m) => m.statusGroup === "EXPIRED");
    const inactiveMembers = memberRows.filter((m) => m.statusGroup === "INACTIVE");
    const canEditMembers = session?.role === "OWNER";

    async function handleRenew(memberId: string | number) {
        setActionLoading(String(memberId));
        setActionError(null);
        try {
            await adapter.renewMember(memberId);
            await loadMembers();
        } catch (error) {
            setActionError(getErrorMessage(error, "ไม่สามารถต่ออายุได้"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRestart(memberId: string | number) {
        setActionLoading(String(memberId));
        setActionError(null);
        try {
            await adapter.restartMember(memberId);
            await loadMembers();
        } catch (error) {
            setActionError(getErrorMessage(error, "ไม่สามารถเริ่มใหม่ได้"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleToggleMember(member: MemberSubscriptionRecord) {
        const actionLabel = member.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน";
        if (!window.confirm(`${actionLabel}สมาชิก ${member.full_name} ใช่หรือไม่`)) {
            return;
        }

        setActionLoading(String(member.member_id));
        setActionError(null);
        try {
            await adapter.toggleMemberActive(member.member_id);
            await loadMembers();
        } catch (error) {
            setActionError(getErrorMessage(error, `ไม่สามารถ${actionLabel}สมาชิกได้`));
        } finally {
            setActionLoading(null);
        }
    }

    return (
        <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
            <div className="space-y-6">
                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold text-muted">ทะเบียนสมาชิก</p>
                            <h1 className="mt-3 text-3xl font-semibold text-foreground">สมาชิกและวันหมดอายุ</h1>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                                หน้านี้สรุปรายชื่อสมาชิกตามแพ็กเกจ วันเริ่มใช้ วันหมดอายุ และสถานะการต่ออายุ
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

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ค้นหาชื่อ รหัส หรือเบอร์โทร..."
                            className="w-full max-w-xs rounded-[18px] border border-line bg-surface-strong px-4 py-3 text-foreground outline-none transition focus:border-accent placeholder:text-muted"
                        />
                        <div className="flex gap-1">
                            {(["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED", "INACTIVE"] as StatusFilter[]).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setStatusFilter(f)}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${statusFilter === f
                                        ? "bg-accent text-black"
                                        : "border border-line bg-surface-strong text-foreground hover:border-accent hover:bg-accent-soft"
                                        }`}
                                >
                                    {statusFilterLabel[f]}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                        <p className="text-xs font-semibold text-muted">สมาชิกทั้งหมด</p>
                        <p className="mt-3 text-3xl font-semibold text-foreground">{memberRows.length}</p>
                    </div>
                    <div className="rounded-[28px] border border-warning bg-warning-soft p-6">
                        <p className="text-xs font-semibold text-foreground">ใกล้หมดอายุ (7 วัน)</p>
                        <p className="mt-3 text-3xl font-semibold text-foreground">{expiringMembers.length}</p>
                    </div>
                    <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                        <p className="text-xs font-semibold text-muted">หมดอายุแล้วและยังไม่ต่อ</p>
                        <p className="mt-3 text-3xl font-semibold text-foreground">{expiredMembers.length}</p>
                    </div>
                    <div className="rounded-[28px] border border-line bg-surface-strong p-6">
                        <p className="text-xs font-semibold text-muted">สมาชิกที่ปิดใช้งาน</p>
                        <p className="mt-3 text-3xl font-semibold text-foreground">{inactiveMembers.length}</p>
                    </div>
                </section>

                {actionError ? (
                    <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                        {actionError}
                    </div>
                ) : null}

                {!canEditMembers ? (
                    <div className="rounded-[20px] border border-line bg-background px-4 py-3 text-sm text-muted">
                        บัญชีนี้ดูข้อมูลสมาชิกได้อย่างเดียว การต่ออายุและเริ่มรอบใหม่สงวนสิทธิ์ไว้สำหรับ owner เท่านั้น
                    </div>
                ) : null}

                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                    {isLoading ? (
                        <div className="rounded-3xl border border-dashed border-line bg-[#161510] p-8 text-sm leading-7 text-muted">
                            กำลังโหลดสมาชิก...
                        </div>
                    ) : loadError ? (
                        <div className="rounded-3xl border border-warning bg-warning-soft p-8 text-sm leading-7 text-foreground">
                            {loadError}
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-line bg-[#161510] p-8 text-sm leading-7 text-muted">
                            {memberRows.length === 0
                                ? "ยังไม่มีสมาชิกในระบบตอนนี้ เมื่อขายแพ็กเกจสมาชิกผ่านหน้า POS แล้ว รายชื่อสมาชิกจะมาแสดงที่หน้านี้อัตโนมัติ"
                                : "ไม่พบสมาชิกที่ตรงกับเงื่อนไข"}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-3xl border border-line bg-[#161510]">
                            <table className="min-w-full divide-y divide-line text-sm">
                                <thead className="bg-[#0d0d0a]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">สมาชิก</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">แพ็กเกจ</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">เริ่มใช้</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">วันหมดอายุ</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">วิธีต่ออายุ</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">เทรนเนอร์</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">สถานะ</th>
                                        <th className="px-4 py-3 text-left font-semibold text-muted">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {filteredRows.map((member) => (
                                        <tr key={String(member.member_id)}>
                                            <td className="px-4 py-4 text-[#f3e8ba]">
                                                <p className="font-semibold">{member.full_name}</p>
                                                <p className="text-xs text-muted">{member.member_code} · {member.phone}</p>
                                            </td>
                                            <td className="px-4 py-4 text-[#f3e8ba]">{member.membership_name}</td>
                                            <td className="px-4 py-4 text-[#f3e8ba]">{formatDate(member.started_at)}</td>
                                            <td className="px-4 py-4 text-[#f3e8ba]">{formatDate(member.expires_at)}</td>
                                            <td className="px-4 py-4 text-[#f3e8ba]">{renewalMethodLabel[member.renewal_method ?? "NONE"] ?? "-"}</td>
                                            <td className="px-4 py-4 text-[#f3e8ba]">
                                                {member.training_summary?.trainer_name ? (
                                                    <div>
                                                        <p className="font-semibold">{member.training_summary.trainer_name}</p>
                                                        <p className="text-xs text-muted">{member.training_summary.training_package_name ?? ""}</p>
                                                    </div>
                                                ) : member.training_summary?.training_status === "UNASSIGNED" ? (
                                                    <span className="text-xs text-muted">ยังไม่มอบหมาย</span>
                                                ) : (
                                                    <span className="text-xs text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.statusGroup === "EXPIRED" ? "bg-warning-soft text-foreground" : member.statusGroup === "EXPIRING_SOON" ? "bg-accent text-black" : member.statusGroup === "INACTIVE" ? "bg-[#2d1d1d] text-[#f5d4d4]" : "bg-accent-soft text-foreground"}`}>
                                                    {member.statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {canEditMembers ? (
                                                    <div className="flex gap-2">
                                                        {member.is_active ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={actionLoading === String(member.member_id)}
                                                                    onClick={() => handleRenew(member.member_id)}
                                                                    className="rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-black disabled:opacity-50"
                                                                >
                                                                    ต่ออายุ
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={actionLoading === String(member.member_id)}
                                                                    onClick={() => handleRestart(member.member_id)}
                                                                    className="rounded-full border border-line bg-surface-strong px-3 py-1 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:opacity-50"
                                                                >
                                                                    เริ่มใหม่
                                                                </button>
                                                            </>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === String(member.member_id)}
                                                            onClick={() => void handleToggleMember(member)}
                                                            className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${member.is_active ? "border border-warning-soft bg-warning-soft text-foreground hover:border-[#f0c06b]" : "border border-accent bg-accent-soft text-foreground hover:bg-accent hover:text-black"}`}
                                                        >
                                                            {member.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted">ดูอย่างเดียว</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </RoleGuard>
    );
}