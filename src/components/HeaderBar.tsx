'use client';

import {
  FileSpreadsheet,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import {
  MasterballIcon,
  PikachuIcon,
  PokeballIcon,
  TcgCardStackIcon,
  TdkCrownIcon,
  type TcgIconComponent,
} from '@/components/icons/pokemon-lucide';
import type { ActiveSession } from '@/lib/client-api';
import { DEFAULT_PROFILES } from '@/lib/rbac';

export type TabKey =
  | 'dashboard'
  | 'compras'
  | 'vendas'
  | 'contabilidade'
  | 'clientes'
  | 'tesouraria';

interface HeaderBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  session: ActiveSession;
  onSessionChange: (next: ActiveSession) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const NAV_ITEMS: Array<{ key: TabKey; label: string; Icon: TcgIconComponent }> = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'compras', label: 'Minhas Compras', Icon: TcgCardStackIcon },
  { key: 'vendas', label: 'Arremates', Icon: PikachuIcon },
  { key: 'contabilidade', label: 'Contabilidade', Icon: PokeballIcon },
  { key: 'clientes', label: 'Clientes & Etiquetas', Icon: Users },
  { key: 'tesouraria', label: 'Tesouraria', Icon: TdkCrownIcon },
];

export function HeaderBar({
  activeTab,
  onTabChange,
  session,
  onSessionChange,
  darkMode,
  onToggleDark,
}: HeaderBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-purple-800/60 dark:bg-[#130924]/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-amber-500 text-yellow-300 shadow-md">
            <TdkCrownIcon size={22} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-yellow-400">
              TDK &amp; COUTS TCG
            </h1>
            <p className="text-xs text-slate-500 dark:text-purple-300">
              Gestão de Leilões Pokémon · BRL
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs dark:border-purple-700/70 dark:bg-[#1E1035]">
            {session.role === 'ADMIN' ? (
              <MasterballIcon size={16} className="text-purple-500 dark:text-yellow-400" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-500" />
            )}
            <label htmlFor="rbac-profile-select" className="sr-only">
              Perfil de Acesso RBAC
            </label>
            <select
              id="rbac-profile-select"
              data-testid="rbac-profile-select"
              value={session.userId}
              onChange={(e) => {
                const found = DEFAULT_PROFILES.find((p) => p.id === e.target.value);
                if (found) onSessionChange({ userId: found.id, nome: found.nome, role: found.role });
              }}
              className="bg-transparent font-medium text-slate-800 outline-none dark:text-slate-100"
            >
              {DEFAULT_PROFILES.map((p) => (
                <option key={p.id} value={p.id} className="dark:bg-[#1E1035]">
                  {p.nome} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleDark}
            aria-label="Alternar tema claro e escuro"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100 dark:border-purple-700/70 dark:bg-[#1E1035] dark:text-yellow-300 dark:hover:bg-purple-900/50"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`nav-tab-${key}`}
              onClick={() => onTabChange(key)}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'bg-purple-700 text-yellow-300 shadow-sm dark:bg-yellow-400 dark:text-[#130924]'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-purple-200 dark:hover:bg-[#241442]'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          );
        })}
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-slate-500 lg:flex dark:text-purple-300">
          <FileSpreadsheet size={14} /> Padrão Monetário BRL (vírgula)
        </span>
      </nav>
    </header>
  );
}
