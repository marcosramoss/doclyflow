import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Search,
  Eye,
  Pencil,
  Trash2,
  Inbox,
  FilePlus2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { deleteDocument, getDocuments } from '../data/store';
import {
  STATUS_LABEL,
  type DocumentStatus,
  type RequirementDocument,
} from '../data/types';
import { formatDate } from '../utils/dates';

const STATUS_TABS: { id: 'all' | DocumentStatus; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'draft', label: STATUS_LABEL.draft },
  { id: 'in-progress', label: STATUS_LABEL['in-progress'] },
  { id: 'completed', label: STATUS_LABEL.completed },
];

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  'in-progress': 'bg-blue-100 text-blue-700 ring-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
};

function describeError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Falha ao comunicar com o servidor.';
}

export default function DashboardTable() {
  const [documents, setDocuments] = useState<RequirementDocument[]>([]);
  const [tab, setTab] = useState<'all' | DocumentStatus>('all');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Refresh em mudanças de aba / foco — pega edições feitas em outras rotas.
  useEffect(() => {
    function refresh() {
      load();
    }
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fecha o modal de confirmação com a tecla Escape
  useEffect(() => {
    if (!confirmDeleteId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDeleteId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDeleteId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (tab !== 'all' && d.status !== tab) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.client.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    });
  }, [documents, tab, search]);

  const counts = useMemo(() => {
    const c: Record<'all' | DocumentStatus, number> = {
      all: documents.length,
      draft: 0,
      'in-progress': 0,
      completed: 0,
    };
    documents.forEach((d) => {
      c[d.status] += 1;
    });
    return c;
  }, [documents]);

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      setError(describeError(e));
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Documentos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Gerencie seus levantamentos de requisitos e exporte em PDF.
          </p>
        </div>
        {loading && hydrated && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Atualizando…
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Não foi possível carregar os documentos.</p>
            <p className="mt-0.5 text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {STATUS_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-[11px] font-bold ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente ou descrição…"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {hydrated && filtered.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500">
            {documents.length === 0 ? (
              <FilePlus2 size={26} />
            ) : (
              <Inbox size={26} />
            )}
          </span>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            {documents.length === 0
              ? 'Você ainda não tem documentos'
              : 'Nenhum resultado encontrado'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {documents.length === 0
              ? 'Use o botão “Novo Documento” na sidebar para criar seu primeiro levantamento.'
              : 'Tente ajustar a busca ou trocar o filtro de status.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3 text-center">Requisitos</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Atualizado</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="group transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-6 py-4">
                    <a
                      href={`/dashboard/${d.id}`}
                      className="flex items-center gap-3 font-semibold text-slate-900 hover:text-brand-700"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition group-hover:bg-brand-600 group-hover:text-white">
                        <FileText size={16} />
                      </span>
                      <span className="line-clamp-1">{d.title}</span>
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{d.client}</td>
                  <td className="px-6 py-4 text-center font-semibold text-slate-700">
                    {d.requirements.length}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_STYLES[d.status]}`}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDate(d.updatedAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/dashboard/${d.id}`}
                        title="Visualizar"
                        aria-label="Visualizar"
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Eye size={16} />
                      </a>
                      <a
                        href={`/dashboard/novo?id=${encodeURIComponent(d.id)}`}
                        title="Editar"
                        aria-label="Editar"
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Pencil size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(d.id)}
                        title="Excluir"
                        aria-label="Excluir"
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDeleteId && (
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
                    Esta ação não pode ser desfeita. O documento será removido permanentemente.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
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
