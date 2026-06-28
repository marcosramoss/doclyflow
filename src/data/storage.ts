// =============================================================================
// Doclyflow — auth storage
// =============================================================================
// Persiste `{ token, user }` no localStorage sob a chave `doclyflow:auth:v1`
// e dispara o evento `auth-change` a cada mutação para manter os React
// islands sincronizados em uma mesma aba e em abas irmãs (via `storage`).
//
// Implementa a interface AuthStorage consumida pelo apiClient.
// =============================================================================

import type { CurrentUser } from './auth';

const STORAGE_KEY = 'doclyflow:auth:v1';

interface StoredAuth {
  token: string;
  user: CurrentUser;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'));
  }
}

export const authStorage = {
  load(): StoredAuth | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredAuth>;
      if (!parsed || typeof parsed.token !== 'string' || !parsed.user) return null;
      return { token: parsed.token, user: parsed.user };
    } catch {
      return null;
    }
  },

  save(token: string, user: CurrentUser): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, user }),
    );
    emitChange();
  },

  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(STORAGE_KEY);
    emitChange();
  },
};
