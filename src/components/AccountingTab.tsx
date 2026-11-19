'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Link2 } from 'lucide-react';
import { PokeballIcon } from '@/components/icons/pokemon-lucide';
import { apiFetch, type ActiveSession } from '@/lib/client-api';
import { formatCentavosToBRL, sanitizeBRLInput } from '@/lib/currency-brl';
import type { MatchSuggestion, Purchase, Sale } from '@/types/tcg';

interface ReconciledSaleRow extends Sale {
  valorArremateBRL: string;
  custoVinculadoBRL: string;
  lucroBRL: string;
}

interface PendingSaleRow extends Sale {
  valorArremateBRL: string;
}

interface AvailablePurchaseRow extends Purchase {
  valorCompraBRL: string;
  saldoDisponivelCentavos: number;
  saldoDisponivelBRL: string;
}

interface ReconciliationResponse {
  suggestions: MatchSuggestion[];
  reconciledSales: ReconciledSaleRow[];
  pendingSales: PendingSaleRow[];
  availablePurchases: AvailablePurchaseRow[];
  lucroTotalBRL: string;
}

export function AccountingTab({ session }: { session: ActiveSession }) {
  const [data, setData] = useState<ReconciliationResponse | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [custoAlocadoBRL, setCustoAlocadoBRL] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadData = useCallback(async () => {
    const res = await apiFetch<ReconciliationResponse>('/api/reconciliation', session);
    setData(res);
    if (!selectedSaleId && res.pendingSales[0]) setSelectedSaleId(res.pendingSales[0].id);
    if (!selectedPurchaseId && res.availablePurchases[0]) {
      setSelectedPurchaseId(res.availablePurchases[0].id);
      setCustoAlocadoBRL(formatCentavosToBRL(res.availablePurchases[0].saldoDisponivelCentavos));
    }
  }, [session, selectedSaleId, selectedPurchaseId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAcceptSuggestion(s: MatchSuggestion) {
    try {
      const custo = formatCentavosToBRL(s.purchaseDisponivelCentavos);
      await apiFetch('/api/reconciliation', session, {
        method: 'POST',
        body: JSON.stringify({
          saleId: s.saleId,
          links: [{ purchaseId: s.purchaseId, custoAlocadoBRL: custo, tipoMatch: 'AUTO', score: s.score }],
        }),
      });
      setFeedback(`Match capturado! ${s.saleDescricao} conciliada com ${s.purchaseDescricao}.`);
      setSelectedSaleId('');
      void loadData();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao conciliar.');
    }
  }

  async function handleManualLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSaleId || !selectedPurchaseId) return;
    try {
      await apiFetch('/api/reconciliation', session, {
        method: 'POST',
        body: JSON.stringify({
          saleId: selectedSaleId,
          links: [{ purchaseId: selectedPurchaseId, custoAlocadoBRL, tipoMatch: 'MANUAL' }],
        }),
      });
      setFeedback('Conciliação manual aplicada com sucesso.');
      setSelectedSaleId('');
      void loadData();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao vincular.');
    }
  }

  const canReconcile = session.role !== 'TREASURER';

  return (
    <div className="space-y-6">
      <AccountingHeader lucroTotalBRL={data?.lucroTotalBRL ?? 'R$ 0,00'} />
      {feedback && <p className="rounded-md bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300">{feedback}</p>}
      <SuggestionsSection
        suggestions={data?.suggestions ?? []}
        canReconcile={canReconcile}
        onAccept={handleAcceptSuggestion}
      />
      {canReconcile && (
        <ManualLinkSection
          pendingSales={data?.pendingSales ?? []}
          availablePurchases={data?.availablePurchases ?? []}
          selectedSaleId={selectedSaleId}
          onSaleChange={setSelectedSaleId}
          selectedPurchaseId={selectedPurchaseId}
          onPurchaseChange={(id) => {
            setSelectedPurchaseId(id);
            const found = data?.availablePurchases.find((p) => p.id === id);
            if (found) setCustoAlocadoBRL(formatCentavosToBRL(found.saldoDisponivelCentavos));
          }}
          custoAlocadoBRL={custoAlocadoBRL}
          onCustoChange={(v) => setCustoAlocadoBRL(sanitizeBRLInput(v))}
          onSubmit={handleManualLink}
        />
      )}
      <ReconciledHistoryTable rows={data?.reconciledSales ?? []} />
    </div>
  );
}

function AccountingHeader({ lucroTotalBRL }: { lucroTotalBRL: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <PokeballIcon size={20} className="text-red-500" />
          Contabilidade (De-Para &amp; Lucratividade)
        </h2>
        <p className="text-xs text-slate-500 dark:text-purple-300">
          Fórmula: Valor Arrematado - Custo Alocado · Lucro Consolidado:{' '}
          <strong data-testid="accounting-total-profit" className="text-emerald-400">
            {lucroTotalBRL}
          </strong>
        </p>
      </div>
    </div>
  );
}

function SuggestionsSection({
  suggestions,
  canReconcile,
  onAccept,
}: {
  suggestions: MatchSuggestion[];
  canReconcile: boolean;
  onAccept: (s: MatchSuggestion) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-purple-800/60 dark:bg-[#1E1035]">
      <h3 className="mb-3 text-sm font-bold dark:text-yellow-400">
        Sugestões Automáticas de Match ({suggestions.length})
      </h3>
      {suggestions.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-purple-300">Nenhuma sugestão automática pendente.</p>
      ) : (
        <div className="space-y-2">
          {suggestions.slice(0, 6).map((s, idx) => (
            <div
              key={`${s.saleId}-${s.purchaseId}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-purple-500/30 bg-slate-50 p-3 text-xs dark:bg-[#130924]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-purple-600 dark:text-yellow-300">
                  Venda: {s.saleDescricao} ({s.saleValorBRL})
                </span>
                <ArrowRight size={14} />
                <span>
                  Compra: {s.purchaseDescricao} [{s.purchaseVendedor}] ({s.purchaseValorBRL})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 font-semibold">
                  Similaridade {Math.round(s.score * 100)}%
                </span>
                <span className="font-bold text-emerald-400">Lucro est.: {s.lucroEstimadoBRL}</span>
                {canReconcile && (
                  <button
                    type="button"
                    data-testid={`capture-match-${idx}`}
                    onClick={() => onAccept(s)}
                    className="flex items-center gap-1.5 rounded-md border-2 border-purple-600 bg-transparent px-3 py-1.5 font-bold text-purple-700 transition hover:bg-purple-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-400/10"
                  >
                    <PokeballIcon size={14} /> Capturar Match
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ManualLinkSection(props: {
  pendingSales: PendingSaleRow[];
  availablePurchases: AvailablePurchaseRow[];
  selectedSaleId: string;
  onSaleChange: (v: string) => void;
  selectedPurchaseId: string;
  onPurchaseChange: (v: string) => void;
  custoAlocadoBRL: string;
  onCustoChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={props.onSubmit}
      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4 dark:border-purple-800/60 dark:bg-[#1E1035]"
    >
      <div>
        <label className="mb-1 block text-xs font-semibold">Venda Pendente</label>
        <select
          value={props.selectedSaleId}
          onChange={(e) => props.onSaleChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-purple-700 dark:bg-[#130924]"
        >
          {props.pendingSales.map((s) => (
            <option key={s.id} value={s.id}>{s.descricao} ({s.valorArremateBRL})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">Compra / Lote de Origem</label>
        <select
          value={props.selectedPurchaseId}
          onChange={(e) => props.onPurchaseChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-purple-700 dark:bg-[#130924]"
        >
          {props.availablePurchases.slice(0, 80).map((p) => (
            <option key={p.id} value={p.id}>{p.descricao} - {p.vendedor} (Disp: {p.saldoDisponivelBRL})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">Custo Alocado (Rateio BRL)</label>
        <input
          value={props.custoAlocadoBRL}
          onChange={(e) => props.onCustoChange(e.target.value)}
          placeholder="Ex: 22,00"
          className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-xs dark:border-purple-700"
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-purple-600 bg-transparent px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-400/10"
        >
          <Link2 size={15} /> Vincular Manual / Lote
        </button>
      </div>
    </form>
  );
}

function ReconciledHistoryTable({ rows }: { rows: ReconciledSaleRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-purple-800/60 dark:bg-[#1E1035]">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase dark:bg-[#130924] dark:text-purple-200">
          <tr>
            <th className="px-4 py-3">Carta Vendida</th>
            <th className="px-4 py-3">Comprador</th>
            <th className="px-4 py-3">Valor Arremate</th>
            <th className="px-4 py-3">Custo Alocado</th>
            <th className="px-4 py-3">Lucro / Prejuízo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 dark:border-purple-800/40">
              <td className="flex items-center gap-2 px-4 py-2.5 font-medium">
                <CheckCircle2 size={15} className="text-emerald-400" /> {row.descricao}
              </td>
              <td className="px-4 py-2.5 text-xs">{row.compradorNome}</td>
              <td className="px-4 py-2.5">{row.valorArremateBRL}</td>
              <td className="px-4 py-2.5">{row.custoVinculadoBRL}</td>
              <td className={`px-4 py-2.5 font-extrabold ${row.lucroCentavos >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {row.lucroBRL}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
