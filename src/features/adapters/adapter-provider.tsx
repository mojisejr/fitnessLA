"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { mockAppAdapter } from "@/features/adapters/mock-app-adapter";
import { realAppAdapter } from "@/features/adapters/real-app-adapter";
import type { AppAdapter } from "@/features/adapters/types";

const AdapterContext = createContext<AppAdapter | null>(null);

export function AdapterProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => {
    return process.env.NEXT_PUBLIC_APP_ADAPTER === "real" ? realAppAdapter : mockAppAdapter;
  }, []);

  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

export function useAppAdapter() {
  const context = useContext(AdapterContext);
  if (!context) {
    throw new Error("useAppAdapter must be used within AdapterProvider.");
  }
  return context;
}