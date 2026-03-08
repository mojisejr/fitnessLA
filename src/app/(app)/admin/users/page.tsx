"use client";

import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { CreateUserRequestInput } from "@/features/adapters/types";
import type { MockPendingUser } from "@/lib/contracts";
import { formatDateTime, getErrorMessage } from "@/lib/utils";

const roleLabel = {
  ADMIN: "แอดมิน",
  CASHIER: "แคชเชียร์",
} as const;

export default function AdminUsersPage() {
  const adapter = useAppAdapter();
  const [requests, setRequests] = useState<MockPendingUser[]>([]);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CASHIER">("CASHIER");
  const [branchLabel, setBranchLabel] = useState("หน้าเคาน์เตอร์");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "CASHIER">("ALL");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApprovingId, setIsApprovingId] = useState<number | null>(null);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isActive = true;

    async function loadRequests() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await adapter.listUserRequests();
        if (isActive) {
          setRequests(result);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดคำขอผู้ใช้ได้"));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      isActive = false;
    };
  }, [adapter]);

  const filteredRequests = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        normalized.length === 0 ||
        `${request.full_name} ${request.username} ${request.branch_label}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "ALL" || request.status === statusFilter;
      const matchesRole = roleFilter === "ALL" || request.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [deferredSearch, requests, roleFilter, statusFilter]);

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const payload: CreateUserRequestInput = {
      full_name: fullName.trim(),
      username: username.trim(),
      role,
      branch_label: branchLabel.trim(),
    };

    if (payload.full_name.length < 3) {
      setErrorMessage("ชื่อพนักงานต้องยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }

    if (!/^[a-z0-9._-]{3,}$/i.test(payload.username)) {
      setErrorMessage("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง, ขีดกลาง");
      return;
    }

    if (payload.branch_label.length < 2) {
      setErrorMessage("กรุณาระบุสาขาหรือทีมงานให้ชัดเจน");
      return;
    }

    setIsSubmitting(true);

    try {
      const nextRequest = await adapter.createUserRequest(payload);
      setRequests((current) => [nextRequest, ...current]);
      setFullName("");
      setUsername("");
      setRole("CASHIER");
      setBranchLabel("หน้าเคาน์เตอร์");
      setStatusMessage(`สร้างคำขอผู้ใช้ ${nextRequest.username} เรียบร้อยแล้ว`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างคำขอผู้ใช้ได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(requestId: number) {
    setStatusMessage(null);
    setErrorMessage(null);
    setIsApprovingId(requestId);

    try {
      const updated = await adapter.approveUserRequest(requestId);
      setRequests((current) =>
        current.map((request) => (request.request_id === requestId ? updated : request)),
      );
      setStatusMessage(`อนุมัติ ${updated.username} แล้ว`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถอนุมัติคำขอได้"));
    } finally {
      setIsApprovingId(null);
    }
  }

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Admin onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">จัดการผู้ใช้</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            หน้านี้ทำให้ฝั่ง frontend วาง flow สร้างผู้ใช้และอนุมัติคำขอได้ก่อน โดยเก็บรูปแบบ UI และ validation ไว้ให้พร้อมต่อกับระบบจริงภายหลัง
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">สร้างคำขอผู้ใช้ใหม่</p>
            <form className="mt-5 space-y-4" onSubmit={handleCreateRequest}>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="ชื่อพนักงาน"
                className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
                required
              />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="ชื่อผู้ใช้"
                className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as "ADMIN" | "CASHIER")}
                  className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
                >
                  <option value="CASHIER">แคชเชียร์</option>
                  <option value="ADMIN">แอดมิน</option>
                </select>
                <input
                  value={branchLabel}
                  onChange={(event) => setBranchLabel(event.target.value)}
                  placeholder="สาขาหรือทีมงาน"
                  className="w-full rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "กำลังสร้างคำขอ..." : "สร้างคำขอ"}
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

            <div className="mt-6 rounded-[24px] border border-line bg-white p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">หมายเหตุเรื่องสิทธิ์</p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-foreground">
                <li>OWNER อนุมัติได้ทั้ง ADMIN และ CASHIER</li>
                <li>ADMIN เสนอคำขอแคชเชียร์ใหม่และตรวจสอบคำขอค้างได้</li>
                <li>CASHIER ไม่ควรเข้าหน้านี้เลยทั้งใน UI และ backend</li>
              </ul>
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted">คิวอนุมัติ</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">คำขอที่รอและคำขอที่อนุมัติแล้ว</h2>
              </div>
              <div className="rounded-[20px] bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground">
                {filteredRequests.length} / {requests.length} คำขอ
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาจากชื่อผู้ใช้, ชื่อพนักงาน หรือสาขา"
                className="rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | "PENDING" | "APPROVED")}
                className="rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="PENDING">รออนุมัติ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
              </select>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "ALL" | "ADMIN" | "CASHIER")}
                className="rounded-[20px] border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent"
              >
                <option value="ALL">ทุกบทบาท</option>
                <option value="ADMIN">แอดมิน</option>
                <option value="CASHIER">แคชเชียร์</option>
              </select>
            </div>

            {isLoading ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-line bg-background p-6 text-sm text-muted">
                กำลังโหลดคำขอผู้ใช้...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-line bg-background p-6 text-sm leading-7 text-muted">
                ไม่พบคำขอที่ตรงกับตัวกรองปัจจุบัน ลองเปลี่ยนคำค้นหรือสถานะใหม่
              </div>
            ) : (
              <div className="mt-6 space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.request_id} className="rounded-[24px] border border-line bg-white p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">{request.branch_label}</p>
                      <h3 className="mt-2 text-xl font-semibold text-foreground">{request.full_name}</h3>
                      <p className="mt-1 text-sm text-muted">@{request.username} · {roleLabel[request.role]}</p>
                      <p className="mt-3 text-sm text-muted">ส่งคำขอเมื่อ {formatDateTime(request.submitted_at)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "APPROVED" ? "bg-accent text-black" : "bg-warning-soft text-foreground"}`}>
                        {request.status === "APPROVED" ? "อนุมัติแล้ว" : "รออนุมัติ"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApprove(request.request_id)}
                        disabled={request.status === "APPROVED" || isApprovingId === request.request_id}
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isApprovingId === request.request_id ? "กำลังอนุมัติ..." : "อนุมัติคำขอ"}
                      </button>
                    </div>
                  </div>
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