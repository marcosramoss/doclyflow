// =============================================================================
// Doclify — API client (fetch wrapper)
// =============================================================================
// Camada fina sobre fetch que:
//   - Injeta Bearer token automaticamente a partir do storage informado
//   - Converte erros HTTP em ApiError tipado (status + message + details)
//
// Nota: NÃO limpamos o storage automaticamente em 401. Isso cascateava para
// outros componentes (AppSidebar sumia mid-flight) e quebrava navegações
// futuras (próxima página redirecionava para /login). 401 é tratado pelo
// caller — apresentados na UI com CTA de re-login.
//
// Singleton (`api`) é exposto por src/data/api.ts para evitar ciclo de imports.
// =============================================================================

import type { CurrentUser } from './auth';
import type { RequirementDocument } from './types';

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface AuthStorage {
  load(): { token: string; user: CurrentUser } | null;
  save(token: string, user: CurrentUser): void;
  clear(): void;
}

export interface ApiClient {
  auth: {
    loginWithGoogle(
      idToken: string,
    ): Promise<{ token: string; user: CurrentUser; expiresAt: string }>;
    logout(): Promise<void>;
    me(): Promise<{ user: CurrentUser }>;
  };
  documents: {
    list(): Promise<RequirementDocument[]>;
    get(id: string): Promise<RequirementDocument | null>;
    create(doc: RequirementDocument): Promise<RequirementDocument>;
    update(id: string, doc: RequirementDocument): Promise<RequirementDocument>;
    delete(id: string): Promise<void>;
  };
}

export interface ApiClientConfig {
  baseUrl: string;
  storage: AuthStorage;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const { baseUrl, storage } = config;
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const stored = storage.load();
    if (stored?.token) headers['Authorization'] = `Bearer ${stored.token}`;

    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de rede';
      throw new ApiError(0, `Não foi possível contatar o servidor (${msg})`, err);
    }

    let parsed: unknown = null;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      try {
        parsed = await res.json();
      } catch {
        /* tolera JSON malformado */
      }
    }

    if (!res.ok) {
      // Não limpamos o storage em 401 aqui: isso cascateava para outros
      // componentes (sidebar sumia mid-flight) e quebrava navegações futuras
      // (storage vazio → next page redirecionava para /login). 401 deve ser
      // um erro tratável pelo caller — exibimos na UI com CTA de re-login.
      const errBody =
        parsed && typeof parsed === 'object'
          ? (parsed as { error?: string; details?: unknown })
          : null;
      const msg = errBody?.error ?? `HTTP ${res.status}`;
      throw new ApiError(res.status, msg, errBody?.details);
    }

    return parsed as T;
  }

  return {
    auth: {
      loginWithGoogle: (idToken) =>
        request<{ token: string; user: CurrentUser; expiresAt: string }>(
          'POST',
          '/auth/google',
          { token: idToken },
        ),
      logout: async (): Promise<void> => {
        await request<unknown>('POST', '/auth/logout');
      },
      me: () => request<{ user: CurrentUser }>('GET', '/auth/me'),
    },
    documents: {
      list: async () => {
        const data = await request<{ documents: RequirementDocument[] }>(
          'GET',
          '/documents',
        );
        return data.documents;
      },
      get: async (id) => {
        try {
          const data = await request<{ document: RequirementDocument }>(
            'GET',
            `/documents/${encodeURIComponent(id)}`,
          );
          return data.document;
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        }
      },
      create: async (doc) => {
        const data = await request<{ document: RequirementDocument }>(
          'POST',
          '/documents',
          doc,
        );
        return data.document;
      },
      update: async (id, doc) => {
        const data = await request<{ document: RequirementDocument }>(
          'PUT',
          `/documents/${encodeURIComponent(id)}`,
          doc,
        );
        return data.document;
      },
      delete: async (id: string): Promise<void> => {
        await request<unknown>('DELETE', `/documents/${encodeURIComponent(id)}`);
      },
    },
  };
}
