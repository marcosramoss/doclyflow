import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FileDown,
  CheckCircle2,
  Clock,
  FileText as FileTextIcon,
  AlertCircle,
} from 'lucide-react';
import { deleteDocument, getDocument } from '../data/store';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type DocumentStatus,
  type Requirement,
  type RequirementDocument,
} from '../data/types';
import { downloadRequirementsPDF } from '../utils/pdfGenerator';
import { formatDate, formatDateTime } from '../utils/dates';

const STATUS_STYLES: Record<DocumentStatus, { bg: string; icon: React.ElementType }> = {
  draft: { bg: 'bg-slate-100 text-slate-700 ring-slate-200', icon: FileTextIcon },
  'in-progress': { bg: 'bg-blue-100 text-blue-700 ring-blue-200', icon: Clock },
  completed: { bg: 'bg-emerald-100 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
};

const PRIORITY_BADGE: Record<Requirement['priority'], string> = {
  low: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  medium: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  high: 'bg-orange-100 text-orange-700 ring-orange-200',
  critical: 'bg-red-100 text-red-700 ring-red-200',
};

const TYPE_BADGE: Record<Requirement['type'], string> = {
  functional: 'bg-blue-100 text-blue-700 ring-blue-200',
  'non-functional': 'bg-violet-100 text-violet-700 ring-violet-200',
};

/**
 * Lê o ID do documento da URL quando o componente é montado em uma página
 * puramente estática (sem params do Astro). Usado em `painel/document.astro`
 * para manter o painel 100% no browser, sem SSR.
 *
 * Como o projeto é 100% estático, URLs antigas no formato `/painel/<id>`
 * nunca chegam aqui — Apache devolve 404 antes do React rodar. Aceitamos
 * apenas `?id=<uuid>` na query string.
 */
function resolveDocumentId(explicit?: string | null): string | null {
  if (explicit && explicit.trim()) return explicit.trim();
  if (typeof window === 'undefined') return null;
  const fromQuery = new URLSearchParams(window.location.search).get('id');
  return fromQuery?.trim() || null;
}

interface DocumentViewProps {
  documentId?: string | null;
}

export default function DocumentView({ documentId }: DocumentViewProps) {
  const [doc, setDoc] = useState<RequirementDocument | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ID efetivo — usa prop explícita se vier, senão descobre via query/path.
  const effectiveId = useMemo(() => resolveDocumentId(documentId), [documentId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!effectiveId) {
        // Sem id na URL — mantemos `hydrated = false` para cair no estado
        // vazio ("Selecione um documento") em vez de "não encontrado".
        return;
      }
      try {
        const fetched = await getDocument(effectiveId);
        if (!cancelled) setDoc(fetched ?? null);
      } catch {
        if (!cancelled) setDoc(null);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveId]);

  // Fecha o modal com a tecla Escape
  useEffect(() => {
    if (!confirmDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDelete(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete]);

  const grouped = useMemo(() => {
    if (!doc) return { functional: [], nonFunctional: [] };
    return {
      functional: doc.requirements.filter((r) => r.type === 'functional'),
      nonFunctional: doc.requirements.filter((r) => r.type === 'non-functional'),
    };
  }, [doc]);

  async function handleDelete() {
    if (!doc) return;
    try {
      await deleteDocument(doc.id);
      window.location.href = '/painel';
    } catch (e) {
      // mantém modal aberto e mostra erro no console — UX simple por enquanto
      console.error('Falha ao excluir:', e);
      setConfirmDelete(false);
    }
  }

  function handleExport() {
    if (!doc) return;
    downloadRequirementsPDF(doc);
  }

  // Resolve document antes da renderização para decidir entre os 3 estados.
  if (!hydrated && effectiveId) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (!effectiveId) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <FileTextIcon size={26} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Selecione um documento
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Abra esta página a partir da lista de documentos ou compartilhe uma URL
          no formato <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/painel/document?id=&lt;uuid&gt;</code>.
        </p>
        <a
          href="/painel"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <ArrowLeft size={16} />
          Voltar para Documentos
        </a>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-600">
          <AlertCircle size={26} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Documento não encontrado
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          O documento requisitado não existe ou foi removido.
        </p>
        <a
          href="/painel"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <ArrowLeft size={16} />
          Voltar para Documentos
        </a>
      </div>
    );
  }

  const statusMeta = STATUS_STYLES[doc.status];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <a
        href="/painel"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft size={16} />
        Voltar para Documentos
      </a>

      {/* Header do documento */}
      <header className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-lenear-to-r from-brand-500 via-sky-500 to-violet-500" />
        <div className="px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Levantamento de Requisitos
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {doc.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  <span className="font-medium text-slate-700">Cliente:</span>{' '}
                  {doc.client}
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span>
                  Criado em{' '}
                  <span className="font-medium text-slate-700">
                    {formatDate(doc.createdAt)}
                  </span>
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span>
                  Atualizado em{' '}
                  <span className="font-medium text-slate-700">
                    {formatDateTime(doc.updatedAt)}
                  </span>
                </span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusMeta.bg}`}
            >
              <statusMeta.icon size={14} />
              {STATUS_LABEL[doc.status]}
            </span>
          </div>

          {doc.description.trim() && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Descrição do projeto
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {doc.description}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
            >
              <FileDown size={16} />
              Exportar PDF
            </button>
            <a
              href={`/painel/novo?id=${encodeURIComponent(doc.id)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Pencil size={16} />
              Editar
            </a>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={doc.requirements.length} accent="brand" />
        <StatCard
          label="Funcionais"
          value={grouped.functional.length}
          accent="blue"
        />
        <StatCard
          label="Não-funcionais"
          value={grouped.nonFunctional.length}
          accent="violet"
        />
        <StatCard
          label="Críticos"
          value={
            doc.requirements.filter((r) => r.priority === 'critical').length
          }
          accent="red"
        />
      </div>

      {/* Requisitos */}
      <section className="mt-6 space-y-6">
        <RequirementGroup
          title="Requisitos Funcionais"
          accentClass="border-brand-200"
          titleClass="text-brand-700"
          dotClass="bg-brand-500"
          requirements={grouped.functional}
          startIndex={1}
        />
        <RequirementGroup
          title="Requisitos Não-Funcionais"
          accentClass="border-violet-200"
          titleClass="text-violet-700"
          dotClass="bg-violet-500"
          requirements={grouped.nonFunctional}
          startIndex={grouped.functional.length + 1}
        />
      </section>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
                  <Trash2 size={20} />
                </span>
                <div>
                  <h3
                    id="delete-modal-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    Excluir documento?
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Esta ação não pode ser desfeita. O documento será removido
                    permanentemente.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type StatAccent = 'brand' | 'blue' | 'violet' | 'red';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: StatAccent;
}) {
  const accents: Record<StatAccent, string> = {
    brand: 'border-brand-200 text-brand-700 bg-brand-50',
    blue: 'border-blue-200 text-blue-700 bg-blue-50',
    violet: 'border-violet-200 text-violet-700 bg-violet-50',
    red: 'border-red-200 text-red-700 bg-red-50',
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function RequirementGroup({
  title,
  requirements,
  startIndex,
  accentClass,
  titleClass,
  dotClass,
}: {
  title: string;
  requirements: Requirement[];
  startIndex: number;
  accentClass: string;
  titleClass: string;
  dotClass: string;
}) {
  if (requirements.length === 0) return null;
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${accentClass} bg-white shadow-sm`}
    >
      <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <h3 className={`text-base font-semibold ${titleClass}`}>
          {title} <span className="text-slate-500">({requirements.length})</span>
        </h3>
      </header>
      <ol className="divide-y divide-slate-100">
        {requirements.map((r, idx) => (
          <li key={r.id} className="p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                #{startIndex + idx}
              </span>
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-slate-800">
                  {r.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ${TYPE_BADGE[r.type]}`}
                  >
                    {TYPE_LABEL[r.type]}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ${PRIORITY_BADGE[r.priority]}`}
                  >
                    Prioridade: {PRIORITY_LABEL[r.priority]}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
