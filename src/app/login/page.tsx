"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogoSlot } from "@/components/branding/logo-slot";
import { useMockSession } from "@/features/auth/mock-session-provider";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { login, status, demoPassword } = useMockSession();
  const [username, setUsername] = useState("cashier");
  const [password, setPassword] = useState(demoPassword);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ไม่สามารถเริ่ม session mock ได้"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[36px] border border-line bg-[#0c0c0c] p-8 text-white shadow-[var(--shadow)] md:p-10">
          <p className="text-xs uppercase tracking-[0.32em] text-white/65">Frontend Owner Scaffold</p>
          <div className="mt-5">
            <LogoSlot />
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
            หน้าร้านภาษาไทย โทนดำเหลือง พร้อมโครงพร้อมต่อ backend เมื่อ contract มาครบ
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/75">
            workspace นี้ตั้งใจให้ส่งงานแบบ mock-first เพื่อให้ UI, guard และ flow หลักเดินต่อได้ทันที ระหว่างรอ API จริงจากอีกฝั่ง
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Shell ตามบทบาท", "เมนูด้านข้าง, badge ผู้ใช้, สถานะกะ และจุดวางโลโก้"],
              ["Blind drop", "ยอดเงินคาดหวังจะยังไม่แสดงจนกว่าจะปิดกะสำเร็จ"],
              ["POS พร้อมทดสอบ", "มี cart ด้วย Jotai, flow การจ่ายเงิน และผลลัพธ์คำสั่งขายแบบ mock"],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur md:p-10">
          <p className="text-xs uppercase tracking-[0.32em] text-muted">เข้าสู่ระบบแบบ mock</p>
          <h2 className="mt-4 text-3xl font-semibold text-foreground">เข้าสู่หน้าควบคุมงาน</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            มีผู้ใช้ตัวอย่างให้แล้ว รหัสผ่านของทุกบทบาทคือ <span className="font-semibold text-foreground">{demoPassword}</span>
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["owner", "มุมมองเจ้าของ"],
              ["admin", "งานปฏิบัติการแอดมิน"],
              ["cashier", "flow แคชเชียร์"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setUsername(value)}
                className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:bg-accent-soft"
              >
                {label}
              </button>
            ))}
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-foreground">ชื่อผู้ใช้</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-surface-strong px-4 py-3 text-foreground outline-none transition focus:border-accent"
                placeholder="owner"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground">รหัสผ่าน</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-[20px] border border-line bg-surface-strong px-4 py-3 text-foreground outline-none transition focus:border-accent"
                placeholder="demo1234"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-[20px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เริ่มใช้งาน mock"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}