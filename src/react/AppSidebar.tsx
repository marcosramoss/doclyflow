import { useEffect, useState } from 'react';
import {
  FileText,
  LogOut,
  Plus,
  LayoutGrid,
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

export default function AppSidebar({ activeRoute = 'documents' }: AppSidebarProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
    window.addEventListener('auth-change', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('auth-change', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = '/';
  }

  if (!hydrated || !user) return null;

  return (
    <aside className="sticky top-20 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <LayoutGrid size={18} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-slate-900">
              Requisita<span className="text-brand-600">App</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              Workspace
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-3">
        <a
          href="/dashboard"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            activeRoute === 'documents' || activeRoute === 'view'
              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileText size={16} />
          Documentos
        </a>
        <a
          href="/dashboard/novo"
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
            activeRoute === 'new'
              ? 'bg-brand-700 text-white ring-1 ring-brand-700'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          <Plus size={16} />
          Novo Documento
        </a>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-start gap-3 rounded-lg bg-slate-50/60 p-3">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm"
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
    </aside>
  );
}
