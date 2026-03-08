import type { MockShiftRecord, ShiftCloseResult, UserSession } from "@/lib/contracts";

export type StoredAuthState = {
  session: UserSession | null;
  activeShift: MockShiftRecord | null;
  lastClosedShift: ShiftCloseResult | null;
};

export const mockSessionStorageKey = "fitnessla.mock-session";
export const mockSessionStorageEventName = "fitnessla.mock-session.changed";
export const emptyAuthState: StoredAuthState = {
  session: null,
  activeShift: null,
  lastClosedShift: null,
};

let cachedRawState: string | null | undefined;
let cachedParsedState: StoredAuthState = emptyAuthState;

export function readMockSessionState(): StoredAuthState {
  if (typeof window === "undefined") {
    return emptyAuthState;
  }

  const raw = window.localStorage.getItem(mockSessionStorageKey);

  if (raw === cachedRawState) {
    return cachedParsedState;
  }

  if (!raw) {
    cachedRawState = raw;
    cachedParsedState = emptyAuthState;
    return emptyAuthState;
  }

  try {
    cachedRawState = raw;
    cachedParsedState = JSON.parse(raw) as StoredAuthState;
    return cachedParsedState;
  } catch {
    cachedRawState = raw;
    cachedParsedState = emptyAuthState;
    return emptyAuthState;
  }
}

export function writeMockSessionState(nextState: StoredAuthState) {
  if (typeof window === "undefined") {
    return;
  }

  const raw = JSON.stringify(nextState);
  cachedRawState = raw;
  cachedParsedState = nextState;
  window.localStorage.setItem(mockSessionStorageKey, raw);
  window.dispatchEvent(new Event(mockSessionStorageEventName));
}

export function clearMockSessionState() {
  if (typeof window === "undefined") {
    return;
  }

  cachedRawState = null;
  cachedParsedState = emptyAuthState;
  window.localStorage.removeItem(mockSessionStorageKey);
  window.dispatchEvent(new Event(mockSessionStorageEventName));
}

export function subscribeMockSessionState(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(mockSessionStorageEventName, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(mockSessionStorageEventName, handleChange);
  };
}