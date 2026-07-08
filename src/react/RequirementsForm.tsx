import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Layers,
  Plus,
  Save,
  Sparkles,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  generateId,
  getDocument,
  saveDocument,
} from '../data/store';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type DocumentStatus,
  type Requirement,
  type RequirementDocument,
  type RequirementPriority,
  type RequirementType,
} from '../data/types';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { resolveDocumentId } from '../utils/documentId';

interface FormRequirement extends Omit<Requirement, 'id'> {
  id: string;
}

type FormState = {
  id: string;
  createdAt: string;
  title: string;
  client: string;
  description: string;
  status: DocumentStatus;
  requirements: FormRequirement[];
  /**
   * Set de nomes de tecnologias marcadas no formulário (catálogo fixo +
   * texto de "Outra" quando preenchido). Strings puras — sem ID, sem
   * catálogo. Persistido como `string[]` em `documents.technologies`.
   */
  selectedTechs: string[];
  /**
   * Visibilidade do campo "Outra". Independente do texto digitado — se o
   * usuário desmarca "Outra" sem apagar o texto, na hora de salvar ele ainda
   * pode ser incluída se o texto não-vazio (o backend aceita qualquer string
   * via array de tecnologias).
   */
  useOtherTech: boolean;
  /**
   * Texto digitado no campo "Outra (especificar)". Vai persistir como um
   * item extra em `selectedTechs` apenas quando o checkbox está marcado e o
   * texto tem pelo menos 1 caractere.
   */
  otherTechnology: string;
};

/**
 * Lista fixa de 14 tecnologias exibidas como checkboxes. Mantida inline
 * propositadamente — sem catálogo/backend (decisão de simplificação: tudo é
 * string). O usuário pediu exatamente este conjunto.
 */
const TECH_CATALOG: readonly string[] = [
  'React',
  'Vue.js',
  'Next.js',
  'Tailwind CSS',
  'Node.js',
  'TypeScript',
  'PHP',
  'Python',
  'MySQL',
  'PostgreSQL',
  'Redis',
  'Docker',
  'GitHub Actions',
  'MongoDB',
];

function makeEmptyRequirement(): FormRequirement {
  return {
    id: generateId(),
    type: 'functional',
    priority: 'medium',
    description: '',
  };
}

function makeEmptyDocument(): FormState {
  return {
    id: generateId(),
    createdAt: '',
    title: '',
    client: '',
    description: '',
    status: 'draft',
    requirements: [makeEmptyRequirement()],
    selectedTechs: [],
    useOtherTech: false,
    otherTechnology: '',
  };
}

const PRIORITY_OPTIONS: RequirementPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];
const TYPE_OPTIONS: RequirementType[] = ['functional', 'non-functional'];
const STATUS_OPTIONS: DocumentStatus[] = [
  'draft',
  'in-progress',
  'completed',
];

const PRIORITY_BADGE: Record<RequirementPriority, string> = {
  low: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  medium: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  high: 'bg-orange-100 text-orange-700 ring-orange-200',
  critical: 'bg-red-100 text-red-700 ring-red-200',
};

const TYPE_BADGE: Record<RequirementType, string> = {
  functional: 'bg-blue-100 text-blue-700 ring-blue-200',
  'non-functional': 'bg-violet-100 text-violet-700 ring-violet-200',
};

/**
 * Resolve o id do documento a editar. Em build SSG, o prop chegaria como
 * `undefined` mesmo quando a URL real tem `?id=...` (query params
 * avaliadas em build, não em runtime). Lemos `window.location.search`
 * diretamente — ver `src/utils/documentId.ts` para detalhes.
 */
export default function RequirementsForm() {
  const effectiveId = resolveDocumentId();
  const isEditMode = Boolean(effectiveId);

  const [form, setForm] = useState<FormState>(makeEmptyDocument);
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  // Hydrate from store ou do param da URL.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (effectiveId) {
        try {
          const existing = await getDocument(effectiveId);
          if (cancelled) return;
          if (existing) {
            const techsFromCatalog = (existing.technologies ?? []).filter(
              (t) => TECH_CATALOG.includes(t),
            );
            const customText = (existing.technologies ?? []).find(
              (t) => !TECH_CATALOG.includes(t),
            );
            const hasCustom = Boolean(customText);
            setForm({
              id: existing.id,
              createdAt: existing.createdAt,
              title: existing.title,
              client: existing.client,
              description: existing.description,
              status: existing.status,
              requirements: existing.requirements.map((r) => ({ ...r })),
              selectedTechs: techsFromCatalog,
              useOtherTech: hasCustom,
              otherTechnology: customText ?? '',
            });
          }
        } catch {
          if (!cancelled) {
            setErrors({
              _general:
                'Não foi possível carregar o documento para edição.',
            });
          }
        }
      }
      if (!cancelled) setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveId]);

  // Espelha o título do formulário em `<title>` + og:title + twitter:title
  // enquanto o usuário digita. O fallback estático `"Documento · Doclyflow"`
  // do `novo.astro` cobre o frame de pré-hydration; o hook roda no client
  // e aplica o valor calculado. Re-executa quando `form.title` muda
  // (keystroke + hydration populando em modo edição) ou `isEditMode` muda.
  const tabTitle = useMemo(() => {
    const trimmed = form.title.trim();
    const action = isEditMode ? 'Editar' : 'Novo';
    return trimmed
      ? `${action}: ${trimmed} · Doclyflow`
      : `${action} documento · Doclyflow`;
  }, [form.title, isEditMode]);
  useDocumentTitle(tabTitle);

  const counters = useMemo(() => {
    const f = form.requirements.filter((r) => r.type === 'functional').length;
    const n = form.requirements.length - f;
    return { total: form.requirements.length, functional: f, nonFunctional: n };
  }, [form.requirements]);

  // Quantidade efetiva exibida (catálogo + "Outra" não-vazio).
  const techCount = useMemo(() => {
    const fromOther =
      form.useOtherTech && form.otherTechnology.trim() ? 1 : 0;
    return form.selectedTechs.length + fromOther;
  }, [form.selectedTechs, form.useOtherTech, form.otherTechnology]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchReq(id: string, patchObj: Partial<FormRequirement>) {
    setForm((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) =>
        r.id === id ? { ...r, ...patchObj } : r,
      ),
    }));
  }

  function addRequirement() {
    setForm((prev) => ({
      ...prev,
      requirements: [...prev.requirements, makeEmptyRequirement()],
    }));
  }

  function removeRequirement(id: string) {
    setForm((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((r) => r.id !== id),
    }));
  }

  // Toggle de uma tecnologia do catálogo. Usa o nome do `TECH_CATALOG`
  // (string) — sem ID/sem catálogos.
  function toggleTech(name: string) {
    setForm((prev) => {
      const isSelected = prev.selectedTechs.includes(name);
      const selectedTechs = isSelected
        ? prev.selectedTechs.filter((n) => n !== name)
        : [...prev.selectedTechs, name];
      return { ...prev, selectedTechs };
    });
  }

  function toggleOtherTech() {
    setForm((prev) => ({ ...prev, useOtherTech: !prev.useOtherTech }));
  }

  function clearTechSelection() {
    setForm((prev) => ({
      ...prev,
      selectedTechs: [],
      useOtherTech: false,
      // Mantém o texto digitado: o usuário pode re-marcar "Outra" sem
      // perder o que escreveu — só vai ao backend se a checkbox
      // continuar marcada no submit.
      otherTechnology: prev.otherTechnology,
    }));
  }

  function validate(): boolean {
    const next: { [k: string]: string } = {};
    if (!form.title.trim()) next.title = 'Informe um título para o documento.';
    if (!form.client.trim()) next.client = 'Informe o cliente do projeto.';
    const reqErrors: string[] = [];
    form.requirements.forEach((r, idx) => {
      if (!r.description.trim()) reqErrors.push(`#${idx + 1}`);
    });
    if (reqErrors.length > 0) {
      next.requirements = `Preencha a descrição de: ${reqErrors.join(', ')}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildDocument(): RequirementDocument {
    const now = new Date().toISOString();
    // Mescla catálogo + "Outra" (se checkbox marcado E texto não-vazio).
    // Strings puras; backend persiste como CSV.
    const custom =
      form.useOtherTech && form.otherTechnology.trim()
        ? [form.otherTechnology.trim()]
        : [];
    const technologies = [
      ...form.selectedTechs.filter((t) => t.trim().length > 0),
      ...custom,
    ];
    return {
      id: form.id,
      title: form.title.trim(),
      client: form.client.trim(),
      description: form.description.trim(),
      status: form.status,
      createdAt: form.createdAt || now,
      updatedAt: now,
      requirements: form.requirements.map((r) => ({
        id: r.id,
        type: r.type,
        priority: r.priority,
        description: r.description.trim(),
      })),
      technologies,
    };
  }

  async function handleSave() {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      const saved = await saveDocument(buildDocument());
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1800);
      if (!isEditMode) {
        window.location.href = `/painel/document?id=${encodeURIComponent(saved.id)}`;
      }
    } catch (e) {
      setErrors({
        _general:
          (e instanceof Error && e.message) || 'Falha ao salvar o documento.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSaveAndContinue() {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      const saved = await saveDocument(buildDocument());
      window.location.href = `/painel/document?id=${encodeURIComponent(saved.id)}`;
    } catch (e) {
      setErrors({
        _general:
          (e instanceof Error && e.message) || 'Falha ao salvar o documento.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <a
            href="/painel"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft size={16} />
            Voltar para Documentos
          </a>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {isEditMode ? 'Editar documento' : 'Novo documento'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isEditMode
              ? 'Atualize as informações do levantamento.'
              : 'Preencha os dados do projeto e liste seus requisitos.'}
          </p>
        </div>
        {savedFlash && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200">
            <Check size={12} />
            Salvo
          </span>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Verifique os campos abaixo:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {Object.values(errors).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Card Dados do Projeto */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-600">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Dados do projeto
            </h2>
            <p className="text-xs text-slate-500">
              Informações básicas do levantamento.
            </p>
          </div>
        </header>
        <div className="grid gap-5 p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Título do documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => patch('title', e.target.value)}
                placeholder="Ex.: Sistema de E-commerce B2B"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  patch('status', e.target.value as DocumentStatus)
                }
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.client}
                onChange={(e) => patch('client', e.target.value)}
                placeholder="Ex.: Acme Corp"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Código / Identificador
              </label>
              <input
                type="text"
                value={form.id}
                disabled
                className="mt-1.5 w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono text-slate-500 shadow-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Descrição do projeto
            </label>
            <textarea
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
              rows={4}
              placeholder="Resumo do projeto, contexto e objetivos."
              className="mt-1.5 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </section>

      {/* Card Requisitos */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-600">
              <Plus size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Requisitos
              </h2>
              <p className="text-xs text-slate-500">
                {counters.total} no total — {counters.functional} funcionais,{' '}
                {counters.nonFunctional} não-funcionais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addRequirement}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <Plus size={14} />
            Adicionar requisito
          </button>
        </header>

        <ol className="divide-y divide-slate-100">
          {form.requirements.map((r, idx) => (
            <li key={r.id} className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-200">
                    #{idx + 1}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ${TYPE_BADGE[r.type]}`}
                  >
                    {TYPE_LABEL[r.type]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRequirement(r.id)}
                  disabled={form.requirements.length === 1}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Tipo
                  </label>
                  <select
                    value={r.type}
                    onChange={(e) =>
                      patchReq(r.id, {
                        type: e.target.value as RequirementType,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Prioridade
                  </label>
                  <select
                    value={r.priority}
                    onChange={(e) =>
                      patchReq(r.id, {
                        priority: e.target.value as RequirementPriority,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-600">
                  Descrição
                </label>
                <textarea
                  value={r.description}
                  onChange={(e) =>
                    patchReq(r.id, { description: e.target.value })
                  }
                  rows={2}
                  placeholder="Descreva o requisito de forma clara e verificável."
                  className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ${PRIORITY_BADGE[r.priority]}`}
                >
                  Prioridade: {PRIORITY_LABEL[r.priority]}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Card Tecnologias — 14 checkboxes fixas + "Outra" que abre campo
          livre. Tudo é string na forma; backend persiste como CSV. */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-600">
              <Layers size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tecnologias
              </h2>
              <p className="text-xs text-slate-500">
                {techCount === 0
                  ? 'Marque as tecnologias usadas no projeto (opcional).'
                  : `${techCount} selecionada${techCount === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
          {techCount > 0 && (
            <button
              type="button"
              onClick={clearTechSelection}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Limpar seleção
            </button>
          )}
        </header>

        <ul className="divide-y divide-slate-100">
          {TECH_CATALOG.map((name) => {
            const checked = form.selectedTechs.includes(name);
            return (
              <li key={name}>
                <label className="flex cursor-pointer items-center gap-3 px-6 py-3 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTech(name)}
                    className="sr-only"
                    aria-label={name}
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                      checked
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {checked && (
                      <Check
                        size={12}
                        strokeWidth={3}
                        className="text-white"
                      />
                    )}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-700">
                    {name}
                  </span>
                </label>
              </li>
            );
          })}
          {/* "Outra" — quando marcada revela um campo de texto livre cujo
              conteúdo vai para a mesma lista de techs na hora de salvar. */}
          <li>
            <label className="flex cursor-pointer items-center gap-3 px-6 py-3 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.useOtherTech}
                onChange={toggleOtherTech}
                className="sr-only"
                aria-label="Outra tecnologia (especificar)"
              />
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                  form.useOtherTech
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {form.useOtherTech && (
                  <Check
                    size={12}
                    strokeWidth={3}
                    className="text-white"
                  />
                )}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-700">
                Outra{' '}
                <span className="font-normal text-slate-500">
                  (especificar)
                </span>
              </span>
            </label>
            {form.useOtherTech && (
              <div className="px-6 pb-4">
                <input
                  type="text"
                  value={form.otherTechnology}
                  onChange={(e) => patch('otherTechnology', e.target.value)}
                  placeholder="Ex.: Stripe, GraphQL, AWS Lambda…"
                  maxLength={100}
                  autoFocus
                  className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Será adicionado ao stack e exportado como item no Markdown.
                </p>
              </div>
            )}
          </li>
        </ul>
      </section>

      {/* Footer Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <a
          href="/painel"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          Cancelar
        </a>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hydrated}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-[0.98]"
        >
          <Save size={16} />
          {isEditMode ? 'Atualizar' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={!hydrated}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <Check size={16} />
          {isEditMode ? 'Atualizar e visualizar' : 'Salvar e visualizar'}
        </button>
      </div>
    </div>
  );
}
