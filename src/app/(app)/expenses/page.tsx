"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ShiftGuard } from "@/components/guards/shift-guard";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { validateReceiptFile } from "@/features/expenses/receipt-validation";
import { useAuth } from "@/features/auth/auth-provider";
import type { ChartOfAccountRecord } from "@/lib/contracts";
import { getErrorCode, getErrorMessage } from "@/lib/utils";

export default function ExpensesPage() {
  const adapter = useAppAdapter();
  const { session } = useAuth();
  const [amount, setAmount] = useState("120");
  const [description, setDescription] = useState("");
  const [expenseAccounts, setExpenseAccounts] = useState<ChartOfAccountRecord[]>([]);
  const [accountId, setAccountId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadAccounts() {
      setAvailabilityMessage(null);

      try {
        const accounts = await adapter.listChartOfAccounts();
        const expenseOnly = accounts.filter((account) => account.account_type === "EXPENSE" && account.is_active);
        if (isActive) {
          setExpenseAccounts(expenseOnly);
          setAccountId(String(expenseOnly[0]?.account_id ?? ""));
        }
      } catch (error) {
        if (isActive) {
          if (getErrorCode(error) === "NOT_IMPLEMENTED") {
            setExpenseAccounts([]);
            setAccountId("");
            setAvailabilityMessage("backend ปัจจุบันยังไม่มี COA API จริง จึงยังโหลดบัญชีรายจ่ายเพื่อยิง expense API ในโหมด real ไม่ได้");
          } else {
            setErrorMessage(getErrorMessage(error, "ไม่สามารถโหลดบัญชีรายจ่ายได้"));
          }
        }
      }
    }

    void loadAccounts();

    return () => {
      isActive = false;
    };
  }, [adapter]);

  useEffect(() => {
    if (!receiptFile) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(receiptFile);
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [receiptFile]);

  const selectedAccount = useMemo(
    () => expenseAccounts.find((account) => String(account.account_id) === accountId),
    [accountId, expenseAccounts],
  );

  const isSubmissionBlocked = Boolean(availabilityMessage) || expenseAccounts.length === 0;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setErrorMessage(null);

    const validationMessage = validateReceiptFile(file);
    if (validationMessage) {
      setReceiptFile(null);
      setErrorMessage(validationMessage);
      return;
    }

    setReceiptFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedAmount = Number(amount);

    if (!session?.active_shift_id) {
      setErrorMessage("กรุณาเปิดกะก่อนบันทึกเงินสดย่อย");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    if (availabilityMessage) {
      setErrorMessage("ยังไม่สามารถบันทึกเงินสดย่อยในโหมด real ได้ เพราะ backend ยังไม่มี COA API สำหรับโหลดบัญชีรายจ่าย");
      return;
    }

    if (!accountId) {
      setErrorMessage("ยังไม่มีบัญชีรายจ่ายให้เลือก");
      return;
    }

    const validationMessage = validateReceiptFile(receiptFile);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    if (!receiptFile) {
      setErrorMessage("ต้องแนบรูปใบเสร็จ");
      return;
    }

    const currentReceiptFile = receiptFile;

    setIsSubmitting(true);

    try {
      const result = await adapter.createExpense({
        shift_id: session.active_shift_id,
        account_id: accountId,
        amount: parsedAmount,
        description,
        receiptName: currentReceiptFile.name,
        receiptFile: currentReceiptFile,
      });

      setSuccessMessage(`บันทึกรายจ่าย #${result.expense_id} สำเร็จแล้ว`);
      setDescription("");
      setAmount("120");
      setReceiptFile(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถบันทึกเงินสดย่อยได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ShiftGuard>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Receipt-required flow</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">เงินสดย่อย</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            ฟอร์มนี้ยึดตามกฎหลักของงานบัญชี: ต้องมีกะ, ต้องเลือกบัญชีรายจ่าย และต้องแนบใบเสร็จก่อนบันทึก
          </p>

          {availabilityMessage ? (
            <div className="mt-5 rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
              {availabilityMessage}
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-foreground">จำนวนเงิน</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">บัญชีรายจ่าย</span>
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  disabled={isSubmissionBlocked}
                  className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] outline-none transition focus:border-accent"
                >
                  {expenseAccounts.length === 0 ? <option value="">ยังไม่มีบัญชีรายจ่ายให้เลือก</option> : null}
                  {expenseAccounts.map((account) => (
                    <option key={account.account_id} value={account.account_id}>
                      {account.account_code} · {account.account_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-foreground">รายละเอียด</span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="อธิบายวัตถุประสงค์ของรายจ่ายนี้"
                className="mt-2 w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-[#17130a] placeholder:text-[#8a7840] outline-none transition focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">รูปใบเสร็จ</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                className="mt-2 block w-full rounded-[20px] border border-line bg-[#fff8de] px-4 py-3 text-sm text-[#17130a] file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:font-semibold file:text-black"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-[20px] border border-accent bg-accent-soft px-4 py-3 text-sm text-foreground">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isSubmissionBlocked}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังบันทึกรายจ่าย..." : "บันทึกเงินสดย่อย"}
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-line bg-surface-strong p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">ตัวอย่างการตรวจสอบข้อมูล</p>
          <div className="mt-4 rounded-3xl border border-line bg-background p-5">
            <p className="text-sm text-muted">บัญชีที่เลือก</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {selectedAccount ? `${selectedAccount.account_code} · ${selectedAccount.account_name}` : "ยังไม่ได้เลือกบัญชี"}
            </p>
            <p className="mt-4 text-sm text-muted">ไฟล์ที่รับ: JPG, PNG ขนาดไม่เกิน 5MB</p>
          </div>

          <div className="mt-5 rounded-3xl border border-line bg-background p-5">
            <p className="text-sm text-muted">ตัวอย่างใบเสร็จ</p>
            {previewUrl ? (
              <div className="relative mt-4 h-72 overflow-hidden rounded-[20px]">
                <Image
                  src={previewUrl}
                  alt="ตัวอย่างใบเสร็จ"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-dashed border-line px-4 py-16 text-center text-sm text-muted">
                อัปโหลดใบเสร็จเพื่อดูตัวอย่างที่นี่
              </div>
            )}
          </div>
        </section>
      </div>
    </ShiftGuard>
  );
}