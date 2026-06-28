import { useEffect, useState } from "react";
import LogoDark from "../../public/logo-dark-doclyflow.svg";
import { FileText, LogOut, Menu, X } from "lucide-react";
import {
  AUTH_KEY,
  getCurrentUser,
  isAuthenticated,
  initialsOf,
  logout,
  type CurrentUser,
} from "../data/auth";

export type SidebarRoute = "documents" | "new" | "view";

interface AppSidebarProps {
  activeRoute?: SidebarRoute;
}

/**
 * Tempo da transição CSS do drawer mobile — DEVE casar com o `duration-300`
 * aplicado em `transition-transform` / `transition-opacity` no JSX abaixo.
 */
const DRAWER_TRANSITION_MS = 300;

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
 *
 * ## Animação do drawer mobile
 *
 * O drawer nunca é desmontado durante o ciclo aberto/fechado: ele permanece
 * no DOM (em `-translate-x-full` + `opacity-0`) de forma que a transição
 * CSS possa tanto no ABRIR quanto no FECHAR.
 *
 *   • Abrir: monta com classes de "fechado", depois de 2 rAFs flipa para
 *     `translate-x-0` / `opacity-100` — assim o navegador enxerga uma
 *     MUDANÇA de propriedade (transform) e dispara o `transition-transform`.
 *     Montar direto com `translate-x-0` não animaria.
 *   • Fechar: flipa para `-translate-x-full` / `opacity-0`, espera
 *     `DRAWER_TRANSITION_MS` e só então remove do DOM (`setIsMounted(false)`).
 *
 * O `useEffect` dependente de `[isOpen]` é o controlador do estado animado;
 * as funções `openDrawer`/`closeDrawer` apenas disparam `setIsOpen`.
 */
export default function AppSidebar({
  activeRoute = "documents",
}: AppSidebarProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  // Mantém drawer + overlay no DOM após fechar, até a animação terminar.
  const [isMounted, setIsMounted] = useState(false);
  // `false` durante o primeiro paint (drawer off-screen + overlay invisível),
  // `true` após duplo rAF — assim a propriedade `transform` MUDA de valor
  // e o navegador dispara a transição (mount direto com classe final não anima).
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);

  function closeDrawer() {
    setIsOpen(false);
  }

  // Sincroniza a montagem do drawer + flip animado com `isOpen`.
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Duplo rAF: garante que o navegador pintou o drawer no estado
      // FECHADO (-translate-x-full / opacity-0) antes do flip para ABERTO.
      // Sem isso, o browser pinta direto em translate-x-0 e a transição
      // nunca dispara (mount inicial não é "mudança" de estilo).
      let raf1 = 0;
      let raf2 = 0;
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsAnimatingOpen(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }
    // Fechando: reverter classe animada primeiro; desmount só após a
    // transição completar, para que o slide-out seja visível.
    setIsAnimatingOpen(false);
    const tid = window.setTimeout(
      () => setIsMounted(false),
      DRAWER_TRANSITION_MS,
    );
    return () => window.clearTimeout(tid);
  }, [isOpen]);

  // Trava scroll do body enquanto drawer está aberto (UX padrão de modal).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

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
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("auth-change", refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("auth-change", refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = "/";
  }

  if (!hydrated || !user) return null;

  const SidebarBody = (
    <>
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center justify-center gap-3">
          <img src={LogoDark.src} />
          <div className="min-w-0"></div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-3">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-4">
          Navegação
        </div>
        <a
          href="/painel"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            activeRoute === "documents" || activeRoute === "view"
              ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          onClick={closeDrawer}
        >
          <FileText size={16} />
          Documentos
        </a>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-start gap-3 rounded-lg bg-slate-50/60 p-3">
          {user.picture && user.picture.trim() !== "" ? (
            <img
              src={user.picture}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-full bg-slate-200 object-cover shadow-sm ring-1 ring-white"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm"
            >
              {initialsOf(user)}
            </span>
          )}
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
        aria-expanded={isOpen}
        aria-controls="app-sidebar-drawer"
      >
        <Menu size={22} />
      </button>

      {/* 2. Sidebar desktop — fixed à esquerda, ≥lg */}
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-65 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm lg:flex">
        {SidebarBody}
      </aside>

      {/* 3. Drawer mobile — fica montado enquanto animação roda:
             off-screen (-translate-x-full) + invisível (opacity-0) quando
             fechado, e desliza para dentro (translate-x-0 / opacity-100)
             quando aberto. Nunca desmonta abruptamente, sempre transiciona. */}
      {isMounted && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
              isAnimatingOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside
            id="app-sidebar-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
              isAnimatingOpen ? "translate-x-0" : "-translate-x-full"
            } ${isAnimatingOpen ? "" : "pointer-events-none"}`}
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
