export {
  authStorageEventName as mockSessionStorageEventName,
  authStorageKey as mockSessionStorageKey,
  clearAuthState as clearMockSessionState,
  emptyAuthState,
  readAuthState as readMockSessionState,
  subscribeAuthState as subscribeMockSessionState,
  writeAuthState as writeMockSessionState,
} from "@/features/auth/auth-storage";
export type { AuthState as StoredAuthState } from "@/features/auth/auth-storage";