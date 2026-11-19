'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Search, Upload } from 'lucide-react';
import { PikachuIcon, TcgCardStackIcon } from '@/components/icons/pokemon-lucide';
import { PurchasesModal } from '@/components/PurchasesModal';
import { SpreadsheetUploadModal } from '@/components/SpreadsheetUploadModal';
import { apiFetch, type ActiveSession } from '@/lib/client-api';
import type { Purchase } from '@/types/tcg';

interface PurchaseRow extends Purchase {
  valorCompraBRL: string;
  valorAlocadoBRL: string;
}

interface PurchasesResponse {
  items: PurchaseRow[];
  totalCount: number;
  totalAllCount: number;
  page: number;
  limit: number;
  filteredTotalBRL: string;
  grandTotalBRL: string;
  vendedores: string[];
}

export function PurchasesTab({ session }: { session: ActiveSession }) {
  const [data, setData] = useState<PurchasesResponse | null>(null);
  const [q, setQ] = useState('');
  const [vendedor, setVendedor] = useState('ALL');
  const [statusPagamento, setStatusPagamento] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadPurchases = useCallback(async () => {
    const params = new URLSearchParams({ q, vendedor, statusPagamento, page: String(page), limit: '50' });
    const res = await apiFetch<PurchasesResponse>(`/api/purchases?${params.toString()}`, session);
    setData(res);
  }, [q, vendedor, statusPagamento, page, session]);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

  async function handleDownloadTemplate() {
    const res = await fetch('/api/spreadsheets/template?module=compras', {
      headers: { 'x-tcg-user-id': session.userId, 'x-tcg-role': session.role },
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_tdk_compras.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleTogglePayment(item: PurchaseRow) {
    const nextStatus = item.statusPagamento === 'Pago' ? 'Pendente' : 'Pago';
    try {
      await apiFetch('/api/purchases', session, {
        method: 'PATCH',
        body: JSON.stringify({ id: item.id, statusPagamento: nextStatus }),
      });
      setFeedback(`Status de "${item.descricao}" atualizado para ${nextStatus}.`);
      void loadPurchases();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao atualizar.');
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <PurchasesHeaderActions
        totalAllCount={data?.totalAllCount ?? 0}
        canWrite={session.role !== 'TREASURER'}
        onDownload={() => void handleDownloadTemplate()}
        onOpenUpload={() => setShowUpload(true)}
        onOpenCreate={() => setShowCreate(true)}
      />
      <PurchasesFilterBar
        q={q}
        onQChange={(v) => { setQ(v); setPage(1); }}
        vendedor={vendedor}
        onVendedorChange={(v) => { setVendedor(v); setPage(1); }}
        statusPagamento={statusPagamento}
        onStatusChange={(v) => { setStatusPagamento(v); setPage(1); }}
        vendedores={data?.vendedores ?? []}
      />
      {feedback && <p className="rounded-md bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-300">{feedback}</p>}
      <PurchasesTable
        items={data?.items ?? []}
        filteredTotalBRL={data?.filteredTotalBRL ?? 'R$ 0,00'}
        grandTotalBRL={data?.grandTotalBRL ?? 'R$ 0,00'}
        totalCount={data?.totalCount ?? 0}
        onTogglePayment={handleTogglePayment}
      />
      <PurchasesPagination page={page} totalPages={totalPages} totalCount={data?.totalCount ?? 0} onPageChange={setPage} />
      {showCreate && <PurchasesModal session={session} onClose={() => setShowCreate(false)} onCreated={() => void loadPurchases()} />}
      {showUpload && <SpreadsheetUploadModal moduleName="compras" session={session} onClose={() => setShowUpload(false)} onCommitted={() => void loadPurchases()} />}
    </div>
  );
}

function PurchasesHeaderActions({
  totalAllCount,
  canWrite,
  onDownload,
  onOpenUpload,
  onOpenCreate,
}: {
  totalAllCount: number;
  canWrite: boolean;
  onDownload: () => void;
  onOpenUpload: () => void;
  onOpenCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <TcgCardStackIcon size={20} className="text-purple-500 dark:text-yellow-400" />
          Minhas Compras (Entrada de Estoque)
        </h2>
        <p className="text-xs text-slate-500 dark:text-purple-300">
          {totalAllCount} itens no estoque · Valores estritamente no padrão BRL (vírgula)
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
        {canWrite && (
          <>
            <button
              type="button"
              data-testid="open-upload-purchases"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 rounded-md border border-purple-500 bg-transparent px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-400 dark:text-purple-200 dark:hover:bg-purple-900/30"
            >
              <Upload size={15} /> Importar Planilha
            </button>
            <button
              type="button"
              data-testid="open-create-purchase"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 rounded-md border-2 border-purple-600 bg-transparent px-3.5 py-2 text-xs font-extrabold text-purple-700 transition hover:bg-purple-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-400/10"
            >
              <PikachuIcon size={16} /> Cadastrar Compra
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PurchasesPagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-purple-300">
      <span>Página {page} de {totalPages} ({totalCount} resultados)</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-purple-700"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-purple-700"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function PurchasesFilterBar({
  q,
  onQChange,
  vendedor,
  onVendedorChange,
  statusPagamento,
  onStatusChange,
  vendedores,
}: {
  q: string;
  onQChange: (v: string) => void;
  vendedor: string;
  onVendedorChange: (v: string) => void;
  statusPagamento: string;
  onStatusChange: (v: string) => void;
  vendedores: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-4 dark:border-purple-800/60 dark:bg-[#1E1035]">
      <div className="relative sm:col-span-2">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          data-testid="search-purchases-input"
          placeholder="Buscar por carta, número ou vendedor..."
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-700"
        />
      </div>
      <select
        data-testid="filter-vendedor-select"
        value={vendedor}
        onChange={(e) => onVendedorChange(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-[#130924]"
      >
        <option value="ALL">Todos os Vendedores</option>
        {vendedores.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <select
        value={statusPagamento}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-[#130924]"
      >
        <option value="ALL">Todos Status Pagamento</option>
        <option value="Pago">Pago</option>
        <option value="Pendente">Pendente</option>
      </select>
    </div>
  );
}

function PurchasesTable({
  items,
  filteredTotalBRL,
  grandTotalBRL,
  totalCount,
  onTogglePayment,
}: {
  items: PurchaseRow[];
  filteredTotalBRL: string;
  grandTotalBRL: string;
  totalCount: number;
  onTogglePayment: (item: PurchaseRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-purple-800/60 dark:bg-[#1E1035]">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600 dark:bg-[#130924] dark:text-purple-200">
            <tr>
              <th className="px-4 py-3">Local / Vendedor</th>
              <th className="px-4 py-3">Descrição da Carta</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Valor Compra</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 transition hover:bg-slate-100/80 dark:border-purple-800/40 dark:hover:bg-purple-800/30"
              >
                <td className="px-4 py-2.5 font-medium">{item.vendedor}</td>
                <td className="px-4 py-2.5">{item.descricao}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 font-semibold text-purple-700 dark:text-purple-200">
                    {item.categoria}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-yellow-300">
                  {item.valorCompraBRL}
                </td>
                <td className="px-4 py-2.5 text-xs">{item.statusEstoque}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onTogglePayment(item)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      item.statusPagamento === 'Pago'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                        : 'bg-amber-500/20 text-amber-600 dark:text-yellow-300'
                    }`}
                  >
                    {item.statusPagamento}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 border-t-2 border-purple-500/40 bg-slate-100 text-xs font-bold dark:bg-[#130924]">
            <tr>
              <td colSpan={3} className="px-4 py-3">
                TOTAL GASTO ({totalCount} itens filtrados)
              </td>
              <td data-testid="purchases-filtered-total" className="px-4 py-3 text-sm text-purple-700 dark:text-yellow-400">
                {filteredTotalBRL}
              </td>
              <td colSpan={2} data-testid="purchases-grand-total" className="px-4 py-3 text-right">
                Total Geral Estoque: {grandTotalBRL}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
