"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/guards/role-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import type { AccountType, ChartOfAccountRecord } from "@/lib/contracts";
import { getErrorCode, getErrorMessage } from "@/lib/utils";

const accountTypeLabel: Record<AccountType | "ALL", string> = {
  ALL: "ทุกหมวด",
  ASSET: "สินทรัพย์",
  LIABILITY: "หนี้สิน",
  EQUITY: "ทุน",
  REVENUE: "รายได้",
  EXPENSE: "ค่าใช้จ่าย",
};

export default function ChartOfAccountsPage() {
  const adapter = useAppAdapter();
  const [accounts, setAccounts] = useState<ChartOfAccountRecord[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("EXPENSE");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadAccounts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await adapter.listChartOfAccounts();
        if (isActive) {
          setAccounts(result);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดผังบัญชีได้"));
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
    const normalizedSearch = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesType = typeFilter === "ALL" ? true : account.account_type === typeFilter;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : [account.account_code, account.account_name, account.description ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [accounts, search, typeFilter]);

  async function handleCreateAccount() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!/^\d{4,}$/.test(accountCode.trim())) {
      setErrorMessage("รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก");
      return;
    }

    if (accountName.trim().length < 3) {
      setErrorMessage("ชื่อบัญชีต้องยาวอย่างน้อย 3 ตัวอักษร");
      return;
    }

    setIsCreating(true);

    try {
      const created = await adapter.createChartOfAccount({
        account_code: accountCode.trim(),
        account_name: accountName.trim(),
        account_type: accountType,
        description: description.trim() || undefined,
      });

      setAccounts((current) => [...current, created].sort((left, right) => left.account_code.localeCompare(right.account_code)));
      setSuccessMessage(`สร้างบัญชี ${created.account_code} สำเร็จแล้ว`);
      setAccountCode("");
      setAccountName("");
      setAccountType("EXPENSE");
      setDescription("");
      setTypeFilter("ALL");
      setSearch("");
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === "ACCOUNT_CODE_DUPLICATED") {
        setErrorMessage("รหัสบัญชีนี้ถูกใช้งานแล้ว");
      } else if (errorCode === "INVALID_ACCOUNT_CODE") {
        setErrorMessage("รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก");
      } else if (errorCode === "INVALID_ACCOUNT_NAME") {
        setErrorMessage("ชื่อบัญชีต้องยาวอย่างน้อย 3 ตัวอักษร");
      } else {
        setErrorMessage(getErrorMessage(error, "ไม่สามารถสร้างผังบัญชีได้"));
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleAccount(account: ChartOfAccountRecord) {
    setTogglingId(String(account.account_id));
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await adapter.toggleChartOfAccount(account.account_id);
      setAccounts((current) => current.map((item) => (String(item.account_id) === String(updated.account_id) ? updated : item)));
      setSuccessMessage(`${updated.account_code} ถูก${updated.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}แล้ว`);
    } catch (error) {
      if (getErrorCode(error) === "ACCOUNT_LOCKED") {
        setErrorMessage("บัญชีนี้ไม่สามารถปรับสถานะได้");
      } else {
        setErrorMessage(getErrorMessage(error, "ไม่สามารถปรับสถานะบัญชีได้"));
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN"]}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">บัญชีและการควบคุมรายได้ค่าใช้จ่าย</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">ผังบัญชี</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            หน้านี้อ่านและจัดการข้อมูลผังบัญชีจากระบบจริง เพื่อใช้กับ POS, รายจ่าย และรายงานบัญชี โดยไม่อิง mock catalog อีกแล้ว
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาจากรหัสบัญชี, ชื่อบัญชี หรือคำอธิบาย"
              className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
            />
            <select
              aria-label="กรองตามหมวดบัญชี"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as AccountType | "ALL")}
              className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
            >
              {(Object.keys(accountTypeLabel) as Array<AccountType | "ALL">).map((type) => (
                <option key={type} value={type}>
                  {accountTypeLabel[type]}
                </option>
              ))}
            </select>
            <div className="rounded-[20px] border border-line bg-background/70 px-4 py-3 text-sm text-muted">
              ทั้งหมด {filteredAccounts.length} บัญชี
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">เพิ่มบัญชีใหม่</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={accountCode}
                onChange={(event) => setAccountCode(event.target.value)}
                placeholder="รหัสบัญชี"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="ชื่อบัญชี"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
              <select
                aria-label="ประเภทบัญชีใหม่"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value as AccountType)}
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
              >
                {(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as AccountType[]).map((type) => (
                  <option key={type} value={type}>
                    {accountTypeLabel[type]}
                  </option>
                ))}
              </select>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)"
                className="w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
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

            <button
              type="button"
              onClick={() => void handleCreateAccount()}
              disabled={isCreating}
              className="mt-5 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "กำลังสร้างบัญชี..." : "สร้างบัญชีใหม่"}
            </button>
          </div>

          <div className="rounded-[28px] border border-line bg-surface-strong p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">รายการบัญชีจากฐานข้อมูล</p>

            {isLoading ? (
              <div className="mt-4 rounded-[20px] border border-dashed border-line bg-background/70 px-4 py-8 text-sm text-muted">
                กำลังโหลดผังบัญชี...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="mt-4 rounded-[20px] border border-dashed border-line bg-background/70 px-4 py-8 text-sm text-muted">
                ไม่พบบัญชีที่ตรงกับเงื่อนไขที่เลือก ลองเปลี่ยนคำค้นหรือ filter ใหม่
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th className="px-3 py-3 font-medium">รหัส</th>
                      <th className="px-3 py-3 font-medium">ชื่อบัญชี</th>
                      <th className="px-3 py-3 font-medium">หมวด</th>
                      <th className="px-3 py-3 font-medium">สถานะ</th>
                      <th className="px-3 py-3 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.account_id} className="border-b border-line/70 align-top last:border-b-0">
                        <td className="px-3 py-4 text-foreground">{account.account_code}</td>
                        <td className="px-3 py-4">
                          <button type="button" className="text-left font-semibold text-foreground">
                            {account.account_name}
                          </button>
                          {account.description ? <p className="mt-1 text-xs leading-6 text-muted">{account.description}</p> : null}
                          {account.locked_reason ? <p className="mt-1 text-xs leading-6 text-warning">{account.locked_reason}</p> : null}
                        </td>
                        <td className="px-3 py-4 text-muted">{accountTypeLabel[account.account_type]}</td>
                        <td className="px-3 py-4">
                          <span className={account.is_active ? "text-accent" : "text-warning"}>
                            {account.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => void handleToggleAccount(account)}
                            disabled={togglingId === String(account.account_id)}
                            className="rounded-full border border-line px-4 py-2 font-semibold text-foreground transition hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {togglingId === String(account.account_id)
                              ? "กำลังบันทึก..."
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
        </section>
      </div>
    </RoleGuard>
  );
}
