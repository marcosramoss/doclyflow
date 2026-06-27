import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, LogIn, ShieldCheck } from 'lucide-react';
import {
  getCurrentUser,
  loginWithGoogle,
} from '../data/auth';

// Client ID público — espelha `GOOGLE_CLIENT_ID` em `api/.env` para que o
// `AuthController::google()` possa validar o `aud` do ID token. Pode ser
// sobrescrito em build/dev via `PUBLIC_GOOGLE_CLIENT_ID` no `.env` na raiz
// do projeto Astro.
const FALLBACK_CLIENT_ID =
  '968915146219-6113srqhdlo68gc2g4bpr5j0kohfnerm.apps.googleusercontent.com';

function resolveClientId(): string {
  const env = (import.meta.env as { PUBLIC_GOOGLE_CLIENT_ID?: string })
    .PUBLIC_GOOGLE_CLIENT_ID;
  return env && env.trim() ? env.trim() : FALLBACK_CLIENT_ID;
}

type GoogleIdApi = {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (resp: { credential: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        itp_support?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          type?: 'standard' | 'icon';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          logo_alignment?: 'left' | 'center';
          width?: number;
          locale?: string;
        },
      ) => void;
      prompt: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Whitelista de redirect pós-login para evitar open-redirect via `?next=`.
 * Aceita apenas path relativo (começando com `/` mas não `//`).
 */
function safeNext(raw: string | null): string {
  if (raw && /^\/(?!\/)/.test(raw)) return raw;
  return '/painel';
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity Services')),
        { once: true },
      );
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (getCurrentUser()) {
      window.location.href = safeNext(
        new URLSearchParams(window.location.search).get('next'),
      );
      return;
    }

    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: resolveClientId(),
          callback: async (response) => {
            setError(null);
            setLoading(true);
            const result = await loginWithGoogle(response.credential);
            if (cancelled) return;
            if (!result.ok) {
              setError(result.error ?? 'Falha ao entrar com o Google.');
              setLoading(false);
              // O GIS não tem `accounts.id.cancel` no namespace público —
              // basta religar o botão para permitir nova tentativa.
              if (buttonRef.current) {
                window.google?.accounts.id.renderButton(buttonRef.current, {
                  theme: 'outline',
                  size: 'large',
                  type: 'standard',
                  text: 'signin_with',
                  shape: 'rectangular',
                  logo_alignment: 'left',
                  width: 320,
                  locale: 'pt-BR',
                });
              }
              return;
            }
            window.location.href = safeNext(
              new URLSearchParams(window.location.search).get('next'),
            );
          },
          cancel_on_tap_outside: true,
          itp_support: true,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
            locale: 'pt-BR',
          });
        }
        setReady(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? `Não foi possível carregar o Google Sign-In: ${e.message}`
            : 'Não foi possível carregar o Google Sign-In.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-md">
      <a
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft size={16} />
        Voltar ao início
      </a>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="h-1.5 bg-linear-to-r from-brand-500 via-sky-500 to-violet-500" />
        <div className="px-7 py-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <LogIn size={20} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Entrar
              </h1>
              <p className="text-sm text-slate-600">
                Acesse seu workspace de levantamentos.
              </p>
            </div>
          </div>

          {/* Botão oficial do Google Identity Services. Renderizado como
              div filha de `buttonRef` via `accounts.id.renderButton`. */}
          <div
            ref={buttonRef}
            className="flex min-h-11 items-center justify-center"
            aria-label="Entrar com Google"
            aria-busy={loading || !ready}
          />

          {!ready && !error && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Carregando Google Sign-In…
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-7 flex items-start gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <p>
              Sua sessão é aberta com sua conta Google. O Doclify usa os
              serviços do Google para iniciar a sua sessão — nenhum dado de
              senha trafega pela aplicação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
