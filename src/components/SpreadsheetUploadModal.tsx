'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { PokeballIcon } from '@/components/icons/pokemon-lucide';
import { apiFetch, type ActiveSession } from '@/lib/client-api';
import type { ParsedPurchaseDraftRow, ParsedSaleDraftRow, ParsedSpreadsheetResult } from '@/types/tcg';

interface SpreadsheetUploadModalProps {
  moduleName: 'compras' | 'vendas';
  session: ActiveSession;
  onClose: () => void;
  onCommitted: () => void;
}

export function SpreadsheetUploadModal({
  moduleName,
  session,
  onClose,
  onCommitted,
}: SpreadsheetUploadModalProps) {
  const [draft, setDraft] = useState<ParsedSpreadsheetResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('module', moduleName);
      const parsed = await apiFetch<ParsedSpreadsheetResult>('/api/spreadsheets/parse', session, {
        method: 'POST',
        body: formData,
      });
      setDraft(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler planilha.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmBulkInsert() {
    if (!draft || draft.validRows.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = moduleName === 'compras' ? '/api/purchases' : '/api/sales';
      const rows = mapDraftRowsForApi(moduleName, draft.validRows);
      await apiFetch(endpoint, session, { method: 'POST', body: JSON.stringify({ rows }) });
      onCommitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gravar lote.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-purple-700/60 bg-white p-6 shadow-2xl dark:bg-[#1E1035]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-extrabold dark:text-yellow-400">
            <FileSpreadsheet size={20} /> Importar Planilha ({moduleName === 'compras' ? 'Compras' : 'Arremates'})
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-purple-900">
            <X size={18} />
          </button>
        </div>

        <SpreadsheetDropzone onFileSelect={handleFileSelect} />
        {error && <p className="mt-3 rounded-md bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400">{error}</p>}
        {draft && <DraftSummaryAndPreview draft={draft} moduleName={moduleName} />}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-transparent px-4 py-2 text-sm text-slate-700 dark:border-purple-700 dark:text-purple-200">
            Fechar
          </button>
          <button
            type="button"
            disabled={!draft || draft.validRows.length === 0 || loading}
            data-testid="confirm-bulk-insert"
            onClick={() => void handleConfirmBulkInsert()}
            className="flex items-center gap-2 rounded-md border-2 border-purple-600 bg-transparent px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:opacity-50 dark:border-yellow-400 dark:text-yellow-300 dark:hover:bg-yellow-400/10"
          >
            <PokeballIcon size={16} />
            {loading ? 'Processando...' : `Confirmar ${draft?.validRows.length ?? 0} Linha(s) Válida(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function mapDraftRowsForApi(
  moduleName: 'compras' | 'vendas',
  validRows: ParsedSpreadsheetResult['validRows']
) {
  if (moduleName === 'compras') {
    return (validRows as ParsedPurchaseDraftRow[]).map((r) => ({
      vendedor: r.vendedor,
      descricao: r.descricao,
      valorBRL: r.valorBRL,
      statusPagamento: r.statusPagamento,
      categoria: r.categoria,
    }));
  }
  return (validRows as ParsedSaleDraftRow[]).map((r) => ({
    compradorNome: r.compradorNome,
    compradorTelefone: r.compradorTelefone,
    leilaoNome: r.leilaoNome,
    descricao: r.descricao,
    valorArremateBRL: r.valorBRL,
    statusPagamento: r.statusPagamento,
  }));
}

function SpreadsheetDropzone({ onFileSelect }: { onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-500/50 p-6 text-center transition hover:bg-purple-500/10">
      <Upload size={26} className="mb-2 text-purple-500 dark:text-yellow-400" />
      <span className="text-sm font-semibold">Selecione arquivo .csv, .xls ou .xlsx (máx. 5 MB)</span>
      <span className="mt-1 text-xs text-slate-500 dark:text-purple-300">
        Processamento resiliente: linhas inválidas são reportadas sem perder as válidas.
      </span>
      <input
        data-testid="spreadsheet-file-input"
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={onFileSelect}
        className="hidden"
      />
    </label>
  );
}

function DraftSummaryAndPreview({
  draft,
  moduleName,
}: {
  draft: ParsedSpreadsheetResult;
  moduleName: 'compras' | 'vendas';
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-400">
          <CheckCircle2 size={14} /> Válidas: {draft.summary.validCount}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 font-bold text-red-400">
          <AlertCircle size={14} /> Com Erro: {draft.summary.errorCount}
        </span>
        <span className="rounded-full bg-purple-500/20 px-3 py-1 font-bold dark:text-yellow-300">
          Soma Válida: R$ {draft.summary.totalValorBRL}
        </span>
      </div>

      {draft.errors.length > 0 && (
        <div data-testid="spreadsheet-error-report" className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs">
          <p className="mb-1.5 font-bold text-red-400">Relatório de Erros por Linha (linhas válidas preservadas):</p>
          <ul className="space-y-1">
            {draft.errors.map((err, i) => (
              <li key={`${err.row}-${i}`}>
                <strong>Linha {err.row}</strong> ({err.column} = &quot;{err.value}&quot;): {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {draft.validRows.length > 0 && (
        <div className="max-h-56 overflow-auto rounded-md border border-slate-200 dark:border-purple-800/60">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#130924]">
              <tr>
                <th className="px-3 py-2">Linha</th>
                <th className="px-3 py-2">{moduleName === 'compras' ? 'Vendedor' : 'Comprador'}</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Valor (BRL)</th>
              </tr>
            </thead>
            <tbody>
              {draft.validRows.slice(0, 50).map((row) => (
                <tr key={row.rowNumber} className="border-t border-slate-100 dark:border-purple-800/40">
                  <td className="px-3 py-1.5">{row.rowNumber}</td>
                  <td className="px-3 py-1.5">
                    {moduleName === 'compras'
                      ? (row as ParsedPurchaseDraftRow).vendedor
                      : (row as ParsedSaleDraftRow).compradorNome}
                  </td>
                  <td className="px-3 py-1.5">{row.descricao}</td>
                  <td className="px-3 py-1.5 font-semibold">R$ {row.valorBRL}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
