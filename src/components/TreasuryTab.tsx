'use client';

import { useCallback, useEffect, useState } from 'react';
import { TdkCrownIcon } from '@/components/icons/pokemon-lucide';
import { apiFetch, type ActiveSession } from '@/lib/client-api';
import type { PartnerTreasurySummary } from '@/lib/skills/accounting-skills';

interface AuctionSummaryRow {
  id: string;
  nomeLeilao: string;
  responsavelNome: string;
  dataLeilao: string;
  totalEsperadoBRL: string;
  totalArrematadoBRL: string;
  totalPagoPixBRL: string;
  totalPendenteBRL: string;
  custoVinculadoBRL: string;
  lucroLiquidoBRL: string;
  statusRepasse: 'Pendente' | 'Em Conferencia' | 'Repassado';
  totalItens: number;
}

interface TreasuryResponse {
  auctions: AuctionSummaryRow[];
  partnerSummaries: PartnerTreasurySummary[];
}

export function TreasuryTab({ session }: { session: ActiveSession }) {
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [feedback, setFeedback] = useState('');

  const loadTreasury = useCallback(async () => {
    const res = await apiFetch<TreasuryResponse>('/api/treasury', session);
    setData(res);
  }, [session]);

  useEffect(() => {
    void loadTreasury();
  }, [loadTreasury]);

  async function handleStatusChange(id: string, statusRepasse: AuctionSummaryRow['statusRepasse']) {
    try {
      await apiFetch('/api/treasury', session, {
        method: 'PATCH',
        body: JSON.stringify({ id, statusRepasse }),
      });
      setFeedback(`Status de repasse atualizado para "${statusRepasse}".`);
      void loadTreasury();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Sem permissão para alterar repasse.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <TdkCrownIcon size={20} className="text-yellow-400" />
          Tesouraria &amp; Repasses aos Sócios
        </h2>
        <p className="text-xs text-slate-500 dark:text-purple-300">
          Consolidação de leilões: Valor Esperado vs. Arrematado Real vs. PIX Recebido por Sócio Responsável.
        </p>
      </div>
      {feedback && <p className="rounded bg-purple-500/20 px-3 py-2 text-xs text-purple-200">{feedback}</p>}
      <PartnerSummaryCards summaries={data?.partnerSummaries ?? []} />
      <AuctionsPayoutTable
        auctions={data?.auctions ?? []}
        canApprove={session.role === 'ADMIN' || session.role === 'TREASURER'}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

function PartnerSummaryCards({ summaries }: { summaries: PartnerTreasurySummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {summaries.map((partner) => (
        <div key={partner.profileId} className="rounded-xl border border-purple-700/50 bg-white p-5 shadow-sm dark:bg-[#1E1035]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold dark:text-yellow-400">{partner.responsavelNome}</h3>
              <p className="text-xs text-slate-500 dark:text-purple-300">Chave PIX: {partner.pixKey}</p>
            </div>
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold">
              {partner.totalLeiloes} Leilão(ões)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-slate-50 p-2.5 dark:bg-[#130924]">
              <span className="text-slate-500 dark:text-purple-300">Arrematado Total</span>
              <p className="mt-1 text-sm font-bold">{partner.totalArrematadoBRL}</p>
            </div>
            <div className="rounded bg-slate-50 p-2.5 dark:bg-[#130924]">
              <span className="text-slate-500 dark:text-purple-300">PIX Confirmado</span>
              <p className="mt-1 text-sm font-bold text-emerald-400">{partner.totalPagoPixBRL}</p>
            </div>
            <div className="rounded bg-slate-50 p-2.5 dark:bg-[#130924]">
              <span className="text-slate-500 dark:text-purple-300">Aguardando PIX</span>
              <p className="mt-1 text-sm font-bold text-amber-400">{partner.totalPendenteBRL}</p>
            </div>
            <div className="rounded bg-slate-50 p-2.5 dark:bg-[#130924]">
              <span className="text-slate-500 dark:text-purple-300">Lucro Conciliado</span>
              <p className="mt-1 text-sm font-bold text-emerald-400">{partner.lucroLiquidoBRL}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuctionsPayoutTable({
  auctions,
  canApprove,
  onStatusChange,
}: {
  auctions: AuctionSummaryRow[];
  canApprove: boolean;
  onStatusChange: (id: string, status: AuctionSummaryRow['statusRepasse']) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-purple-800/60 dark:bg-[#1E1035]">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase dark:bg-[#130924] dark:text-purple-200">
          <tr>
            <th className="px-4 py-3">Leilão</th>
            <th className="px-4 py-3">Responsável</th>
            <th className="px-4 py-3">Esperado</th>
            <th className="px-4 py-3">Arrematado</th>
            <th className="px-4 py-3">PIX Pago</th>
            <th className="px-4 py-3">Status Repasse</th>
          </tr>
        </thead>
        <tbody>
          {auctions.map((auc) => (
            <tr key={auc.id} className="border-t border-slate-100 dark:border-purple-800/40">
              <td className="px-4 py-3 font-semibold">{auc.nomeLeilao}</td>
              <td className="px-4 py-3 text-xs">{auc.responsavelNome}</td>
              <td className="px-4 py-3">{auc.totalEsperadoBRL}</td>
              <td className="px-4 py-3 font-bold dark:text-yellow-300">{auc.totalArrematadoBRL}</td>
              <td className="px-4 py-3 font-semibold text-emerald-400">{auc.totalPagoPixBRL}</td>
              <td className="px-4 py-3">
                <select
                  disabled={!canApprove}
                  value={auc.statusRepasse}
                  onChange={(e) => onStatusChange(auc.id, e.target.value as AuctionSummaryRow['statusRepasse'])}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-60 dark:border-purple-700 dark:bg-[#130924]"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Conferencia">Em Conferencia</option>
                  <option value="Repassado">Repassado</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
