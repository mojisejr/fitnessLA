import type { ReactNode } from "react";
import { AuthGuard } from "@/components/guards/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}