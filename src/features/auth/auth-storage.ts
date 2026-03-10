import type { MockShiftRecord, ShiftCloseResult, UserSession } from "@/lib/contracts";

export type AuthState = {
  session: UserSession | null;
  activeShift: MockShiftRecord | null;
  lastClosedShift: ShiftCloseResult | null;
};

export type StoredAuthState = AuthState;

export const authStorageKey = "fitnessla.auth-session";
export const legacyAuthStorageKey = "fitnessla.mock-session";
export const authStorageEventName = "fitnessla.auth-session.changed";
export const emptyAuthState: AuthState = {
  session: null,
  activeShift: null,
  lastClosedShift: null,
};

let cachedRawState: string | null | undefined;
let cachedParsedState: AuthState = emptyAuthState;

function readRawState(): string | null {
  const current = window.localStorage.getItem(authStorageKey);
  if (current) {
    return current;
  }

  return window.localStorage.getItem(legacyAuthStorageKey);
}

export function readAuthState(): AuthState {
  if (typeof window === "undefined") {
    return emptyAuthState;
  }

  const raw = readRawState();

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
    cachedParsedState = JSON.parse(raw) as AuthState;
    return cachedParsedState;
  } catch {
    cachedRawState = raw;
    cachedParsedState = emptyAuthState;
    return emptyAuthState;
  }
}

export function writeAuthState(nextState: AuthState) {
  if (typeof window === "undefined") {
    return;
  }

  const raw = JSON.stringify(nextState);
  cachedRawState = raw;
  cachedParsedState = nextState;
  window.localStorage.setItem(authStorageKey, raw);
  window.localStorage.removeItem(legacyAuthStorageKey);
  window.dispatchEvent(new Event(authStorageEventName));
}

export function clearAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  cachedRawState = null;
  cachedParsedState = emptyAuthState;
  window.localStorage.removeItem(authStorageKey);
  window.localStorage.removeItem(legacyAuthStorageKey);
  window.dispatchEvent(new Event(authStorageEventName));
}

export function subscribeAuthState(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(authStorageEventName, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(authStorageEventName, handleChange);
  };
}