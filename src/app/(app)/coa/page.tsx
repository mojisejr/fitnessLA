"use client";

import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { CreateChartOfAccountInput } from "@/features/adapters/types";
import type { AccountType, ChartOfAccountRecord, EntityId } from "@/lib/contracts";
import { getErrorCode, getErrorMessage } from "@/lib/utils";

const accountTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const accountTypeLabel: Record<AccountType, string> = {
  ASSET: "สินทรัพย์",
  LIABILITY: "หนี้สิน",
  EQUITY: "ส่วนของเจ้าของ",
  REVENUE: "รายได้",
  EXPENSE: "ค่าใช้จ่าย",
};

function getChartOfAccountsErrorMessage(error: unknown, fallback: string) {
  const errorCode = getErrorCode(error);

  if (errorCode === "UNAUTHENTICATED") {
    return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งก่อนจัดการผังบัญชี";
  }

  if (errorCode === "FORBIDDEN") {
    return "บทบาทปัจจุบันไม่มีสิทธิ์จัดการผังบัญชี";
  }

  if (errorCode === "ACCOUNT_LOCKED") {
    return "บัญชีนี้ถูก lock จากการใช้งานทางบัญชี จึงยังไม่สามารถปรับสถานะได้";
  }

  return getErrorMessage(error, fallback);
}

export default function ChartOfAccountsPage() {
  const adapter = useAppAdapter();
  const [accounts, setAccounts] = useState<ChartOfAccountRecord[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<EntityId | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("EXPENSE");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<EntityId | null>(null);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isActive = true;

    async function loadAccounts() {
      setIsLoading(true);
      setErrorMessage(null);
      setAvailabilityMessage(null);

      try {
        const result = await adapter.listChartOfAccounts();
        if (!isActive) {
          return;
        }

        setAccounts(result);
        setSelectedAccountId((current) => current ?? result[0]?.account_id ?? null);
      } catch (error) {
        if (isActive) {
          if (getErrorCode(error) === "NOT_IMPLEMENTED") {
            setAccounts([]);
            setSelectedAccountId(null);
            setAvailabilityMessage("backend ปัจจุบันยังไม่มี COA API จริง หน้านี้จึงอยู่ในสถานะพร้อมต่อ แต่ยังจัดการข้อมูลจริงไม่ได้");
          } else {
            setErrorMessage(getChartOfAccountsErrorMessage(error, "ไม่สามารถโหลดผังบัญชีได้"));
          }
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      isActive = false;
    };
  }, [adapter]);

  const filteredAccounts = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch =
        normalized.length === 0 ||
        `${account.account_code} ${account.account_name} ${account.description ?? ""}`
          .toLowerCase()
          .includes(normalized);
      const matchesType = typeFilter === "ALL" || account.account_type === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? account.is_active : !account.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, deferredSearch, statusFilter, typeFilter]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.account_id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const isReadOnlyMode = Boolean(availabilityMessage);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (isReadOnlyMode) {
      setErrorMessage("ยังไม่สามารถสร้างบัญชีได้ เพราะ backend ยังไม่มี COA API จริง");
      return;
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const payload: CreateChartOfAccountInput = {
      account_code: trimmedCode,
      account_name: trimmedName,
      account_type: accountType,
      description: description.trim() || undefined,
    };

    if (!/^\d{4,}$/.test(trimmedCode)) {
      setErrorMessage("รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก");
      return;
    }

    if (trimmedName.length < 3) {
      setErrorMessage("ชื่อบัญชีต้องยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }

    setIsSubmitting(true);

    try {
      const nextAccount = await adapter.createChartOfAccount(payload);
      setAccounts((current) => [nextAccount, ...current]);
      setSelectedAccountId(nextAccount.account_id);
      setCode("");
      setName("");
      setAccountType("EXPENSE");
      setDescription("");
      setStatusMessage(`สร้างบัญชี ${nextAccount.account_code} สำเร็จแล้ว`);
    } catch (error) {
      setErrorMessage(getChartOfAccountsErrorMessage(error, "ไม่สามารถสร้างบัญชีได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleAccount(accountId: EntityId) {
    setStatusMessage(null);
    setErrorMessage(null);

    if (isReadOnlyMode) {
      setErrorMessage("ยังไม่สามารถเปลี่ยนสถานะบัญชีได้ เพราะ backend ยังไม่มี COA API จริง");
      return;
    }

    setIsTogglingId(accountId);

    try {
      const updated = await adapter.toggleChartOfAccount(accountId);
      setAccounts((current) =>
        current.map((account) => (account.account_id === accountId ? updated : account)),
      );
      setStatusMessage(
        `${updated.account_code} ถูกปรับเป็น${updated.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}แล้ว`,
      );
    } catch (error) {
      setErrorMessage(getChartOfAccountsErrorMessage(error, "ไม่สามารถเปลี่ยนสถานะบัญชีได้"));
    } finally {
      setIsTogglingId(null);
    }
  }

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Owner and admin management</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">ผังบัญชี</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            หน้านี้รองรับ flow ดูรายการบัญชี, สร้างบัญชี, ปรับสถานะใช้งาน และจะบอกสถานะชัดเจนทันทีถ้า backend environment ปัจจุบันยังไม่มี COA API จริง
          </p>
        </section>

        {availabilityMessage ? (
          <section className="rounded-[28px] border border-warning bg-warning-soft p-6 md:p-8 text-sm leading-7 text-foreground">
            {availabilityMessage}
          </section>
        ) : null}

        <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_380px]">
          <div className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">รายการบัญชี</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">พื้นที่ตรวจสอบสำหรับเจ้าของ</h2>
              </div>
              <div className="rounded-[20px] bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground">
                {filteredAccounts.length} / {accounts.length} บัญชี
              </div>
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาจากรหัสบัญชี, ชื่อบัญชี หรือคำอธิบาย"
                className="rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as AccountType | "ALL")}
                className="rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              >
                <option value="ALL">ทุกประเภท</option>
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {accountTypeLabel[type]}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                className="rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="ACTIVE">ใช้งาน</option>
                <option value="INACTIVE">ไม่ใช้งาน</option>
              </select>
            </div>

            {isLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                กำลังโหลดผังบัญชี...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-line bg-background p-6 text-sm leading-7 text-muted">
                ไม่พบบัญชีที่ตรงกับเงื่อนไขที่เลือก ลองเปลี่ยนคำค้นหรือ filter ใหม่
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-[#161510]">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-[#0d0d0a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted">รหัส</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">ชื่อบัญชี</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">ประเภท</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">สถานะ</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAccounts.map((account) => (
                    <tr
                      key={account.account_id}
                      className={account.account_id === selectedAccountId ? "bg-accent-soft/60" : undefined}
                    >
                      <td className="px-4 py-4 font-semibold text-[#f3e8ba]">{account.account_code}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedAccountId(account.account_id)}
                          className="text-left font-medium text-[#f3e8ba] transition hover:text-accent"
                        >
                          {account.account_name}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-[#d8c98d]">{account.account_type}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${account.is_active ? "bg-accent text-black" : "bg-warning-soft text-foreground"}`}
                        >
                          {account.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAccount(account.account_id)}
                          className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-[#f3e8ba] transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={Boolean(account.locked_reason) || isTogglingId === account.account_id}
                        >
                          {isTogglingId === account.account_id
                            ? "กำลังอัปเดต..."
                            : account.is_active
                              ? "ปิดใช้งาน"
                              : "เปิดใช้งาน"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-1">
            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">สร้างบัญชี</p>
              <form className="mt-5 space-y-4" onSubmit={handleCreateAccount}>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="รหัสบัญชี"
                  className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                  required
                />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="ชื่อบัญชี"
                  className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                  required
                />
                <select
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value as AccountType)}
                  className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {accountTypeLabel[type]}
                    </option>
                  ))}
                </select>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="คำอธิบายเพิ่มเติม"
                  rows={4}
                  className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || isReadOnlyMode}
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชีใหม่"}
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
            </section>

            <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">บัญชีที่เลือก</p>
              {selectedAccount ? (
                <div className="mt-4 space-y-3 rounded-3xl bg-[#161510] p-5">
                  <div>
                    <p className="text-sm text-muted">รหัสบัญชี</p>
                    <p className="text-xl font-semibold text-[#f3e8ba]">{selectedAccount.account_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">ชื่อบัญชี</p>
                    <p className="text-xl font-semibold text-[#f3e8ba]">{selectedAccount.account_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">ประเภท</p>
                    <p className="text-sm leading-7 text-[#f3e8ba]">{accountTypeLabel[selectedAccount.account_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">คำอธิบาย</p>
                    <p className="text-sm leading-7 text-[#f3e8ba]">{selectedAccount.description ?? "ยังไม่มีคำอธิบาย"}</p>
                  </div>
                  {selectedAccount.locked_reason ? (
                    <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                      {selectedAccount.locked_reason}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-line bg-background p-6 text-sm text-muted">
                  เลือกบัญชีจากตารางด้านซ้ายเพื่อดูรายละเอียด
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}