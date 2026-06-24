import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  Lock,
  LogIn,
  Mail,
} from 'lucide-react';
import { isAuthenticated, login } from '../data/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = '/dashboard';
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error ?? 'Falha ao entrar.');
      setLoading(false);
      return;
    }

    const next =
      new URLSearchParams(window.location.search).get('next') ?? '/dashboard';
    window.location.href = next;
  }

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
        <div className="h-1.5 bg-gradient-to-r from-brand-500 via-sky-500 to-violet-500" />
        <div className="px-7 py-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                E-mail
              </label>
              <div className="relative mt-1.5">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@empresa.com"
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Senha
              </label>
              <div className="relative mt-1.5">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={16} />
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <p>
              <span className="font-semibold text-slate-700">Demo:</span>
              {' '}use <span className="font-mono text-slate-700">demo@requisita.app</span> com senha{' '}
              <span className="font-mono text-slate-700">demo1234</span> — ou
              cadastre um novo e-mail com pelo menos 4 caracteres.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
