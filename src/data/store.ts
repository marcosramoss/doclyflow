// =============================================================================
// RequisitaApp — documents store
// =============================================================================
// Substitui o antigo mock em localStorage por chamadas reais ao backend.
//
// Interface pública preservada (getDocuments / getDocument / saveDocument /
// deleteDocument / generateId / resetStore) — agora todas as funções de I/O
// retornam Promises, exceto `generateId` (utilidade local) e `resetStore`
// (no-op, mantido para compatibilidade).
//
// Estratégia de `saveDocument`:
//   - PUT `/documents/:id` (atualização)
//   - on 404 (id ainda não conhecido pelo servidor) → POST `/documents`
//     reenviando o id. O backend aceita id do cliente (validado por regex em
//     `DocumentsController::resolveClientId`), permitindo navegação
//     otimista para URLs estáveis antes mesmo do servidor confirmar.
// =============================================================================

import { api } from './api';
import { ApiError } from './apiClient';
import type { RequirementDocument } from './types';

export async function getDocuments(): Promise<RequirementDocument[]> {
  return api.documents.list();
}

export async function getDocument(
  id: string,
): Promise<RequirementDocument | null> {
  return api.documents.get(id);
}

export async function saveDocument(
  doc: RequirementDocument,
): Promise<RequirementDocument> {
  try {
    return await api.documents.update(doc.id, doc);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return await api.documents.create(doc);
    }
    throw e;
  }
}

export async function deleteDocument(id: string): Promise<void> {
  await api.documents.delete(id);
}

export function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return 'doc-' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mantido para compatibilidade. Os documentos agora vivem no backend;
 * resetar requer deletá-los via DELETE /api/documents/:id ou usar
 * `php api/bin/seed.php` para repopular os 3 docs demo.
 */
export function resetStore(): void {
  // no-op
}
