import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import {
  AUTH_KEY,
  getCurrentUser,
  initialsOf,
  logout,
  type CurrentUser,
} from '../data/auth';

export default function HeaderUserMenu() {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
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

  if (!hydrated) {
    return <div className="h-9 w-24 animate-pulse rounded-md bg-slate-200" />;
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
      >
        <LogIn size={16} />
        Entrar
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-sm font-semibold leading-tight text-slate-900">
          {user.name}
        </div>
        <div className="text-xs leading-tight text-slate-500">{user.email}</div>
      </div>
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm ring-2 ring-white"
      >
        {initialsOf(user)}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </div>
  );
}
