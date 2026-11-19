'use client';

import { useEffect, useState } from 'react';
import { AccountingTab } from '@/components/AccountingTab';
import { CustomersLabelsTab } from '@/components/CustomersLabelsTab';
import { DashboardTab } from '@/components/DashboardTab';
import { HeaderBar, type TabKey } from '@/components/HeaderBar';
import { PokemonSideWatermarks } from '@/components/PokemonSideWatermarks';
import { PurchasesTab } from '@/components/PurchasesTab';
import { SalesTab } from '@/components/SalesTab';
import { TreasuryTab } from '@/components/TreasuryTab';
import { INITIAL_SESSION, type ActiveSession } from '@/lib/client-api';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [session, setSession] = useState<ActiveSession>(INITIAL_SESSION);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  function handleSessionChange(next: ActiveSession) {
    setSession(next);
    document.cookie = `tcg_session=${encodeURIComponent(JSON.stringify({ userId: next.userId, role: next.role }))}; path=/; max-age=604800`;
  }

  return (
    <div className="relative min-h-screen">
      <PokemonSideWatermarks />
      <HeaderBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        session={session}
        onSessionChange={handleSessionChange}
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
    </div>
  );
}
