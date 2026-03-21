"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
    const router = useRouter();
    const { login, mode, status, demoPassword } = useAuth();
    const [username, setUsername] = useState(mode === "mock" ? "cashier" : "");
    const [password, setPassword] = useState(mode === "mock" ? demoPassword : "");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/dashboard");
        }
    }, [router, status]);

    useEffect(() => {
        setUsername(mode === "mock" ? "cashier" : "");
        setPassword(mode === "mock" ? demoPassword : "");
    }, [demoPassword, mode]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            await login(username, password);
            router.replace("/dashboard");
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "ไม่สามารถเข้าสู่ระบบได้"));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-6 py-10">
            <div className="w-full max-w-md">
                <section className="rounded-[36px] border border-line bg-surface p-8 shadow-[var(--shadow)] backdrop-blur md:p-10">
                    <div className="flex flex-col items-center text-center">
                        <div className="relative h-28 w-28 overflow-hidden rounded-[32px] border border-[#f6d94a]/60 bg-[#0e0d0a] shadow-[0_0_0_1px_rgba(255,214,10,0.2)]">
                            <Image src="/logo.jpg" alt="LA GYM logo" fill className="object-cover" priority />
                        </div>
                        <p className="mt-6 text-2xl font-semibold tracking-[0.14em] text-[#f6d94a]">LA GYM</p>
                        <h1 className="mt-3 text-4xl font-semibold text-foreground">เข้าสู่ระบบ</h1>
                    </div>

                    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                        <label className="block">
                            <span className="text-sm font-medium text-foreground">ชื่อผู้ใช้</span>
                            <input
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="mt-2 w-full rounded-[20px] border border-line bg-surface-strong px-4 py-3 text-foreground outline-none transition focus:border-accent"
                                placeholder={mode === "mock" ? "cashier" : "owner"}
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-foreground">รหัสผ่าน</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="mt-2 w-full rounded-[20px] border border-line bg-surface-strong px-4 py-3 text-foreground outline-none transition focus:border-accent"
                                placeholder={mode === "mock" ? demoPassword : "ChangeMe123!"}
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
                            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}