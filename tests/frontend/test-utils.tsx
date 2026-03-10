import { render } from "@testing-library/react";
import { Provider as JotaiProvider } from "jotai";
import type { ReactElement } from "react";
import { AdapterProvider } from "@/features/adapters/adapter-provider";
import { resetMockAdapterState } from "@/features/adapters/mock-app-adapter";
import { AuthProvider } from "@/features/auth/auth-provider";
import { resetMemberRegistry } from "@/features/members/member-registry";
import {
  clearAuthState,
  type StoredAuthState,
  writeAuthState,
} from "@/features/auth/auth-storage";

export function seedMockSession(state: StoredAuthState) {
  writeAuthState(state);
}

export function clearMockSession() {
  resetMockAdapterState();
  resetMemberRegistry();
  clearAuthState();
}

export function renderWithProviders(ui: ReactElement) {
  return render(
    <AdapterProvider>
      <JotaiProvider>
        <AuthProvider>{ui}</AuthProvider>
      </JotaiProvider>
    </AdapterProvider>,
  );
}