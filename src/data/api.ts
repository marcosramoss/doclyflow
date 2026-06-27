// =============================================================================
// Doclify — api singleton
// =============================================================================
// Inicializa o client HTTP com baseUrl lêPUBLIC_API_URL do Astro
// (em build/dev bundlado no cliente). Fallback dev-friendly para a URL
// default `http://127.0.0.1:8080/api`.
//
// Existe em arquivo próprio para evitar ciclo entre apiClient.ts e storage.ts.
// =============================================================================

import { createApiClient, type ApiClient } from './apiClient';
import { authStorage } from './storage';

const FALLBACK_BASE_URL = 'http://127.0.0.1:8080/api';

function resolveBaseUrl(): string {
  const env = (import.meta.env as { PUBLIC_API_URL?: string }).PUBLIC_API_URL;
  const value = typeof env === 'string' && env.trim() ? env.trim() : FALLBACK_BASE_URL;
  return value.replace(/\/+$/, '');
}

export const api: ApiClient = createApiClient({
  baseUrl: resolveBaseUrl(),
  storage: authStorage,
});
