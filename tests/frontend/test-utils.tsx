import { render } from "@testing-library/react";
import { Provider as JotaiProvider } from "jotai";
import type { ReactElement } from "react";
import { AdapterProvider } from "@/features/adapters/adapter-provider";
import { resetMockAdapterState } from "@/features/adapters/mock-app-adapter";
import { MockSessionProvider } from "@/features/auth/mock-session-provider";
import {
  clearMockSessionState,
  type StoredAuthState,
  writeMockSessionState,
} from "@/features/auth/mock-session-storage";

export function seedMockSession(state: StoredAuthState) {
  writeMockSessionState(state);
}

export function clearMockSession() {
  resetMockAdapterState();
  clearMockSessionState();
}

export function renderWithProviders(ui: ReactElement) {
  return render(
    <AdapterProvider>
      <JotaiProvider>
        <MockSessionProvider>{ui}</MockSessionProvider>
      </JotaiProvider>
    </AdapterProvider>,
  );
}