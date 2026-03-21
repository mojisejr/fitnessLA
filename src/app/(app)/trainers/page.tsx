"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { useAuth } from "@/features/auth/auth-provider";
import type { TrainerRecord, TrainingEnrollmentRecord } from "@/lib/contracts";
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from "@/lib/utils";

type TrainerWithAssignments = TrainerRecord & { assignments: TrainingEnrollmentRecord[] };

type EnrollmentDraft = {
    sessionsRemaining: string;
    status: TrainingEnrollmentRecord["status"];
    closeReason: string;
};

const statusLabel: Record<TrainingEnrollmentRecord["status"], string> = {
    ACTIVE: "ใช้งานอยู่",
    EXPIRED: "หมดแล้ว",
    UNASSIGNED: "ยังไม่มอบหมาย",
    CLOSED: "ปิดลูกเทรน",
};

const statusColor: Record<TrainingEnrollmentRecord["status"], string> = {
    ACTIVE: "bg-accent text-black",
    EXPIRED: "bg-warning-soft text-foreground",
    UNASSIGNED: "bg-[#161510] text-muted",
    CLOSED: "bg-[#2d1d1d] text-[#f5d4d4]",
};

function createEnrollmentDraft(enrollment: TrainingEnrollmentRecord): EnrollmentDraft {
    return {
        sessionsRemaining:
            typeof enrollment.sessions_remaining === "number" ? String(enrollment.sessions_remaining) : "",
        status: enrollment.status,
        closeReason: enrollment.close_reason ?? "",
    };
}

export default function TrainersPage() {
    const adapter = useAppAdapter();
    const { session } = useAuth();
    const [trainers, setTrainers] = useState<TrainerWithAssignments[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTrainerId, setExpandedTrainerId] = useState<string | number | null>(null);
    const [drafts, setDrafts] = useState<Record<string, EnrollmentDraft>>({});
    const [trainerForm, setTrainerForm] = useState({ fullName: "", nickname: "", phone: "" });
    const [isCreatingTrainer, setIsCreatingTrainer] = useState(false);
    const [savingEnrollmentId, setSavingEnrollmentId] = useState<string | null>(null);
    const [togglingTrainerId, setTogglingTrainerId] = useState<string | null>(null);
    const [deletingTrainerId, setDeletingTrainerId] = useState<string | null>(null);
    const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(null);
    const [bulkDeletingTrainerId, setBulkDeletingTrainerId] = useState<string | null>(null);
    const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Record<string, string[]>>({});
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [mutationMessage, setMutationMessage] = useState<string | null>(null);
    const canEditTrainers = session?.role === "OWNER";

    const loadTrainers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await adapter.listTrainers();
            setTrainers(result);
            setDrafts(
                Object.fromEntries(
                    result.flatMap((trainer) =>
                        trainer.assignments.map((enrollment) => [
                            String(enrollment.enrollment_id),
                            createEnrollmentDraft(enrollment),
                        ]),
                    ),
                ),
            );
            setSelectedEnrollmentIds({});
        } catch (loadError) {
            setError(getErrorMessage(loadError, "ไม่สามารถโหลดรายชื่อเทรนเนอร์ได้"));
        } finally {
            setLoading(false);
        }
    }, [adapter]);

    useEffect(() => {
        void loadTrainers();
    }, [loadTrainers]);

    function updateDraft(enrollmentId: string | number, patch: Partial<EnrollmentDraft>) {
        setDrafts((current) => ({
            ...current,
            [String(enrollmentId)]: {
                ...(current[String(enrollmentId)] ?? { sessionsRemaining: "", status: "ACTIVE", closeReason: "" }),
                ...patch,
            },
        }));
    }

    function toggleEnrollmentSelection(trainerId: string | number, enrollmentId: string | number, checked: boolean) {
        setSelectedEnrollmentIds((current) => {
            const key = String(trainerId);
            const currentIds = current[key] ?? [];
            const nextIds = checked
                ? Array.from(new Set([...currentIds, String(enrollmentId)]))
                : currentIds.filter((id) => id !== String(enrollmentId));

            return {
                ...current,
                [key]: nextIds,
            };
        });
    }

    function toggleAllEnrollments(trainerId: string | number, assignments: TrainingEnrollmentRecord[], checked: boolean) {
        setSelectedEnrollmentIds((current) => ({
            ...current,
            [String(trainerId)]: checked ? assignments.map((assignment) => String(assignment.enrollment_id)) : [],
        }));
    }

    async function handleCreateTrainer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMutationError(null);
        setMutationMessage(null);
        setIsCreatingTrainer(true);

        try {
            await adapter.createTrainer({
                full_name: trainerForm.fullName,
                nickname: trainerForm.nickname || undefined,
                phone: trainerForm.phone || undefined,
            });
            setTrainerForm({ fullName: "", nickname: "", phone: "" });
            await loadTrainers();
            setMutationMessage("เพิ่มเทรนเนอร์เรียบร้อยแล้ว");
        } catch (createError) {
            setMutationError(getErrorMessage(createError, "ไม่สามารถเพิ่มเทรนเนอร์ได้"));
        } finally {
            setIsCreatingTrainer(false);
        }
    }

    async function handleSaveEnrollment(enrollment: TrainingEnrollmentRecord) {
        const draft = drafts[String(enrollment.enrollment_id)] ?? createEnrollmentDraft(enrollment);
        const normalizedSessionsRemaining = draft.sessionsRemaining.trim();
        const sessionsRemaining =
            normalizedSessionsRemaining === "" ? null : Number.parseInt(normalizedSessionsRemaining, 10);

        if (normalizedSessionsRemaining !== "" && Number.isNaN(sessionsRemaining ?? Number.NaN)) {
            setMutationError("จำนวนครั้งคงเหลือต้องเป็นตัวเลขจำนวนเต็ม");
            return;
        }

        setMutationError(null);
        setMutationMessage(null);
        setSavingEnrollmentId(String(enrollment.enrollment_id));

        try {
            await adapter.updateTrainingEnrollment(enrollment.enrollment_id, {
                sessions_remaining: sessionsRemaining,
                status: draft.status,
                close_reason: draft.status === "CLOSED" ? draft.closeReason || null : null,
            });
            await loadTrainers();
            setMutationMessage("อัปเดตข้อมูลลูกเทรนเรียบร้อยแล้ว");
        } catch (saveError) {
            setMutationError(getErrorMessage(saveError, "ไม่สามารถบันทึกข้อมูลลูกเทรนได้"));
        } finally {
            setSavingEnrollmentId(null);
        }
    }

    async function handleToggleTrainer(trainer: TrainerRecord) {
        const actionLabel = trainer.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน";
        if (!window.confirm(`${actionLabel}เทรนเนอร์ ${trainer.full_name} ใช่หรือไม่`)) {
            return;
        }

        setMutationError(null);
    setMutationMessage(null);
        setTogglingTrainerId(String(trainer.trainer_id));

        try {
            await adapter.toggleTrainerActive(trainer.trainer_id);
            await loadTrainers();
            setMutationMessage(`${actionLabel}เทรนเนอร์เรียบร้อยแล้ว`);
        } catch (toggleError) {
            setMutationError(getErrorMessage(toggleError, `ไม่สามารถ${actionLabel}เทรนเนอร์ได้`));
        } finally {
            setTogglingTrainerId(null);
        }
    }

    async function handleDeleteTrainer(trainer: TrainerRecord) {
        if (!window.confirm(`ลบเทรนเนอร์ ${trainer.full_name} ใช่หรือไม่`)) {
            return;
        }

        setMutationError(null);
        setMutationMessage(null);
        setDeletingTrainerId(String(trainer.trainer_id));

        try {
            const result = await adapter.deleteTrainer(trainer.trainer_id);
            await loadTrainers();
            if (expandedTrainerId === trainer.trainer_id) {
                setExpandedTrainerId(null);
            }
            setMutationMessage(`ลบเทรนเนอร์ ${result.full_name} เรียบร้อยแล้ว`);
        } catch (deleteError) {
            setMutationError(getErrorMessage(deleteError, "ไม่สามารถลบเทรนเนอร์ได้"));
        } finally {
            setDeletingTrainerId(null);
        }
    }

    async function handleDeleteEnrollment(enrollment: TrainingEnrollmentRecord) {
        if (!window.confirm(`ลบลูกเทรน ${enrollment.customer_name} แพ็กเกจ ${enrollment.package_name} ใช่หรือไม่`)) {
            return;
        }

        setMutationError(null);
        setMutationMessage(null);
        setDeletingEnrollmentId(String(enrollment.enrollment_id));

        try {
            const result = await adapter.deleteTrainingEnrollment(enrollment.enrollment_id);
            await loadTrainers();
            setMutationMessage(`ลบลูกเทรน ${result.customer_name} เรียบร้อยแล้ว`);
        } catch (deleteError) {
            setMutationError(getErrorMessage(deleteError, "ไม่สามารถลบข้อมูลลูกเทรนได้"));
        } finally {
            setDeletingEnrollmentId(null);
        }
    }

    async function handleBulkDeleteEnrollments(trainer: TrainerRecord, assignments: TrainingEnrollmentRecord[]) {
        const selectedIds = selectedEnrollmentIds[String(trainer.trainer_id)] ?? [];
        if (selectedIds.length === 0) {
            setMutationError("กรุณาเลือกลูกเทรนที่ต้องการลบอย่างน้อย 1 รายการ");
            return;
        }

        const selectedAssignments = assignments.filter((assignment) =>
            selectedIds.includes(String(assignment.enrollment_id)),
        );

        if (!window.confirm(`ลบลูกเทรนที่เลือก ${selectedAssignments.length} รายการ ใช่หรือไม่`)) {
            return;
        }

        setMutationError(null);
        setMutationMessage(null);
        setBulkDeletingTrainerId(String(trainer.trainer_id));

        try {
            const result = await adapter.deleteTrainingEnrollments(selectedIds);
            await loadTrainers();
            setMutationMessage(`ลบลูกเทรน ${result.deleted_count} รายการเรียบร้อยแล้ว`);
        } catch (deleteError) {
            setMutationError(getErrorMessage(deleteError, "ไม่สามารถลบข้อมูลลูกเทรนที่เลือกได้"));
        } finally {
            setBulkDeletingTrainerId(null);
        }
    }

    function renderAssignmentsTable(
        trainer: TrainerRecord,
        assignments: TrainingEnrollmentRecord[],
        emptyLabel: string,
        options?: { allowDelete?: boolean },
    ) {
        if (assignments.length === 0) {
            return (
                <div className="rounded-[18px] border border-dashed border-line bg-background p-4 text-sm text-muted">
                    {emptyLabel}
                </div>
            );
        }

        const allowDelete = Boolean(options?.allowDelete && canEditTrainers);
        const selectedIds = selectedEnrollmentIds[String(trainer.trainer_id)] ?? [];
        const allSelected = allowDelete && assignments.length > 0 && assignments.every((assignment) => selectedIds.includes(String(assignment.enrollment_id)));

        return (
            <div className="rounded-3xl border border-line bg-[#161510] p-3">
                {allowDelete ? (
                    <div className="mb-3 flex flex-col gap-3 rounded-[18px] border border-line bg-[#11110d] px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {selectedIds.length > 0 ? `เลือกลูกเทรนแล้ว ${selectedIds.length} รายการ` : "เลือกลูกเทรนเพื่อลบหลายรายการ"}
                            </p>
                            <p className="text-xs text-muted">ลบออกจากรายการลูกเทรนปัจจุบันและฐานข้อมูลทันที</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(event) => toggleAllEnrollments(trainer.trainer_id, assignments, event.target.checked)}
                                    disabled={bulkDeletingTrainerId === String(trainer.trainer_id)}
                                    aria-label="เลือกทั้งหมด"
                                    className="h-4 w-4 rounded border border-line bg-surface-strong accent-[#f4d54d]"
                                />
                                เลือกทั้งหมด
                            </label>
                            <button
                                type="button"
                                onClick={() => void handleBulkDeleteEnrollments(trainer, assignments)}
                                disabled={selectedIds.length === 0 || bulkDeletingTrainerId === String(trainer.trainer_id)}
                                className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-4 py-2 text-xs font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:opacity-50"
                            >
                                {bulkDeletingTrainerId === String(trainer.trainer_id) ? "กำลังลบ..." : "ลบที่เลือก"}
                            </button>
                        </div>
                    </div>
                ) : null}
                <div className="overflow-x-auto overscroll-x-contain pb-2">
                    <table className="min-w-270 divide-y divide-line text-sm">
                        <thead className="bg-[#0d0d0a]">
                            <tr>
                                {allowDelete ? <th className="w-12 px-3 py-3 text-left font-semibold text-muted">เลือก</th> : null}
                                <th className="min-w-35 px-4 py-3 text-left font-semibold text-muted">ลูกค้า</th>
                                <th className="min-w-35 px-4 py-3 text-left font-semibold text-muted">แพ็กเกจ</th>
                                <th className="min-w-24 px-4 py-3 text-left font-semibold text-muted">เริ่มต้น</th>
                                <th className="min-w-24 px-4 py-3 text-left font-semibold text-muted">หมดอายุ</th>
                                <th className="min-w-30 px-4 py-3 text-left font-semibold text-muted">ครั้งคงเหลือ</th>
                                <th className="min-w-30 px-4 py-3 text-left font-semibold text-muted">สถานะ</th>
                                <th className="min-w-45 px-4 py-3 text-left font-semibold text-muted">หมายเหตุปิดเคส</th>
                                <th className="min-w-28 px-4 py-3 text-left font-semibold text-muted">มูลค่า</th>
                                <th className="min-w-38 px-4 py-3 text-left font-semibold text-muted">อัปเดตล่าสุด</th>
                                <th className="min-w-23 px-4 py-3 text-left font-semibold text-muted">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {assignments.map((enrollment) => {
                                const draft = drafts[String(enrollment.enrollment_id)] ?? createEnrollmentDraft(enrollment);

                                return (
                                    <tr key={enrollment.enrollment_id}>
                                        {allowDelete ? (
                                            <td className="px-3 py-4 align-top">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(String(enrollment.enrollment_id))}
                                                    onChange={(event) =>
                                                        toggleEnrollmentSelection(trainer.trainer_id, enrollment.enrollment_id, event.target.checked)
                                                    }
                                                    disabled={bulkDeletingTrainerId === String(trainer.trainer_id)}
                                                    aria-label={`เลือก ${enrollment.customer_name}`}
                                                    className="mt-1 h-4 w-4 rounded border border-line bg-surface-strong accent-[#f4d54d]"
                                                />
                                            </td>
                                        ) : null}
                                        <td className="px-4 py-4 align-top text-[#f3e8ba]">
                                            <p className="font-semibold">{enrollment.customer_name}</p>
                                            <p className="text-xs text-muted">{enrollment.package_sku}</p>
                                        </td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba]">{enrollment.package_name}</td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{formatDate(enrollment.started_at)}</td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{enrollment.expires_at ? formatDate(enrollment.expires_at) : "-"}</td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba]">
                                            {canEditTrainers ? (
                                                <div className="space-y-1">
                                                    <input
                                                        value={draft.sessionsRemaining}
                                                        onChange={(event) =>
                                                            updateDraft(enrollment.enrollment_id, { sessionsRemaining: event.target.value })
                                                        }
                                                        inputMode="numeric"
                                                        placeholder={enrollment.session_limit ? String(enrollment.session_limit) : "ไม่จำกัด"}
                                                        className="w-24 rounded-[14px] border border-line bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                                    />
                                                    <p className="text-xs text-muted">
                                                        ทั้งหมด {enrollment.session_limit ?? "ไม่จำกัด"} ครั้ง
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p>{enrollment.sessions_remaining ?? "-"}</p>
                                                    <p className="text-xs text-muted">
                                                        ทั้งหมด {enrollment.session_limit ?? "ไม่จำกัด"} ครั้ง
                                                    </p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            {canEditTrainers ? (
                                                <div className="space-y-2">
                                                    <select
                                                        value={draft.status}
                                                        onChange={(event) =>
                                                            updateDraft(enrollment.enrollment_id, {
                                                                status: event.target.value as TrainingEnrollmentRecord["status"],
                                                            })
                                                        }
                                                        className="w-full rounded-[14px] border border-line bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                                                    >
                                                        <option value="ACTIVE">ใช้งานอยู่</option>
                                                        <option value="EXPIRED">หมดแล้ว</option>
                                                        <option value="CLOSED">ปิดลูกเทรน</option>
                                                        <option value="UNASSIGNED">ยังไม่มอบหมาย</option>
                                                    </select>
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor[draft.status]}`}>
                                                        {statusLabel[draft.status]}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor[enrollment.status]}`}>
                                                    {statusLabel[enrollment.status]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba]">
                                            {canEditTrainers ? (
                                                <input
                                                    value={draft.closeReason}
                                                    onChange={(event) =>
                                                        updateDraft(enrollment.enrollment_id, { closeReason: event.target.value })
                                                    }
                                                    disabled={draft.status !== "CLOSED"}
                                                    placeholder="เช่น จบคอร์ส / ขอพักบริการ"
                                                    className="w-full rounded-[14px] border border-line bg-surface-strong px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            ) : (
                                                <p>{enrollment.close_reason || "-"}</p>
                                            )}
                                            {enrollment.closed_at ? (
                                                <p className="mt-2 text-xs text-muted">ปิดเมื่อ {formatDateTime(enrollment.closed_at)}</p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{formatCurrency(enrollment.price)}</td>
                                        <td className="px-4 py-4 align-top text-[#f3e8ba] whitespace-nowrap">{formatDateTime(enrollment.updated_at)}</td>
                                        <td className="px-4 py-4 align-top">
                                            {canEditTrainers ? (
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleSaveEnrollment(enrollment)}
                                                        disabled={savingEnrollmentId === String(enrollment.enrollment_id) || deletingEnrollmentId === String(enrollment.enrollment_id)}
                                                        className="rounded-full border border-accent bg-accent-soft px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-black disabled:opacity-50"
                                                    >
                                                        {savingEnrollmentId === String(enrollment.enrollment_id) ? "กำลังบันทึก..." : "บันทึก"}
                                                    </button>
                                                    {allowDelete ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleDeleteEnrollment(enrollment)}
                                                            disabled={deletingEnrollmentId === String(enrollment.enrollment_id) || savingEnrollmentId === String(enrollment.enrollment_id)}
                                                            className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-4 py-2 text-xs font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:opacity-50"
                                                        >
                                                            {deletingEnrollmentId === String(enrollment.enrollment_id) ? "กำลังลบ..." : "ลบ"}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted">ดูอย่างเดียว</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">จัดการบุคลากร</p>
                    <h1 className="mt-3 text-3xl font-semibold text-foreground">เทรนเนอร์</h1>
                    <p className="mt-2 text-sm leading-6 text-muted">เพิ่มเทรนเนอร์ใหม่, จัดการลูกเทรน, และเก็บประวัติการดูแลลูกค้าในหน้าจอเดียว</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadTrainers()}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                >
                    รีเฟรช
                </button>
            </div>

            {!canEditTrainers ? (
                <div className="rounded-[20px] border border-line bg-background px-4 py-3 text-sm text-muted">
                    บัญชีนี้ดูข้อมูลเทรนเนอร์ได้อย่างเดียว การเพิ่มเทรนเนอร์และแก้ไขลูกเทรนสงวนสิทธิ์ไว้สำหรับ owner เท่านั้น
                </div>
            ) : null}

            {canEditTrainers ? (
                <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold text-muted">เพิ่มเทรนเนอร์</p>
                            <h2 className="mt-2 text-2xl font-semibold text-foreground">สร้างเทรนเนอร์ใหม่ในระบบ</h2>
                            <p className="mt-2 text-sm leading-6 text-muted">ระบบจะสร้างรหัสเทรนเนอร์ให้อัตโนมัติและพร้อมใช้งานในหน้า POS ทันที</p>
                        </div>
                        <form className="grid gap-3 md:grid-cols-3 lg:min-w-180" onSubmit={handleCreateTrainer}>
                            <input
                                value={trainerForm.fullName}
                                onChange={(event) => setTrainerForm((current) => ({ ...current, fullName: event.target.value }))}
                                placeholder="ชื่อเทรนเนอร์"
                                className="rounded-[18px] border border-line bg-surface px-4 py-3 text-foreground outline-none transition focus:border-accent"
                            />
                            <input
                                value={trainerForm.nickname}
                                onChange={(event) => setTrainerForm((current) => ({ ...current, nickname: event.target.value }))}
                                placeholder="ชื่อเล่น"
                                className="rounded-[18px] border border-line bg-surface px-4 py-3 text-foreground outline-none transition focus:border-accent"
                            />
                            <div className="flex gap-3">
                                <input
                                    value={trainerForm.phone}
                                    onChange={(event) => setTrainerForm((current) => ({ ...current, phone: event.target.value }))}
                                    placeholder="เบอร์โทร"
                                    className="min-w-0 flex-1 rounded-[18px] border border-line bg-surface px-4 py-3 text-foreground outline-none transition focus:border-accent"
                                />
                                <button
                                    type="submit"
                                    disabled={isCreatingTrainer}
                                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:opacity-50"
                                >
                                    {isCreatingTrainer ? "กำลังเพิ่ม..." : "เพิ่มเทรนเนอร์"}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            ) : null}

            {error ? (
                <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                    {error}
                </div>
            ) : null}

            {mutationError ? (
                <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                    {mutationError}
                </div>
            ) : null}

            {mutationMessage ? (
                <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                    {mutationMessage}
                </div>
            ) : null}

            {loading ? (
                <div className="rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                    กำลังโหลดรายชื่อเทรนเนอร์...
                </div>
            ) : trainers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                    ยังไม่มีเทรนเนอร์ในระบบ
                </div>
            ) : (
                <div className="space-y-4">
                    {trainers.map((trainer) => {
                        const isExpanded = expandedTrainerId === trainer.trainer_id;
                        const activeAssignments = trainer.assignments.filter((assignment) => assignment.status === "ACTIVE");
                        const historyAssignments = trainer.assignments.filter((assignment) => assignment.status !== "ACTIVE");

                        return (
                            <section
                                key={trainer.trainer_id}
                                className="rounded-[28px] border border-line bg-surface-strong p-5 md:p-6"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-semibold text-foreground">{trainer.full_name}</h2>
                                            {trainer.nickname ? (
                                                <span className="text-sm text-muted">({trainer.nickname})</span>
                                            ) : null}
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${trainer.is_active ? "bg-accent-soft text-foreground" : "bg-warning-soft text-foreground"}`}>
                                                {trainer.is_active ? "พร้อมรับงาน" : "ปิดใช้งาน"}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                                            <span className="rounded-full bg-accent-soft px-3 py-1 text-foreground">{trainer.trainer_code}</span>
                                            {trainer.phone ? (
                                                <span className="rounded-full border border-line px-3 py-1 text-foreground">{trainer.phone}</span>
                                            ) : null}
                                            <span className="rounded-full border border-line px-3 py-1 text-foreground">
                                                ลูกค้าปัจจุบัน {activeAssignments.length} คน
                                            </span>
                                            <span className="rounded-full border border-line px-3 py-1 text-foreground">
                                                ประวัติ {historyAssignments.length} รายการ
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {canEditTrainers ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggleTrainer(trainer)}
                                                    disabled={togglingTrainerId === String(trainer.trainer_id) || deletingTrainerId === String(trainer.trainer_id)}
                                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${trainer.is_active ? "border border-warning-soft bg-warning-soft text-foreground hover:border-[#f0c06b]" : "border border-accent bg-accent-soft text-foreground hover:bg-accent hover:text-black"}`}
                                                >
                                                    {togglingTrainerId === String(trainer.trainer_id)
                                                        ? "กำลังบันทึก..."
                                                        : trainer.is_active
                                                            ? "ปิดใช้งาน"
                                                            : "เปิดใช้งาน"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteTrainer(trainer)}
                                                    disabled={deletingTrainerId === String(trainer.trainer_id) || togglingTrainerId === String(trainer.trainer_id)}
                                                    className="rounded-full border border-[#b44b4b] bg-[rgba(180,75,75,0.14)] px-4 py-2 text-sm font-semibold text-[#f4c4c4] transition hover:bg-[rgba(180,75,75,0.24)] disabled:opacity-50"
                                                >
                                                    {deletingTrainerId === String(trainer.trainer_id) ? "กำลังลบ..." : "ลบเทรนเนอร์"}
                                                </button>
                                            </>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedTrainerId(isExpanded ? null : trainer.trainer_id)}
                                            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft"
                                        >
                                            {isExpanded ? "ซ่อนรายละเอียด" : `จัดการลูกเทรน (${trainer.assignments.length})`}
                                        </button>
                                    </div>
                                </div>

                                {activeAssignments.length > 0 && !isExpanded ? (
                                    <p className="mt-3 text-sm text-muted">
                                        ลูกค้าที่กำลังดูแล: {activeAssignments.map((assignment) => assignment.customer_name).join(", ")}
                                    </p>
                                ) : null}

                                {isExpanded ? (
                                    <div className="mt-5 space-y-5">
                                        <div>
                                            <div className="mb-3 flex items-center justify-between">
                                                <h3 className="text-base font-semibold text-foreground">ลูกเทรนปัจจุบัน</h3>
                                                <span className="text-xs text-muted">แก้ไขจำนวนครั้ง, สถานะ, ลบรายคน และลบหลายรายการได้ทันที</span>
                                            </div>
                                            {renderAssignmentsTable(trainer, activeAssignments, "ยังไม่มีลูกเทรนที่กำลังดูแล", { allowDelete: true })}
                                        </div>

                                        <div>
                                            <div className="mb-3 flex items-center justify-between">
                                                <h3 className="text-base font-semibold text-foreground">ประวัติลูกเทรน</h3>
                                                <span className="text-xs text-muted">เก็บรายการที่หมดแล้วหรือปิดเคสไว้ดูย้อนหลัง</span>
                                            </div>
                                            {renderAssignmentsTable(trainer, historyAssignments, "ยังไม่มีประวัติลูกเทรน")}
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
        </RoleGuard>
    );
}
