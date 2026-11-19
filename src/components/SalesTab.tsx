'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, ImageIcon, Search, Upload, X } from 'lucide-react';
import { PikachuIcon } from '@/components/icons/pokemon-lucide';
import { SpreadsheetUploadModal } from '@/components/SpreadsheetUploadModal';
import { apiFetch, type ActiveSession } from '@/lib/client-api';
import { sanitizeBRLInput } from '@/lib/currency-brl';
import type { Sale } from '@/types/tcg';

interface SaleRow extends Sale {
  valorArremateBRL: string;
  custoVinculadoBRL: string;
  lucroBRL: string;
}

interface SalesResponse {
  items: SaleRow[];
  totalCount: number;
  totalArrematadoBRL: string;
  leiloes: string[];
}

export function SalesTab({ session }: { session: ActiveSession }) {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [q, setQ] = useState('');
  const [leilao, setLeilao] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadSales = useCallback(async () => {
    const params = new URLSearchParams({ q, leilao });
    const res = await apiFetch<SalesResponse>(`/api/sales?${params.toString()}`, session);
    setData(res);
  }, [q, leilao, session]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  async function handleDownloadTemplate() {
    const res = await fetch('/api/spreadsheets/template?module=vendas', {
      headers: { 'x-tcg-user-id': session.userId, 'x-tcg-role': session.role },
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_tdk_vendas.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleMarkPaidWithPix(sale: SaleRow) {
    try {
      await apiFetch('/api/sales', session, {
        method: 'PATCH',
        body: JSON.stringify({
          id: sale.id,
          statusPagamento: 'Pago',
          comprovantePixUrl: sale.comprovantePixUrl || '/brand/foto-carta-leilao.jpeg',
        }),
      });
      setFeedback(`PIX confirmado e comprovante anexado para ${sale.compradorNome}.`);
      void loadSales();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao atualizar PIX.');
    }
  }

  return (
    <div className="space-y-4">
      <SalesHeaderActions
        totalArrematadoBRL={data?.totalArrematadoBRL ?? 'R$ 0,00'}
        canCreate={session.role !== 'TREASURER'}
        onDownload={() => void handleDownloadTemplate()}
        onOpenUpload={() => setShowUpload(true)}
        onOpenCreate={() => setShowCreate(true)}
      />
      <SalesFilterBar q={q} onQChange={setQ} leilao={leilao} onLeilaoChange={setLeilao} leiloes={data?.leiloes ?? []} />
      {feedback && <p className="rounded bg-emerald-500/20 px-3 py-2 text-xs text-emerald-300">{feedback}</p>}
      <SalesTable items={data?.items ?? []} onMarkPaid={handleMarkPaidWithPix} />
      {showCreate && <NewSaleModal session={session} onClose={() => setShowCreate(false)} onCreated={() => void loadSales()} />}
      {showUpload && <SpreadsheetUploadModal moduleName="vendas" session={session} onClose={() => setShowUpload(false)} onCommitted={() => void loadSales()} />}
    </div>
  );
}

function SalesHeaderActions({
  totalArrematadoBRL,
  canCreate,
  onDownload,
  onOpenUpload,
  onOpenCreate,
}: {
  totalArrematadoBRL: string;
  canCreate: boolean;
  onDownload: () => void;
  onOpenUpload: () => void;
  onOpenCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <PikachuIcon size={20} className="text-yellow-400" />
          Cartas Arrematadas (Saída / Vendas)
        </h2>
        <p className="text-xs text-slate-500 dark:text-purple-300">
          Total Arrematado Filtrado: <strong>{totalArrematadoBRL}</strong>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-purple-500 hover:text-purple-700 dark:border-purple-700 dark:text-purple-200 dark:hover:border-yellow-400"
        >
          <Download size={15} /> Baixar Modelo (.xlsx)
        </button>
        {canCreate && (
          <>
            <button type="button" onClick={onOpenUpload} className="flex items-center gap-1.5 rounded-md border border-purple-500 bg-transparent px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-400 dark:text-purple-200 dark:hover:bg-purple-900/30">
              <Upload size={15} /> Importar Planilha
            </button>
            <button type="button" data-testid="open-create-sale" onClick={onOpenCreate} className="flex items-center gap-1.5 rounded-md border-2 border-purple-600 bg-transparent px-3.5 py-2 text-xs font-extrabold text-purple-700 transition hover:bg-purple-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-400/10">
              <PikachuIcon size={16} /> Novo Arremate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SalesFilterBar({
  q,
  onQChange,
  leilao,
  onLeilaoChange,
  leiloes,
}: {
  q: string;
  onQChange: (v: string) => void;
  leilao: string;
  onLeilaoChange: (v: string) => void;
  leiloes: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3 dark:border-purple-800/60 dark:bg-[#1E1035]">
      <div className="relative sm:col-span-2">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          placeholder="Filtrar por carta ou comprador..."
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-transparent py-2 pl-9 pr-3 text-sm outline-none dark:border-purple-700"
        />
      </div>
      <select
        value={leilao}
        onChange={(e) => onLeilaoChange(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-[#130924]"
      >
        <option value="ALL">Todos os Leilões</option>
        {leiloes.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
    </div>
  );
}

function SalesTable({ items, onMarkPaid }: { items: SaleRow[]; onMarkPaid: (s: SaleRow) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-purple-800/60 dark:bg-[#1E1035]">
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600 dark:bg-[#130924] dark:text-purple-200">
            <tr>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Leilão</th>
              <th className="px-4 py-3">Carta / Kit</th>
              <th className="px-4 py-3">Arremate</th>
              <th className="px-4 py-3">Conciliação</th>
              <th className="px-4 py-3">PIX / Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((sale) => (
              <tr key={sale.id} className="border-t border-slate-100 hover:bg-slate-100/70 dark:border-purple-800/40 dark:hover:bg-purple-800/30">
                <td className="px-4 py-2.5">
                  <p className="font-semibold">{sale.compradorNome}</p>
                  <p className="text-xs text-slate-500 dark:text-purple-300">{sale.compradorTelefone}</p>
                </td>
                <td className="px-4 py-2.5 text-xs">{sale.leilaoNome}</td>
                <td className="px-4 py-2.5">{sale.descricao}</td>
                <td className="px-4 py-2.5 font-bold dark:text-yellow-300">{sale.valorArremateBRL}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${sale.statusConciliacao === 'Conciliado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {sale.statusConciliacao}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {sale.statusPagamento === 'Pago' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                      <CheckCircle2 size={14} /> Pago {sale.comprovantePixUrl && <ImageIcon size={13} />}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMarkPaid(sale)}
                      className="rounded border border-amber-500 bg-transparent px-2.5 py-1 font-bold text-amber-600 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                    >
                      Anexar PIX ({sale.statusPagamento})
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewSaleModal({ session, onClose, onCreated }: { session: ActiveSession; onClose: () => void; onCreated: () => void }) {
  const [compradorNome, setCompradorNome] = useState('Lucas Mendes');
  const [compradorTelefone, setCompradorTelefone] = useState('11998765432');
  const [leilaoNome, setLeilaoNome] = useState('Leilão #15 - Sexta Poké & Kits');
  const [descricao, setDescricao] = useState('');
  const [valorArremateBRL, setValorArremateBRL] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/sales', session, {
        method: 'POST',
        body: JSON.stringify({ compradorNome, compradorTelefone, leilaoNome, descricao, valorArremateBRL }),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar arremate.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-purple-700/60 bg-white p-6 dark:bg-[#1E1035]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-extrabold dark:text-yellow-400">
            <PikachuIcon size={20} /> Registrar Arremate
          </h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <input placeholder="Nome do Comprador" value={compradorNome} onChange={(e) => setCompradorNome(e.target.value)} required className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <input placeholder="Telefone WhatsApp" value={compradorTelefone} onChange={(e) => setCompradorTelefone(e.target.value)} className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <input placeholder="Leilão de Origem" value={leilaoNome} onChange={(e) => setLeilaoNome(e.target.value)} required className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <input placeholder="Descrição da Carta / Kit" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <input placeholder="Valor Arrematado (ex: 45,00)" value={valorArremateBRL} onChange={(e) => setValorArremateBRL(sanitizeBRLInput(e.target.value))} required className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-transparent px-4 py-2 text-xs dark:border-purple-700">Cancelar</button>
            <button type="submit" className="flex items-center gap-1.5 rounded-md border-2 border-purple-600 bg-transparent px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-400/10">
              <PikachuIcon size={15} /> Salvar Arremate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
