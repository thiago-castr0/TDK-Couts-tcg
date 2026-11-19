'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Printer, Tags, UserPlus, X } from 'lucide-react';
import { PikachuIcon, PokeballIcon, TdkCrownIcon } from '@/components/icons/pokemon-lucide';
import { apiFetch, type ActiveSession } from '@/lib/client-api';

interface EnrichedCustomer {
  id: string;
  nome: string;
  telefone: string;
  handleSocial?: string;
  observacoes?: string;
  totalCompras: number;
  totalGastoBRL: string;
  totalPendenteBRL: string;
  whatsappSummary: string;
}

export function CustomersLabelsTab({ session }: { session: ActiveSession }) {
  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [whatsappModal, setWhatsappModal] = useState<EnrichedCustomer | null>(null);
  const [showLabelsSheet, setShowLabelsSheet] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [labelDate, setLabelDate] = useState('18/11/2026');

  const loadCustomers = useCallback(async () => {
    const res = await apiFetch<{ items: EnrichedCustomer[] }>('/api/customers', session);
    setCustomers(res.items);
    setSelectedIds((prev) => (prev.length === 0 ? res.items.slice(0, 10).map((c) => c.id) : prev));
  }, [session]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id].slice(0, 10)
    );
  }

  const selectedCustomers = customers.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <TdkCrownIcon size={20} className="text-yellow-400" />
            Clientes, Cobrança WhatsApp &amp; Etiquetas TDK (10/folha)
          </h2>
          <p className="text-xs text-slate-500 dark:text-purple-300">
            Selecione até 10 clientes para preencher a folha A4 de etiquetas ou gere a cobrança PIX pelo WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="toggle-labels-sheet"
            onClick={() => setShowLabelsSheet((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-purple-500/60 bg-purple-600/20 px-3 py-2 text-xs font-bold dark:text-yellow-300"
          >
            <Tags size={15} /> {showLabelsSheet ? 'Ocultar Folha de Etiquetas' : 'Gerar 10 Etiquetas A4'}
          </button>
          {session.role !== 'TREASURER' && (
            <button
              type="button"
              onClick={() => setShowNewCustomer(true)}
              className="flex items-center gap-1.5 rounded-md bg-yellow-400 px-3.5 py-2 text-xs font-extrabold text-[#130924] hover:bg-yellow-300"
            >
              <UserPlus size={15} /> Novo Cliente
            </button>
          )}
        </div>
      </div>

      <CustomersTable
        customers={customers}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelection}
        onOpenWhatsApp={setWhatsappModal}
      />

      {showLabelsSheet && (
        <LabelsSheetPreview
          customers={selectedCustomers}
          labelDate={labelDate}
          onDateChange={setLabelDate}
        />
      )}

      {whatsappModal && (
        <WhatsAppChargeModal customer={whatsappModal} onClose={() => setWhatsappModal(null)} />
      )}

      {showNewCustomer && (
        <NewCustomerModal
          session={session}
          onClose={() => setShowNewCustomer(false)}
          onCreated={() => void loadCustomers()}
        />
      )}
    </div>
  );
}

function CustomersTable({
  customers,
  selectedIds,
  onToggleSelect,
  onOpenWhatsApp,
}: {
  customers: EnrichedCustomer[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenWhatsApp: (c: EnrichedCustomer) => void;
}) {
  return (
    <div className="no-print overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-purple-800/60 dark:bg-[#1E1035]">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase dark:bg-[#130924] dark:text-purple-200">
          <tr>
            <th className="px-4 py-3">Etiqueta</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">WhatsApp</th>
            <th className="px-4 py-3">Arremates</th>
            <th className="px-4 py-3">Total Gasto</th>
            <th className="px-4 py-3">Pendente</th>
            <th className="px-4 py-3">Cobrança</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-100/70 dark:border-purple-800/40 dark:hover:bg-purple-800/30">
              <td className="px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => onToggleSelect(c.id)}
                  className="h-4 w-4 accent-yellow-400"
                />
              </td>
              <td className="px-4 py-2.5">
                <p className="font-bold">{c.nome}</p>
                <p className="text-xs text-slate-500 dark:text-purple-300">{c.handleSocial}</p>
              </td>
              <td className="px-4 py-2.5 text-xs">{c.telefone}</td>
              <td className="px-4 py-2.5">{c.totalCompras}</td>
              <td className="px-4 py-2.5 font-semibold">{c.totalGastoBRL}</td>
              <td className="px-4 py-2.5 font-bold text-amber-500">{c.totalPendenteBRL}</td>
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  data-testid={`whatsapp-summary-${c.id}`}
                  onClick={() => onOpenWhatsApp(c)}
                  className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/30"
                >
                  <MessageCircle size={14} /> Gerar Resumo WhatsApp
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LabelsSheetPreview({
  customers,
  labelDate,
  onDateChange,
}: {
  customers: EnrichedCustomer[];
  labelDate: string;
  onDateChange: (v: string) => void;
}) {
  const slots = Array.from({ length: 10 }, (_, idx) => customers[idx] ?? null);

  return (
    <section data-testid="labels-a4-sheet" className="space-y-3 rounded-xl border border-purple-700/60 bg-white p-5 dark:bg-[#1E1035]">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-extrabold dark:text-yellow-400">
            Folha A4 — 10 Etiquetas TDK &amp; COUTS TCG
          </h3>
          <input
            value={labelDate}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Data nas etiquetas"
            className="rounded border border-slate-300 bg-transparent px-2.5 py-1 text-xs dark:border-purple-700"
          />
        </div>
        <div className="flex gap-2">
          <a
            href="/brand/etiquetas_tdk_couts_tcg_10_por_folha.pdf"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-purple-700"
          >
            Ver PDF Base
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md bg-yellow-400 px-3.5 py-1.5 text-xs font-extrabold text-[#130924]"
          >
            <Printer size={14} /> Imprimir 10 Etiquetas
          </button>
        </div>
      </div>

      <div className="print-only-sheet grid grid-cols-1 gap-3 md:grid-cols-2">
        {slots.map((cus, idx) => (
          <div
            key={idx}
            data-testid={`label-slot-${idx}`}
            className="flex items-center gap-3 rounded-lg border-2 border-purple-900 bg-gradient-to-br from-[#1E1035] via-[#2c1555] to-[#130924] p-3 text-white shadow"
          >
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-yellow-400/60 bg-yellow-400/20 text-yellow-300">
              <PikachuIcon size={26} />
              <PokeballIcon size={12} className="mt-0.5 text-red-400" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wide text-yellow-400">
                  TDK &amp; COUTS TCG
                </span>
                <span className="text-[10px] text-purple-200">#{idx + 1}</span>
              </div>
              <div className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-900">
                Nome: {cus ? cus.nome : '________________________'}
              </div>
              <div className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-800">
                Data: {labelDate}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatsAppChargeModal({ customer, onClose }: { customer: EnrichedCustomer; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(customer.whatsappSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-emerald-500/50 bg-white p-5 dark:bg-[#1E1035]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-emerald-400">
            <MessageCircle size={18} /> Resumo WhatsApp — {customer.nome}
          </h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <pre
          data-testid="whatsapp-summary-text"
          className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-sans text-xs leading-relaxed dark:border-purple-700 dark:bg-[#130924]"
        >
          {customer.whatsappSummary}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-xs dark:border-purple-700">
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar Mensagem'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewCustomerModal({ session, onClose, onCreated }: { session: ActiveSession; onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [handleSocial, setHandleSocial] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/customers', session, {
      method: 'POST',
      body: JSON.stringify({ nome, telefone, handleSocial }),
    });
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-purple-700/60 bg-white p-5 dark:bg-[#1E1035]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold dark:text-yellow-400">Cadastrar Cliente</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <input placeholder="Nome completo *" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <input placeholder="WhatsApp (DDD + número) *" value={telefone} onChange={(e) => setTelefone(e.target.value)} required className="w-full rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <input placeholder="Instagram / Nick (@...)" value={handleSocial} onChange={(e) => setHandleSocial(e.target.value)} className="w-full rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-purple-700" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-xs dark:border-purple-700">Cancelar</button>
            <button type="submit" className="rounded bg-yellow-400 px-3.5 py-1.5 text-xs font-bold text-[#130924]">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
