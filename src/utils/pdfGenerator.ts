import { jsPDF } from 'jspdf';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type Requirement,
  type RequirementDocument,
} from '../data/types';
import { formatDate } from './dates';

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const COLORS = {
  brand: [37, 99, 235] as [number, number, number],
  brandLight: [219, 234, 254] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  functional: [37, 99, 235] as [number, number, number],
  nonFunctional: [124, 58, 237] as [number, number, number],
  priority: {
    low: [16, 185, 129] as [number, number, number],
    medium: [234, 179, 8] as [number, number, number],
    high: [249, 115, 22] as [number, number, number],
    critical: [220, 38, 38] as [number, number, number],
  },
};

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
    pdf.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function drawBadge(
  pdf: jsPDF,
  x: number,
  y: number,
  text: string,
  fill: [number, number, number],
  textColor: [number, number, number] = [255, 255, 255],
): number {
  pdf.setFontSize(8);
  const textWidth = pdf.getStringUnitWidth(text) * 8 + 12;
  pdf.setFillColor(fill[0], fill[1], fill[2]);
  pdf.roundedRect(x, y, textWidth, 12, 2, 2, 'F');
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  pdf.text(text, x + 6, y + 8.5);
  return textWidth;
}

function drawWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 14,
): number {
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function generateRequirementsPDF(doc: RequirementDocument): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

  // HEADER bar
  pdf.setFillColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2]);
  pdf.rect(0, 0, PAGE_WIDTH, 60, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Levantamento de Requisitos', PAGE_MARGIN, 38);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Doclify', PAGE_WIDTH - PAGE_MARGIN, 38, { align: 'right' });

  // Decorative accent
  pdf.setFillColor(COLORS.brandLight[0], COLORS.brandLight[1], COLORS.brandLight[2]);
  pdf.rect(0, 60, PAGE_WIDTH, 4, 'F');

  let y = 100;

  // PROJETO info
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  pdf.roundedRect(PAGE_MARGIN, y - 12, CONTENT_WIDTH, 90, 6, 6, 'FD');

  pdf.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROJETO', PAGE_MARGIN + 16, y);

  pdf.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  pdf.setFontSize(16);
  pdf.text(doc.title, PAGE_MARGIN + 16, y + 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
  pdf.text(`Cliente: ${doc.client}`, PAGE_MARGIN + 16, y + 36);
  pdf.text(
    `Status: ${STATUS_LABEL[doc.status]}  •  Última atualização: ${formatDate(doc.updatedAt)}`,
    PAGE_MARGIN + 16,
    y + 50,
  );

  const badgeX = PAGE_WIDTH - PAGE_MARGIN - 16;
  // badge do status (largura calculada mas não usada externamente neste momento)
  drawBadge(
    pdf,
    badgeX - 70,
    y + 32,
    STATUS_LABEL[doc.status].toUpperCase(),
    COLORS.brand,
  );

  y += 100;

  // DESCRIÇÃO
  if (doc.description.trim()) {
    pdf.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DESCRIÇÃO', PAGE_MARGIN, y);
    y += 14;
    pdf.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    y = drawWrappedText(pdf, doc.description, PAGE_MARGIN, y + 6, CONTENT_WIDTH, 14);
    y += 18;
  }

  // Divider
  pdf.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  pdf.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
  y += 24;

  // Summary
  const functionalCount = doc.requirements.filter((r) => r.type === 'functional').length;
  const nonFunctionalCount = doc.requirements.length - functionalCount;
  pdf.setTextColor(
    COLORS.textMuted[0],
    COLORS.textMuted[1],
    COLORS.textMuted[2],
  );
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO', PAGE_MARGIN, y);
  y += 14;
  pdf.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(
    `Total de requisitos: ${doc.requirements.length}    •    Funcionais: ${functionalCount}    •    Não-funcionais: ${nonFunctionalCount}`,
    PAGE_MARGIN,
    y,
  );
  y += 24;

  // REQUISITOS
  const renderRequirement = (r: Requirement, idx: number): void => {
    const typeColor =
      r.type === 'functional' ? COLORS.functional : COLORS.nonFunctional;

    const lines = pdf.splitTextToSize(r.description, CONTENT_WIDTH - 80);
    const blockHeight = 38 + lines.length * 12;

    y = ensureSpace(pdf, y, blockHeight + 8);

    // Number badge
    pdf.setFillColor(COLORS.brandLight[0], COLORS.brandLight[1], COLORS.brandLight[2]);
    pdf.setDrawColor(COLORS.brandLight[0], COLORS.brandLight[1], COLORS.brandLight[2]);
    pdf.roundedRect(PAGE_MARGIN, y, 28, 22, 4, 4, 'F');
    pdf.setTextColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`#${idx}`, PAGE_MARGIN + 14, y + 15, { align: 'center' });

    // Content
    pdf.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(lines, PAGE_MARGIN + 40, y + 14);

    // Badges
    const badgesY = y + 14 + lines.length * 12 + 2;
    let bx = PAGE_MARGIN + 40;
    bx +=
      drawBadge(
        pdf,
        bx,
        badgesY,
        TYPE_LABEL[r.type].toUpperCase(),
        typeColor,
      ) + 6;
    bx += drawBadge(
      pdf,
      bx,
      badgesY,
      PRIORITY_LABEL[r.priority].toUpperCase(),
      COLORS.priority[r.priority],
    );

    y = badgesY + 28;
  };

  // Section: Funcionais
  const functionals = doc.requirements.filter((r) => r.type === 'functional');
  if (functionals.length > 0) {
    y = ensureSpace(pdf, y, 40);
    pdf.setTextColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`Requisitos Funcionais (${functionals.length})`, PAGE_MARGIN, y);
    pdf.setDrawColor(COLORS.brand[0], COLORS.brand[1], COLORS.brand[2]);
    pdf.setLineWidth(1.5);
    pdf.line(PAGE_MARGIN, y + 4, PAGE_MARGIN + 220, y + 4);
    pdf.setLineWidth(0.5);
    y += 20;
    functionals.forEach((r, i) => renderRequirement(r, i + 1));
    y += 10;
  }

  // Section: Não-funcionais
  const nonFunctionals = doc.requirements.filter((r) => r.type === 'non-functional');
  if (nonFunctionals.length > 0) {
    y = ensureSpace(pdf, y, 40);
    pdf.setTextColor(COLORS.nonFunctional[0], COLORS.nonFunctional[1], COLORS.nonFunctional[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(
      `Requisitos Não-Funcionais (${nonFunctionals.length})`,
      PAGE_MARGIN,
      y,
    );
    pdf.setDrawColor(COLORS.nonFunctional[0], COLORS.nonFunctional[1], COLORS.nonFunctional[2]);
    pdf.setLineWidth(1.5);
    pdf.line(PAGE_MARGIN, y + 4, PAGE_MARGIN + 260, y + 4);
    pdf.setLineWidth(0.5);
    y += 20;
    nonFunctionals.forEach((r, i) => renderRequirement(r, functionals.length + i + 1));
  }

  // FOOTER em cada página
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(
      COLORS.textMuted[0],
      COLORS.textMuted[1],
      COLORS.textMuted[2],
    );
    pdf.text(
      `Gerado em ${formatDate(new Date().toISOString())} • Doclify`,
      PAGE_MARGIN,
      PAGE_HEIGHT - 24,
    );
    pdf.text(
      `Página ${i} de ${total}`,
      PAGE_WIDTH - PAGE_MARGIN,
      PAGE_HEIGHT - 24,
      { align: 'right' },
    );
  }

  return pdf;
}

export function downloadRequirementsPDF(doc: RequirementDocument): void {
  const pdf = generateRequirementsPDF(doc);
  const safeName = doc.title
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'documento';
  pdf.save(`${safeName}_requisitos.pdf`);
}

export function previewRequirementsPDF(doc: RequirementDocument): string {
  const pdf = generateRequirementsPDF(doc);
  return pdf.output('datauristring');
}
