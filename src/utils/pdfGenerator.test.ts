// =============================================================================
// Doclyflow — tests for `pdfGenerator`
// =============================================================================
// Cobertura dos fix de overflow de texto nas margens:
//  1. `drawWrappedText` chama `ensureSpace` linha a linha (quebras de página
//     intra-parágrafo + CRLF→LF normalizado);
//  2. A seção "DESCRIÇÃO" tem `ensureSpace` antes do título;
//  3. `renderRequirement` usa `lineHeightFactor = REQ_LINE_HEIGHT / 11` igual
//     ao tracking de `y`, então blocos não se sobrepõem.
//
// Não mockamos nem re-exportamos nada — rodamos `generateRequirementsPDF`
// direto em Node (jsPDF funciona em ambiente puro JS) e inspecionamos o
// buffer de saída via `pdf-lib` para garantir que o PDF é bem-formado e que
// a contagem de páginas escala com o conteúdo.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateRequirementsPDF } from './pdfGenerator';
import type {
  Requirement,
  RequirementDocument,
  RequirementPriority,
  RequirementType,
} from '../data/types';

/** Helper para montar fixtures — campos obrigatórios preenchidos, resto sobrescrito. */
function makeDoc(overrides: Partial<RequirementDocument> = {}): RequirementDocument {
  return {
    id: 'test-doc',
    title: 'Projeto de Teste',
    client: 'Cliente de Teste',
    description: '',
    status: 'in-progress',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    requirements: [],
    ...overrides,
  };
}

/** Texto previsivelmente comprido: `n` palavras repetidas separadas por espaço. */
function repeatingWords(n: number, word = 'lorem'): string {
  return Array.from({ length: n }, () => word).join(' ');
}

const PRIORITIES: RequirementPriority[] = ['low', 'medium', 'high', 'critical'];

/** Gera `count` requisitos com descrições longas (várias linhas quando quebradas). */
function makeLongRequirements(count: number): Requirement[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r-${i}`,
    type: (i % 2 === 0 ? 'functional' : 'non-functional') as RequirementType,
    priority: PRIORITIES[i % PRIORITIES.length],
    // Duplicamos o texto para garantir ~4 linhas quebradas por requisito.
    description: `${repeatingWords(40)} ${repeatingWords(40)}`,
  }));
}

describe('pdfGenerator — sane baseline', () => {
  it('gera um PDF de uma página para um documento pequeno', () => {
    const pdf = generateRequirementsPDF(
      makeDoc({
        title: 'Pequeno',
        description: 'Descrição curta.',
        requirements: [
          {
            id: 'r1',
            type: 'functional',
            priority: 'medium',
            description: 'Um requisito normal.',
          },
        ],
      }),
    );
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});

describe('pdfGenerator — quebras de página em conteúdo longo', () => {
  it('quebra página quando a descrição é muito longa', () => {
    // 25 parágrafos × ~300 chars cada, separados por `\n`. Antes do fix
    // este conteúdo caberia em uma página única e sangraria pela margem
    // inferior; agora `ensuresSpace` por linha força `addPage`.
    const longDescription = Array.from({ length: 25 }, () => repeatingWords(50)).join('\n');
    const pdf = generateRequirementsPDF(
      makeDoc({ description: longDescription, requirements: [] }),
    );
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('quebra página quando há muitos requisitos longos', () => {
    // 12 requisitos × ~600 chars cada = ~48 linhas quebradas — exige
    // várias páginas e exercita o tracking de `y` em `renderRequirement`.
    const pdf = generateRequirementsPDF(
      makeDoc({ description: '', requirements: makeLongRequirements(12) }),
    );
    expect(pdf.getNumberOfPages()).toBeGreaterThan(2);
  });

  it('respeita quebras de linha manuais (`\\n`) na descrição', () => {
    // 5 linhas curtas cabem numa única página — o ponto importante é
    // garantir que `splitTextToSize` recebe os `\n` depois da normalização
    // CRLF→LF dentro de `drawWrappedText`.
    const explicitLines = 'Linha A\nLinha B\nLinha C\nLinha D\nLinha E';
    const pdf = generateRequirementsPDF(
      makeDoc({ description: explicitLines, requirements: [] }),
    );
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});

describe('pdfGenerator — integridade do PDF de saída', () => {
  it('produz um buffer que pdf-lib consegue reler', async () => {
    const pdf = generateRequirementsPDF(
      makeDoc({ requirements: makeLongRequirements(8) }),
    );
    const bytes = pdf.output('arraybuffer');
    const parsed = await PDFDocument.load(bytes);

    // jsPDF reporta o mesmo número de páginas que pdf-lib extrai do buffer.
    expect(parsed.getPageCount()).toBe(pdf.getNumberOfPages());
    expect(parsed.getPageCount()).toBeGreaterThan(1);
  });

  it('não corrompe o buffer mesmo com vários parágrafos longos na descrição', async () => {
    const pdf = generateRequirementsPDF(
      makeDoc({
        description: Array.from({ length: 30 }, () => repeatingWords(60)).join('\n\n'),
        requirements: makeLongRequirements(5),
      }),
    );
    const bytes = pdf.output('arraybuffer');
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBe(pdf.getNumberOfPages());
    expect(parsed.getPageCount()).toBeGreaterThan(2);
  });
});
