// =============================================================================
// Doclify — auth
// =============================================================================
// Camada fina sobre o API client. Mantém a mesma API pública de antes
// (login/logout/isAuthenticated/getCurrentUser/initialsOf + AUTH_KEY) para
// minimizar mudanças nos consumers; agora é async.
//
// Persistência e refresh cross-tab continuam no storage.ts e disparam
// o evento `auth-change` para sincronizar React islands.
// =============================================================================

import { api } from './api';
import { ApiError } from './apiClient';
import { authStorage } from './storage';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResult {
  ok: boolean;
  user?: CurrentUser;
  error?: string;
}

export const AUTH_KEY = 'doclify:auth:v1';

function describeError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'Não foi possível contatar o servidor.';
    if (e.status === 401) return 'Credenciais inválidas.';
    return e.message || fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const data = await api.auth.login(email, password);
    authStorage.save(data.token, data.user);
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: describeError(e, 'Falha ao entrar.') };
  }
}

export async function logout(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    // silencioso — a limpeza local basta para derrubar a sessão no cliente.
  } finally {
    authStorage.clear();
  }
}

export function isAuthenticated(): boolean {
  return authStorage.load() !== null;
}

export function getCurrentUser(): CurrentUser | null {
  return authStorage.load()?.user ?? null;
}

export function initialsOf(user: CurrentUser | null | undefined): string {
  if (!user) return '?';
  const parts = user.name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return (user.email[0] || '?').toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
