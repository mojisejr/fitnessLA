"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { MemberSubscriptionRecord } from "@/lib/contracts";
import { formatDateTime, getErrorMessage } from "@/lib/utils";

function referenceDateAsInput() {
    return new Date().toISOString().slice(0, 10);
}

function datetimeLocalNow() {
    return new Date().toISOString().slice(0, 16);
}

function addDaysToDateTime(value: string, days: number) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return datetimeLocalNow();
    }

    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 16);
}

function toDateTimeInputValue(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return datetimeLocalNow();
    }

    return date.toISOString().slice(0, 16);
}

const membershipDurationDaysByPeriod = {
    DAILY: 1,
    MONTHLY: 30,
    QUARTERLY: 90,
    SEMIANNUAL: 180,
    YEARLY: 365,
} as const;

type MembershipPeriod = keyof typeof membershipDurationDaysByPeriod;

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
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [createFullName, setCreateFullName] = useState("");
    const [createPhone, setCreatePhone] = useState("");
    const [createMembershipName, setCreateMembershipName] = useState("");
    const [createMembershipPeriod, setCreateMembershipPeriod] = useState<MembershipPeriod>("MONTHLY");
    const [createStartedAt, setCreateStartedAt] = useState(datetimeLocalNow);
    const [createExpiresAt, setCreateExpiresAt] = useState(() => addDaysToDateTime(datetimeLocalNow(), 30));
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editStartedAt, setEditStartedAt] = useState("");
    const [editExpiresAt, setEditExpiresAt] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

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

    useEffect(() => {
        const registryIds = new Set(memberRegistry.map((member) => String(member.member_id)));
        setSelectedMemberIds((current) => current.filter((memberId) => registryIds.has(memberId)));
    }, [memberRegistry]);

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
    const filteredMemberIds = filteredRows.map((member) => String(member.member_id));
    const selectedVisibleCount = filteredMemberIds.filter((memberId) => selectedMemberIds.includes(memberId)).length;
    const allVisibleSelected = filteredMemberIds.length > 0 && selectedVisibleCount === filteredMemberIds.length;

    function resetCreateForm() {
        const startedAt = datetimeLocalNow();
        setCreateFullName("");
        setCreatePhone("");
        setCreateMembershipName("");
        setCreateMembershipPeriod("MONTHLY");
        setCreateStartedAt(startedAt);
        setCreateExpiresAt(addDaysToDateTime(startedAt, membershipDurationDaysByPeriod.MONTHLY));
    }

    function beginEditingMember(member: MemberSubscriptionRecord) {
        setEditingMemberId(String(member.member_id));
        setEditStartedAt(toDateTimeInputValue(member.started_at));
        setEditExpiresAt(toDateTimeInputValue(member.expires_at));
        setActionError(null);
        setActionMessage(null);
    }

    function toggleMemberSelection(memberId: string) {
        setSelectedMemberIds((current) =>
            current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
        );
    }

    function toggleSelectAllVisible() {
        setSelectedMemberIds((current) => {
            if (allVisibleSelected) {
                return current.filter((memberId) => !filteredMemberIds.includes(memberId));
            }

            return Array.from(new Set([...current, ...filteredMemberIds]));
        });
    }

    async function handleCreateMember() {
        setActionLoading("create-member");
        setActionError(null);
        setActionMessage(null);

        try {
            await adapter.createMember({
                full_name: createFullName,
                phone: createPhone || undefined,
                membership_name: createMembershipName,
                membership_period: createMembershipPeriod,
                started_at: new Date(createStartedAt).toISOString(),
                expires_at: new Date(editingMemberId ? editExpiresAt : createExpiresAt).toISOString(),
            });
            await loadMembers();
            resetCreateForm();
            setActionMessage("เพิ่มสมาชิกเรียบร้อยแล้ว");
        } catch (error) {
            setActionError(getErrorMessage(error, "ไม่สามารถเพิ่มสมาชิกได้"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleSaveMemberDates(memberId: string | number) {
        setActionLoading(`edit-${String(memberId)}`);
        setActionError(null);
        setActionMessage(null);

        try {
            await adapter.updateMember(memberId, {
                started_at: new Date(editStartedAt).toISOString(),
                expires_at: new Date(editExpiresAt).toISOString(),
            });
            await loadMembers();
            setEditingMemberId(null);
            setEditStartedAt("");
            setEditExpiresAt("");
            setActionMessage("อัปเดตวันเวลาเริ่มและหมดอายุเรียบร้อยแล้ว");
        } catch (error) {
            setActionError(getErrorMessage(error, "ไม่สามารถแก้ไขข้อมูลสมาชิกได้"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRenew(memberId: string | number) {
        setActionLoading(String(memberId));
        setActionError(null);
        setActionMessage(null);
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
        setActionMessage(null);
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
        setActionMessage(null);
        try {
            await adapter.toggleMemberActive(member.member_id);
            await loadMembers();
        } catch (error) {
            setActionError(getErrorMessage(error, `ไม่สามารถ${actionLabel}สมาชิกได้`));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDeleteMember(member: MemberSubscriptionRecord) {
        if (!window.confirm(`ลบสมาชิก ${member.full_name} ใช่หรือไม่`)) {
            return;
        }

        setActionLoading(`delete-${String(member.member_id)}`);
        setActionError(null);
        setActionMessage(null);

        try {
            const result = await adapter.deleteMember(member.member_id);
            await loadMembers();
            setSelectedMemberIds((current) => current.filter((memberId) => memberId !== String(member.member_id)));
            if (editingMemberId === String(member.member_id)) {
                setEditingMemberId(null);
                setEditStartedAt("");
                setEditExpiresAt("");
            }
            setActionMessage(`ลบสมาชิก ${result.full_name} เรียบร้อยแล้ว`);
        } catch (error) {
            setActionError(getErrorMessage(error, "ไม่สามารถลบสมาชิกได้"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDeleteSelectedMembers() {
        if (selectedMemberIds.length === 0) {
            return;
        }

        if (!window.confirm(`ลบสมาชิกที่เลือก ${selectedMemberIds.length} คน ใช่หรือไม่`)) {
            return;
        }

        setActionLoading("delete-selected");
        setActionError(null);
        setActionMessage(null);

        try {
            const selectedMembers = memberRegistry.filter((member) => selectedMemberIds.includes(String(member.member_id)));
            for (const member of selectedMembers) {
                await adapter.deleteMember(member.member_id);
            }

            await loadMembers();
            if (editingMemberId && selectedMemberIds.includes(editingMemberId)) {
                setEditingMemberId(null);
                setEditStartedAt("");
                setEditExpiresAt("");
            }
            setSelectedMemberIds([]);
            setActionMessage(`ลบสมาชิก ${selectedMembers.length} คนเรียบร้อยแล้ว`);
        } catch (error) {
            setActionError(getErrorMessage(error, "ไม่สามารถลบสมาชิกที่เลือกได้"));
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

                {actionMessage ? (
                    <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                        {actionMessage}
                    </div>
                ) : null}

                {!canEditMembers ? (
                    <div className="rounded-[20px] border border-line bg-background px-4 py-3 text-sm text-muted">
                        บัญชีนี้ดูข้อมูลสมาชิกได้อย่างเดียว การต่ออายุและเริ่มรอบใหม่สงวนสิทธิ์ไว้สำหรับ owner เท่านั้น
                    </div>
                ) : null}

                {canEditMembers ? (
                    <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted">เพิ่มสมาชิกเอง</p>
                                <h2 className="mt-2 text-2xl font-semibold text-foreground">owner สามารถสร้างสมาชิกได้โดยไม่ต้องผ่านหน้า POS</h2>
                            </div>
                            <p className="text-sm text-muted">กำหนดชื่อแพ็กเกจ ช่วงเวลาเริ่ม และวันหมดอายุได้เอง</p>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">ชื่อสมาชิก</span>
                                <input
                                    aria-label="ชื่อสมาชิกใหม่"
                                    value={createFullName}
                                    onChange={(event) => setCreateFullName(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">เบอร์โทร</span>
                                <input
                                    aria-label="เบอร์โทรสมาชิกใหม่"
                                    value={createPhone}
                                    onChange={(event) => setCreatePhone(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">ชื่อแพ็กเกจ</span>
                                <input
                                    aria-label="ชื่อแพ็กเกจสมาชิกใหม่"
                                    value={createMembershipName}
                                    onChange={(event) => setCreateMembershipName(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">รอบสมาชิก</span>
                                <select
                                    aria-label="รอบสมาชิกใหม่"
                                    value={createMembershipPeriod}
                                    onChange={(event) => {
                                        const nextPeriod = event.target.value as MembershipPeriod;
                                        setCreateMembershipPeriod(nextPeriod);
                                        setCreateExpiresAt(addDaysToDateTime(createStartedAt, membershipDurationDaysByPeriod[nextPeriod]));
                                    }}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                >
                                    <option value="DAILY">รายวัน</option>
                                    <option value="MONTHLY">1 เดือน</option>
                                    <option value="QUARTERLY">3 เดือน</option>
                                    <option value="SEMIANNUAL">6 เดือน</option>
                                    <option value="YEARLY">1 ปี</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">วันเวลาเริ่มต้น</span>
                                <input
                                    aria-label="วันเวลาเริ่มสมาชิกใหม่"
                                    type="datetime-local"
                                    value={createStartedAt}
                                    onChange={(event) => {
                                        const nextStartedAt = event.target.value;
                                        setCreateStartedAt(nextStartedAt);
                                        setCreateExpiresAt(addDaysToDateTime(nextStartedAt, membershipDurationDaysByPeriod[createMembershipPeriod]));
                                    }}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-foreground">วันเวลาหมดอายุ</span>
                                <input
                                    aria-label="วันเวลาหมดอายุสมาชิกใหม่"
                                    type="datetime-local"
                                    value={createExpiresAt}
                                    onChange={(event) => setCreateExpiresAt(event.target.value)}
                                    className="mt-2 w-full rounded-[18px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                                />
                            </label>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => void handleCreateMember()}
                                disabled={actionLoading === "create-member"}
                                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:opacity-50"
                            >
                                {actionLoading === "create-member" ? "กำลังเพิ่มสมาชิก..." : "เพิ่มสมาชิกเอง"}
                            </button>
                            <button
                                type="button"
                                onClick={resetCreateForm}
                                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                            >
                                ล้างฟอร์ม
                            </button>
                        </div>
                    </section>
                ) : null}

                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                    {canEditMembers ? (
                        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-line bg-[#12110c] px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                    <input
                                        type="checkbox"
                                        aria-label="เลือกสมาชิกทั้งหมดที่แสดง"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        className="h-4 w-4 rounded border border-line bg-background accent-[#f6d94a]"
                                    />
                                    เลือกทั้งหมดในรายการนี้
                                </label>
                                <span className="text-sm text-muted">เลือกแล้ว {selectedMemberIds.length} คน</span>
                            </div>

                            <button
                                type="button"
                                disabled={selectedMemberIds.length === 0 || actionLoading === "delete-selected"}
                                onClick={() => void handleDeleteSelectedMembers()}
                                className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-4 py-2 text-sm font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:opacity-50"
                            >
                                {actionLoading === "delete-selected" ? "กำลังลบสมาชิก..." : "ลบสมาชิกที่เลือก"}
                            </button>
                        </div>
                    ) : null}

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
                        <div className="grid gap-3">
                            {filteredRows.map((member) => {
                                const isEditing = editingMemberId === String(member.member_id);
                                const isBusy = actionLoading === String(member.member_id) || actionLoading === `edit-${String(member.member_id)}` || actionLoading === `delete-${String(member.member_id)}` || actionLoading === "delete-selected";
                                const isSelected = selectedMemberIds.includes(String(member.member_id));

                                return (
                                    <article key={String(member.member_id)} className="rounded-[26px] border border-line bg-[#161510] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
                                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start gap-3">
                                                    {canEditMembers ? (
                                                        <label className="mt-1 inline-flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                aria-label={`เลือกสมาชิก ${member.full_name}`}
                                                                checked={isSelected}
                                                                disabled={isBusy}
                                                                onChange={() => toggleMemberSelection(String(member.member_id))}
                                                                className="h-4 w-4 rounded border border-line bg-background accent-[#f6d94a]"
                                                            />
                                                        </label>
                                                    ) : null}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="truncate text-lg font-semibold text-[#f3e8ba]">{member.full_name}</p>
                                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${member.statusGroup === "EXPIRED" ? "bg-warning-soft text-foreground" : member.statusGroup === "EXPIRING_SOON" ? "bg-accent text-black" : member.statusGroup === "INACTIVE" ? "bg-[#2d1d1d] text-[#f5d4d4]" : "bg-accent-soft text-foreground"}`}>
                                                                {member.statusLabel}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-muted">{member.member_code} · {member.phone}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                    <div className="rounded-2xl border border-line/70 bg-[#0e0d09] px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">แพ็กเกจ</p>
                                                        <p className="mt-1 text-sm font-semibold text-[#f3e8ba]">{member.membership_name}</p>
                                                    </div>

                                                    <div className="rounded-2xl border border-line/70 bg-[#0e0d09] px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">เริ่มใช้</p>
                                                        {isEditing ? (
                                                            <input
                                                                aria-label={`วันเวลาเริ่ม-${member.full_name}`}
                                                                type="datetime-local"
                                                                value={editStartedAt}
                                                                onChange={(event) => setEditStartedAt(event.target.value)}
                                                                className="mt-2 w-full rounded-[14px] border border-line bg-[#fff8de] px-3 py-2 text-sm text-[#17130a] outline-none transition focus:border-accent"
                                                            />
                                                        ) : (
                                                            <p className="mt-1 text-sm font-semibold text-[#f3e8ba]">{formatDateTime(member.started_at)}</p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-2xl border border-line/70 bg-[#0e0d09] px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">วันหมดอายุ</p>
                                                        {isEditing ? (
                                                            <input
                                                                aria-label={`วันเวลาหมดอายุ-${member.full_name}`}
                                                                type="datetime-local"
                                                                value={editExpiresAt}
                                                                onChange={(event) => setEditExpiresAt(event.target.value)}
                                                                className="mt-2 w-full rounded-[14px] border border-line bg-[#fff8de] px-3 py-2 text-sm text-[#17130a] outline-none transition focus:border-accent"
                                                            />
                                                        ) : (
                                                            <p className="mt-1 text-sm font-semibold text-[#f3e8ba]">{formatDateTime(member.expires_at)}</p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-2xl border border-line/70 bg-[#0e0d09] px-3 py-3">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">วิธีต่ออายุ</p>
                                                        <p className="mt-1 text-sm font-semibold text-[#f3e8ba]">{renewalMethodLabel[member.renewal_method ?? "NONE"] ?? "-"}</p>
                                                    </div>

                                                    <div className="rounded-2xl border border-line/70 bg-[#0e0d09] px-3 py-3 sm:col-span-2 xl:col-span-4">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">เทรนเนอร์</p>
                                                        {member.training_summary?.trainer_name ? (
                                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-semibold text-[#f3e8ba]">{member.training_summary.trainer_name}</p>
                                                                <p className="text-xs text-muted">{member.training_summary.training_package_name ?? ""}</p>
                                                            </div>
                                                        ) : member.training_summary?.training_status === "UNASSIGNED" ? (
                                                            <p className="mt-1 text-xs text-muted">ยังไม่มอบหมาย</p>
                                                        ) : (
                                                            <p className="mt-1 text-xs text-muted">-</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="xl:w-70">
                                                <div className="rounded-3xl border border-line/70 bg-[#0e0d09] p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">จัดการสมาชิก</p>
                                                    {canEditMembers ? (
                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        disabled={actionLoading === `edit-${String(member.member_id)}`}
                                                                        onClick={() => void handleSaveMemberDates(member.member_id)}
                                                                        className="rounded-full border border-accent bg-accent px-3 py-2 text-xs font-semibold text-black transition hover:bg-accent-strong disabled:opacity-50"
                                                                    >
                                                                        บันทึกวันเวลา
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingMemberId(null);
                                                                            setEditStartedAt("");
                                                                            setEditExpiresAt("");
                                                                        }}
                                                                        className="rounded-full border border-line bg-surface-strong px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                                                    >
                                                                        ยกเลิก
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={() => beginEditingMember(member)}
                                                                    className="rounded-full border border-line bg-surface-strong px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:opacity-50"
                                                                >
                                                                    แก้วันเวลา
                                                                </button>
                                                            )}

                                                            {member.is_active ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isBusy}
                                                                        onClick={() => handleRenew(member.member_id)}
                                                                        className="rounded-full border border-accent bg-accent-soft px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-black disabled:opacity-50"
                                                                    >
                                                                        ต่ออายุ
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isBusy}
                                                                        onClick={() => handleRestart(member.member_id)}
                                                                        className="rounded-full border border-line bg-surface-strong px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:opacity-50"
                                                                    >
                                                                        เริ่มใหม่
                                                                    </button>
                                                                </>
                                                            ) : null}

                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => void handleToggleMember(member)}
                                                                className={`rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${member.is_active ? "border border-warning-soft bg-warning-soft text-foreground hover:border-[#f0c06b]" : "border border-accent bg-accent-soft text-foreground hover:bg-accent hover:text-black"}`}
                                                            >
                                                                {member.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() => void handleDeleteMember(member)}
                                                                className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-3 py-2 text-xs font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:opacity-50"
                                                            >
                                                                ลบสมาชิก
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="mt-4 inline-block text-sm text-muted">ดูอย่างเดียว</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </RoleGuard>
    );
}