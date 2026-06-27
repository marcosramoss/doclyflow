import { useEffect, useState } from 'react';
import {
  FileText,
  LogOut,
  Plus,
  LayoutGrid,
  Menu,
  X,
} from 'lucide-react';
import {
  AUTH_KEY,
  getCurrentUser,
  isAuthenticated,
  initialsOf,
  logout,
  type CurrentUser,
} from '../data/auth';

export type SidebarRoute = 'documents' | 'new' | 'view';

interface AppSidebarProps {
  activeRoute?: SidebarRoute;
}

/**
 * Sidebar principal do painel autenticado.
 *
 * Renderiza três peças numa Fragment:
 *   1. Hamburger trigger fixed (só <lg) para abrir o drawer mobile.
 *   2. Aside `fixed` à esquerda ocupando 260px (só ≥lg).
 *   3. Overlay + drawer `fixed` que aparece quando aberto (só <lg).
 *
 * O componente se auton-posiciona via `fixed`, então o parent na página
 * do painel só precisa de um `<main>` com `lg:pl-[260px]` para reservar
 * espaço para a sidebar desktop sem usar grid column tricks.
 */
export default function AppSidebar({
  activeRoute = 'documents',
}: AppSidebarProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  function closeDrawer() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
      return;
    }
    setUser(getCurrentUser());
    setHydrated(true);

    function refresh() {
      setUser(getCurrentUser());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AUTH_KEY) refresh();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('auth-change', refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('auth-change', refresh);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = '/';
  }

  if (!hydrated || !user) return null;

  const SidebarBody = (
    <>
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <LayoutGrid size={18} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-slate-900">
              Doclify
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              Painel
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-3">
        <a
          href="/painel"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            activeRoute === 'documents' || activeRoute === 'view'
              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          onClick={closeDrawer}
        >
          <FileText size={16} />
          Documentos
        </a>
        <a
          href="/painel/novo"
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
            activeRoute === 'new'
              ? 'bg-brand-700 text-white ring-1 ring-brand-700'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
          onClick={closeDrawer}
        >
          <Plus size={16} />
          Novo Documento
        </a>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-start gap-3 rounded-lg bg-slate-50/60 p-3">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm"
          >
            {initialsOf(user)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">
              {user.name}
            </div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          <LogOut size={14} />
          Sair da conta
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Hamburger trigger — só mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 active:scale-95 lg:hidden"
        aria-label="Abrir menu de navegação"
      >
        <Menu size={22} />
      </button>

      {/* 2. Sidebar desktop — fixed à esquerda, ≥lg */}
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-65 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm lg:flex">
        {SidebarBody}
      </aside>

      {/* 3. Drawer mobile — só aparece quando aberto, <lg */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl lg:hidden"
          >
            <button
              type="button"
              onClick={closeDrawer}
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
            {SidebarBody}
          </aside>
        </>
      )}
    </>
  );
}
