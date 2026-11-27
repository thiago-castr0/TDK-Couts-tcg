'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Moon, ShieldCheck, Sun } from 'lucide-react';
import { MasterballIcon, PikachuIcon, PokeballIcon } from '@/components/icons/pokemon-lucide';
import type { ActiveSession } from '@/lib/client-api';
import { DEFAULT_PROFILES, ROLE_LABELS } from '@/lib/users';
import type { UserProfile } from '@/types/tcg';

interface LoginScreenProps {
  onLoginSuccess: (session: ActiveSession) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

function UserSelectorGrid({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Selecionar usuário">
      {DEFAULT_PROFILES.map((user) => {
        const active = user.id === selectedId;
        return (
          <button
            key={user.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`login-user-${user.id}`}
            onClick={() => onSelect(user.id)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-3 text-center transition ${
              active
                ? 'border-purple-600 bg-purple-50/70 text-purple-800 shadow-sm dark:border-yellow-400 dark:bg-yellow-400/10 dark:text-yellow-300'
                : 'border-slate-300 bg-transparent text-slate-600 hover:border-purple-400 hover:text-slate-900 dark:border-purple-800 dark:text-slate-300 dark:hover:border-yellow-400/60'
            }`}
          >
            {user.role === 'ADMIN' ? (
              <MasterballIcon size={20} />
            ) : user.role === 'PARTNER' ? (
              <PokeballIcon size={20} />
            ) : (
              <ShieldCheck size={20} />
            )}
            <span className="text-sm font-bold leading-tight">{user.nome}</span>
            <span className="text-[11px] opacity-80">{ROLE_LABELS[user.role]}</span>
          </button>
        );
      })}
    </div>
  );
}

function PasswordInputField({
  userName,
  password,
  onChange,
}: {
  userName: string;
  password: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="login-password-input"
        className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-purple-300"
      >
        Senha de {userName}
      </label>
      <div className="relative">
        <Lock
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          id="login-password-input"
          data-testid="login-password-input"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite sua senha"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 bg-transparent py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition focus:border-purple-600 dark:border-purple-700 dark:text-white dark:focus:border-yellow-400"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function LoginBrandHeader() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-purple-600 text-purple-700 dark:border-yellow-400 dark:text-yellow-400">
        <PokeballIcon size={26} />
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-yellow-400">
        TDK &amp; COUTS TCG
      </h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-purple-300">
        Acesso restrito da equipe · Gestão de Leilões Pokémon
      </p>
    </div>
  );
}

export function LoginScreen({ onLoginSuccess, darkMode, onToggleDark }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(DEFAULT_PROFILES[0].id);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProfile =
    DEFAULT_PROFILES.find((p) => p.id === selectedUserId) ?? DEFAULT_PROFILES[0];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: selectedUserId, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        currentUser?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.currentUser) {
        setError(data.error ?? 'Usuário ou senha incorretos.');
        return;
      }
      onLoginSuccess({
        userId: data.currentUser.id,
        nome: data.currentUser.nome,
        role: data.currentUser.role,
      });
    } catch {
      setError('Falha de conexão ao autenticar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <button
        type="button"
        onClick={onToggleDark}
        aria-label="Alternar tema claro e escuro"
        className="fixed right-4 top-4 rounded-md border border-slate-300 bg-white/90 p-2 text-slate-700 transition hover:border-purple-500 hover:text-purple-700 dark:border-purple-700/70 dark:bg-[#1E1035]/90 dark:text-yellow-300 dark:hover:border-yellow-400"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-purple-800/60 dark:bg-[#1E1035]/95">
        <LoginBrandHeader />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-purple-300">
              Quem está entrando?
            </span>
            <UserSelectorGrid selectedId={selectedUserId} onSelect={setSelectedUserId} />
          </div>

          <PasswordInputField
            userName={selectedProfile.nome}
            password={password}
            onChange={setPassword}
          />

          {error && (
            <div
              data-testid="login-error"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="login-submit-btn"
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-purple-600 bg-transparent px-4 py-2.5 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60 dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-400/10"
          >
            <PikachuIcon size={18} />
            <span>{submitting ? 'Entrando...' : `Entrar como ${selectedProfile.nome}`}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
