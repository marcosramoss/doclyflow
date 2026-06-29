// =============================================================================
// Doclyflow — document id resolver
// =============================================================================
// Em build SSG, `Astro.url.searchParams` é avaliado no build (URL vazia), e o
// prop chega `undefined` no React island mesmo quando a URL final do browser
// tem `?id=<uuid>`. Este helper implementa o fallback usado por
// `RequirementsForm` (página `/painel/novo`) e `DocumentView` (página
// `/painel/document`) — lê `window.location.search` no client para descobrir
// o id real.
// =============================================================================

/**
 * Resolve o id do documento a partir de um valor explícito ou da query string.
 *
 * Ordem:
 *   1. `explicit` (prop) — se vier não-vazio, é preferido (cenários SSR futuro
 *      ou testes controlando diretamente o id).
 *   2. `window.location.search?id=...` — fallback de runtime. Lido apenas no
 *      browser (`typeof window !== 'undefined'`) para não quebrar SSR/Node.
 *
 * Aceita `string | null | undefined` no argumento. Retorna `string | null`
 * (com trim aplicado).
 */
export function resolveDocumentId(
  explicit?: string | null,
): string | null {
  if (explicit && explicit.trim()) return explicit.trim();
  if (typeof window === 'undefined') return null;
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  return fromQuery?.trim() || null;
}
