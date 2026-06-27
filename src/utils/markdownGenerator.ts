// =============================================================================
// Doclify — markdown generator
// =============================================================================
// Serializa um RequirementDocument em um .md amigável tanto para leitura
// humana quanto para uso como "skill" de uma IA: H1 com o título do projeto,
// bloco de metadados em blockquote, seção de descrição, requisitos agrupados
// por tipo em listas numeradas (com prioridade em destaque), e rodapé.
//
// Mantém paridade com pdfGenerator.ts no nome do arquivo gerado
// (`<safeName>_requisitos.md`) para que downloads consecutivos do mesmo doc
// não conflitem no disco do usuário.
// =============================================================================

import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type Requirement,
  type RequirementDocument,
} from '../data/types';
import { formatDate, formatDateTime } from './dates';

/** Faz o title seguro para virar nome de arquivo. Espelha pdfGenerator. */
function safeFilename(title: string): string {
  return (
    title
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'documento'
  );
}

/** Serializa o documento em markdown. */
export function generateDocumentMarkdown(doc: RequirementDocument): string {
  const title = doc.title.trim() || 'Documento sem título';

  const functional = doc.requirements.filter((r) => r.type === 'functional');
  const nonFunctional = doc.requirements.filter((r) => r.type === 'non-functional');

  const lines: string[] = [];

  // ─── Título + metadados em blockquote ───────────────────────────────────
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> **Cliente:** ${doc.client || '—'}`);
  lines.push(`> **Status:** ${STATUS_LABEL[doc.status]}`);
  lines.push(`> **ID:** \`${doc.id}\``);
  lines.push(`> **Criado em:** ${formatDate(doc.createdAt)}`);
  lines.push(`> **Atualizado em:** ${formatDateTime(doc.updatedAt)}`);
  lines.push('');

  // ─── Descrição ──────────────────────────────────────────────────────────
  const description = doc.description.trim();
  if (description) {
    lines.push('## Visão Geral');
    lines.push('');
    lines.push(description);
    lines.push('');
  }

  // ─── Resumo dos requisitos ──────────────────────────────────────────────
  lines.push('## Requisitos');
  lines.push('');
  if (doc.requirements.length === 0) {
    lines.push('_Nenhum requisito cadastrado._');
    lines.push('');
  } else {
    lines.push(
      `Resumo: **${doc.requirements.length}** no total — ` +
        `**${functional.length}** funcionais, ` +
        `**${nonFunctional.length}** não-funcionais.`,
    );
    lines.push('');
  }

  // ─── Funcionais ─────────────────────────────────────────────────────────
  if (functional.length > 0) {
    lines.push(`### Requisitos Funcionais (${functional.length})`);
    lines.push('');
    functional.forEach((r, idx) => lines.push(formatRequirement(r, idx + 1)));
    lines.push('');
  }

  // ─── Não-funcionais (numeração continua após os funcionais) ─────────────
  if (nonFunctional.length > 0) {
    lines.push(
      `### Requisitos Não-Funcionais (${nonFunctional.length})`,
    );
    lines.push('');
    nonFunctional.forEach((r, idx) =>
      lines.push(formatRequirement(r, functional.length + idx + 1)),
    );
    lines.push('');
  }

  // ─── Rodapé ─────────────────────────────────────────────────────────────
  lines.push('---');
  lines.push('');
  lines.push(`_Exportado de Doclify em ${formatDateTime(new Date().toISOString())}._`);
  lines.push('');

  return lines.join('\n');
}

function formatRequirement(r: Requirement, idx: number): string {
  // Numeração externa (`1.`); prioridade em destaque como rótulo inline,
  // descrição após dash em espaceado — formato limpo para LLMs e humanos.
  return (
    `${idx}. **Prioridade: ${PRIORITY_LABEL[r.priority]}**` +
    ` — ${TYPE_LABEL[r.type]} — ${r.description.trim()}`
  );
}

/** Dispara o download de `<safeName>_requisitos.md` no browser do usuário. */
export function downloadDocumentMarkdown(doc: RequirementDocument): void {
  const md = generateDocumentMarkdown(doc);
  const filename = `${safeFilename(doc.title)}_requisitos.md`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  // Necessário em alguns browsers para que o `download` seja honrado.
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Libera o object URL depois do click — o browser já baixou o conteúdo.
  URL.revokeObjectURL(url);
}
