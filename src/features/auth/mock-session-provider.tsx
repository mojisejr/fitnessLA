"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Role, ShiftCloseResult, ShiftOpenResult, UserSession, MockShiftRecord } from "@/lib/contracts";
import { useAppAdapter } from "@/features/adapters/adapter-provider";
import { demoPassword, mockUsersByRole } from "@/lib/mock-data";
import {
  emptyAuthState,
  readMockSessionState,
  subscribeMockSessionState,
  writeMockSessionState,
} from "@/features/auth/mock-session-storage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type MockSessionContextValue = {
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

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

export function MockSessionProvider({ children }: { children: ReactNode }) {
  const adapter = useAppAdapter();
  const { session, activeShift, lastClosedShift } = useSyncExternalStore(
    subscribeMockSessionState,
    readMockSessionState,
    () => emptyAuthState,
  );

  const login = async (username: string, password: string) => {
    const nextSession = await adapter.authenticateUser(username, password);
    const preservedShiftId = activeShift?.shift_id ?? null;

    writeMockSessionState({
      session: { ...nextSession, active_shift_id: preservedShiftId },
      activeShift,
      lastClosedShift,
    });
  };

  const logout = () => {
    writeMockSessionState(emptyAuthState);
  };

  const switchRole = (role: Role) => {
    const baseSession = mockUsersByRole[role];
    writeMockSessionState({
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

    writeMockSessionState({
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

    writeMockSessionState({
      session: { ...session, active_shift_id: null },
      activeShift: null,
      lastClosedShift: result,
    });

    return result;
  };

  const clearLastClosedShift = () => {
    writeMockSessionState({
      session,
      activeShift,
      lastClosedShift: null,
    });
  };

  const status: AuthStatus = session ? "authenticated" : "unauthenticated";

  const value: MockSessionContextValue = {
    status,
    session,
    activeShift,
    lastClosedShift,
    demoPassword,
    login,
    logout,
    switchRole,
    openShift,
    closeShift,
    clearLastClosedShift,
  };

  return (
    <MockSessionContext.Provider value={value}>
      {children}
    </MockSessionContext.Provider>
  );
}

export function useMockSession() {
  const context = useContext(MockSessionContext);

  if (!context) {
    throw new Error("useMockSession must be used within MockSessionProvider.");
  }

  return context;
}