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
  { key: 'tesouraria', label: 'Tesouraria', Icon: PokeballIcon },
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-purple-600 bg-transparent text-purple-700 dark:border-yellow-400 dark:text-yellow-400">
            <PokeballIcon size={22} />
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
          <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-transparent px-2.5 py-1.5 text-xs dark:border-purple-700/70">
            {session.role === 'ADMIN' ? (
              <MasterballIcon size={16} className="text-purple-600 dark:text-yellow-400" />
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
            className="rounded-md border border-slate-300 bg-transparent p-2 text-slate-700 transition hover:border-purple-500 hover:text-purple-700 dark:border-purple-700/70 dark:text-yellow-300 dark:hover:border-yellow-400"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-2.5">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`nav-tab-${key}`}
              onClick={() => onTabChange(key)}
              className={`flex shrink-0 items-center gap-2 bg-transparent px-2.5 py-1.5 text-sm transition ${
                active
                  ? 'font-bold text-purple-700 dark:text-yellow-400'
                  : 'font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
