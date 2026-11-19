'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import {
  PikachuIcon,
  PokeballIcon,
  TcgCardStackIcon,
  TdkCrownIcon,
  ThunderboltIcon,
  type TcgIconComponent,
} from '@/components/icons/pokemon-lucide';
import { apiFetch, type ActiveSession } from '@/lib/client-api';

interface TreasuryDashboardData {
  auctions: Array<{
    id: string;
    nomeLeilao: string;
    responsavelNome: string;
    totalEsperadoBRL: string;
    totalArrematadoCentavos: number;
    totalArrematadoBRL: string;
    totalPendenteBRL: string;
    custoVinculadoBRL: string;
    lucroLiquidoBRL: string;
    statusRepasse: string;
  }>;
  kpis: {
    totalInvestidoBRL: string;
    totalArrematadoGlobalBRL: string;
    totalPendenteReceberBRL: string;
    totalLucroRealizadoBRL: string;
  };
}

interface PendingSaleAlert {
  id: string;
  compradorNome: string;
  descricao: string;
  valorArremateBRL: string;
  statusPagamento: string;
}

export function DashboardTab({ session }: { session: ActiveSession }) {
  const [data, setData] = useState<TreasuryDashboardData | null>(null);
  const [alerts, setAlerts] = useState<PendingSaleAlert[]>([]);

  useEffect(() => {
    void apiFetch<TreasuryDashboardData>('/api/treasury', session).then(setData);
    void apiFetch<{ items: PendingSaleAlert[] }>('/api/sales', session).then((res) => {
      setAlerts(res.items.filter((s) => s.statusPagamento !== 'Pago'));
    });
  }, [session]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <DashboardHeroBanner />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Investido em Estoque"
          value={kpis?.totalInvestidoBRL ?? 'R$ 0,00'}
          subtitle="343+ itens da planilha real"
          testId="kpi-total-investido"
          Icon={TcgCardStackIcon}
          accent="border-l-purple-500 text-purple-600 dark:text-purple-300"
        />
        <KpiCard
          title="Total Arrematado"
          value={kpis?.totalArrematadoGlobalBRL ?? 'R$ 0,00'}
          subtitle="Receita bruta dos leilões"
          testId="kpi-total-arrematado"
          Icon={PikachuIcon}
          accent="border-l-yellow-400 text-amber-600 dark:text-yellow-400"
        />
        <KpiCard
          title="Lucro Líquido Conciliado"
          value={kpis?.totalLucroRealizadoBRL ?? 'R$ 0,00'}
          subtitle="Arremate - Custo vinculado"
          testId="kpi-lucro-realizado"
          Icon={TrendingUp}
          accent="border-l-emerald-500 text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          title="Pendentes a Receber (PIX)"
          value={kpis?.totalPendenteReceberBRL ?? 'R$ 0,00'}
          subtitle={`${alerts.length} arremate(s) aguardando PIX`}
          testId="kpi-pendentes-pix"
          Icon={Wallet}
          accent="border-l-red-500 text-red-600 dark:text-red-400"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AuctionComparisonCard auctions={data?.auctions ?? []} />
        <PaymentAlertsAndRulesCard alerts={alerts} />
      </div>
    </div>
  );
}

function DashboardHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-purple-700/40 bg-[#1E1035] p-5 text-white shadow-lg">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="max-w-xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-300">
            <ThunderboltIcon size={14} /> Central de Leilões Pokémon TCG
          </div>
          <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
            Painel Financeiro &amp; Estoque — TDK &amp; COUTS TCG
          </h2>
          <p className="text-sm text-purple-200">
            Controle completo de compras, arremates do WhatsApp, conciliação De-Para e repasses em padrão BRL.
          </p>
        </div>
        <img
          src="/brand/tdk-banner.jpeg"
          alt="Banner TDK & COUTS TCG"
          className="h-24 w-44 rounded-lg border border-yellow-400/50 object-cover shadow-md"
        />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  testId,
  Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  testId: string;
  Icon: TcgIconComponent;
  accent: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm dark:border-purple-800/60 dark:bg-[#1E1035] ${accent}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-purple-300">
          {title}
        </span>
        <Icon size={18} />
      </div>
      <p data-testid={testId} className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-purple-300">{subtitle}</p>
    </div>
  );
}

function AuctionComparisonCard({ auctions }: { auctions: TreasuryDashboardData['auctions'] }) {
  const maxVal = Math.max(1, ...auctions.map((a) => a.totalArrematadoCentavos));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-purple-800/60 dark:bg-[#1E1035]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <TdkCrownIcon size={18} className="text-yellow-400" />
          Arremates vs. Custo por Leilão
        </h3>
        <span className="text-xs text-slate-500 dark:text-purple-300">Atualizado em tempo real</span>
      </div>
      <div className="space-y-4">
        {auctions.map((auc) => {
          const widthPct = Math.max(12, Math.round((auc.totalArrematadoCentavos / maxVal) * 100));
          return (
            <div key={auc.id} className="space-y-1.5 rounded-md border border-slate-100 p-3 dark:border-purple-800/40 dark:bg-[#130924]/50">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{auc.nomeLeilao}</span>
                <span className="text-xs text-slate-500 dark:text-purple-300">
                  Resp.: {auc.responsavelNome} · Repasse: {auc.statusRepasse}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-purple-950">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-yellow-400"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between text-xs text-slate-600 dark:text-purple-200">
                <span>Arrematado: <strong>{auc.totalArrematadoBRL}</strong></span>
                <span>Custo Vinculado: <strong>{auc.custoVinculadoBRL}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400">Lucro: <strong>{auc.lucroLiquidoBRL}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentAlertsAndRulesCard({ alerts }: { alerts: PendingSaleAlert[] }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-purple-800/60 dark:bg-[#1E1035]">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <PokeballIcon size={18} className="text-red-500" />
        Alertas de Pagamento PIX
      </h3>
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle2 size={16} /> Todos os arremates estão pagos!
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((al) => (
            <li
              key={al.id}
              className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs"
            >
              <div>
                <p className="font-bold">{al.compradorNome}</p>
                <p className="text-slate-600 dark:text-purple-200">{al.descricao}</p>
              </div>
              <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-yellow-300">
                <AlertTriangle size={13} /> {al.valorArremateBRL}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-slate-200 pt-3 dark:border-purple-800/60">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-purple-300">
          Guia Rápido de Lances
        </p>
        <img
          src="/brand/regras-lances.jpeg"
          alt="Padronização de Lances TDK & COUTS TCG"
          className="h-36 w-full rounded-md border border-purple-700/50 object-cover object-top"
        />
      </div>
    </div>
  );
}
