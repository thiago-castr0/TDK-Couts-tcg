'use client';

import { useEffect, useState } from 'react';
import { AccountingTab } from '@/components/AccountingTab';
import { CustomersLabelsTab } from '@/components/CustomersLabelsTab';
import { DashboardTab } from '@/components/DashboardTab';
import { HeaderBar, type TabKey } from '@/components/HeaderBar';
import { LoginScreen } from '@/components/LoginScreen';
import { PokemonSideWatermarks } from '@/components/PokemonSideWatermarks';
import { PurchasesTab } from '@/components/PurchasesTab';
import { SalesTab } from '@/components/SalesTab';
import { TreasuryTab } from '@/components/TreasuryTab';
import type { ActiveSession } from '@/lib/client-api';
import type { UserProfile } from '@/types/tcg';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = (await res.json()) as { currentUser?: UserProfile };
        if (active && data.currentUser) {
          setSession({
            userId: data.currentUser.id,
            nome: data.currentUser.nome,
            role: data.currentUser.role,
          });
        }
      } catch {
        // Sem sessão ativa — mantém tela de login
      } finally {
        if (active) setCheckingAuth(false);
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    setSession(null);
    setActiveTab('dashboard');
  }

  return (
    <div className="relative min-h-screen">
      <PokemonSideWatermarks />
      {checkingAuth ? (
        <div className="relative z-10 flex min-h-screen items-center justify-center text-sm font-medium text-slate-500 dark:text-purple-300">
          Verificando sessão...
        </div>
      ) : !session ? (
        <LoginScreen
          onLoginSuccess={(next) => setSession(next)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
        />
      ) : (
        <>
          <HeaderBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            session={session}
            onLogout={handleLogout}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
          />

          <main className="relative z-10 mx-auto max-w-7xl px-4 py-6">
            {activeTab === 'dashboard' && <DashboardTab session={session} />}
            {activeTab === 'compras' && <PurchasesTab session={session} />}
            {activeTab === 'vendas' && <SalesTab session={session} />}
            {activeTab === 'contabilidade' && <AccountingTab session={session} />}
            {activeTab === 'clientes' && <CustomersLabelsTab session={session} />}
            {activeTab === 'tesouraria' && <TreasuryTab session={session} />}
          </main>
        </>
      )}
    </div>
  );
}
