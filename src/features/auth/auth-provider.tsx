"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Role, ShiftCloseResult, ShiftOpenResult, UserSession, MockShiftRecord } from "@/lib/contracts";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { demoPassword, mockUsersByRole } from "@/lib/mock-data";
import {
  emptyAuthState,
  readAuthState,
  subscribeAuthState,
  writeAuthState,
} from "@/features/auth/auth-storage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  mode: "mock" | "real";
  status: AuthStatus;
  session: UserSession | null;
  activeShift: MockShiftRecord | null;
  lastClosedShift: ShiftCloseResult | null;
  demoPassword: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => void;
  openShift: (startingCash: number) => Promise<ShiftOpenResult>;
  closeShift: (actualCash: number, closingNote?: string) => Promise<ShiftCloseResult>;
  clearLastClosedShift: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const adapter = useAppAdapter();
  const { session, activeShift, lastClosedShift } = useSyncExternalStore(
    subscribeAuthState,
    readAuthState,
    () => emptyAuthState,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(adapter.mode === "real");

  useEffect(() => {
    let isActive = true;

    async function bootstrapRealSession() {
      if (adapter.mode !== "real") {
        setIsBootstrapping(false);
        return;
      }

      if (!session?.username) {
        if (isActive) {
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        const refreshedSession = await adapter.authenticateUser(session.username, "");
        const resolvedActiveShift = await adapter.getActiveShift();

        if (!isActive) {
          return;
        }

        writeAuthState({
          session: {
            ...refreshedSession,
            active_shift_id: resolvedActiveShift?.shift_id ?? refreshedSession.active_shift_id ?? null,
          },
          activeShift: resolvedActiveShift,
          lastClosedShift,
        });
      } catch {
        if (!isActive) {
          return;
        }

        writeAuthState({
          session: null,
          activeShift: null,
          lastClosedShift,
        });
      } finally {
        if (isActive) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapRealSession();

    return () => {
      isActive = false;
    };
  }, [adapter, lastClosedShift, session?.username]);

  const login = async (username: string, password: string) => {
    const nextSession = await adapter.authenticateUser(username, password);
    const resolvedActiveShift = adapter.mode === "real" ? await adapter.getActiveShift() : activeShift;
    const preservedShiftId = resolvedActiveShift?.shift_id ?? nextSession.active_shift_id ?? null;

    writeAuthState({
      session: { ...nextSession, active_shift_id: preservedShiftId },
      activeShift: resolvedActiveShift,
      lastClosedShift,
    });
  };

  const logout = () => {
    writeAuthState(emptyAuthState);
  };

  const switchRole = (role: Role) => {
    if (adapter.mode !== "mock") {
      return;
    }

    const baseSession = mockUsersByRole[role];
    writeAuthState({
      session: { ...baseSession, active_shift_id: activeShift?.shift_id ?? null },
      activeShift,
      lastClosedShift,
    });
  };

  const openShift = async (startingCash: number) => {
    if (!session) {
      throw { code: "UNAUTHENTICATED", message: "กรุณาเข้าสู่ระบบก่อนเปิดกะ" };
    }

    if (activeShift) {
      throw { code: "SHIFT_ALREADY_OPEN", message: "มีกะที่เปิดอยู่แล้ว" };
    }

    const result = await adapter.openShift(startingCash);
    const nextShift: MockShiftRecord = {
      shift_id: result.shift_id,
      opened_at: result.opened_at,
      starting_cash: startingCash,
    };

    writeAuthState({
      session: { ...session, active_shift_id: result.shift_id },
      activeShift: nextShift,
      lastClosedShift: null,
    });

    return result;
  };

  const closeShift = async (actualCash: number, closingNote?: string) => {
    void closingNote;

    if (!session || !activeShift) {
      throw { code: "NO_ACTIVE_SHIFT", message: "กรุณาเปิดกะก่อนปิดกะ" };
    }

    const result = await adapter.closeShift({ activeShift, actualCash });

    writeAuthState({
      session: { ...session, active_shift_id: null },
      activeShift: null,
      lastClosedShift: result,
    });

    return result;
  };

  const clearLastClosedShift = () => {
    writeAuthState({
      session,
      activeShift,
      lastClosedShift: null,
    });
  };

  const status: AuthStatus = isBootstrapping ? "loading" : session ? "authenticated" : "unauthenticated";

  const value: AuthContextValue = {
    mode: adapter.mode,
    status,
    session,
    activeShift,
    lastClosedShift,
    demoPassword: adapter.mode === "mock" ? demoPassword : "",
    login,
    logout,
    switchRole,
    openShift,
    closeShift,
    clearLastClosedShift,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}