'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { PikachuIcon, ThunderboltIcon } from '@/components/icons/pokemon-lucide';
import { apiFetch, type ActiveSession } from '@/lib/client-api';
import { sanitizeBRLInput } from '@/lib/currency-brl';
import type { BidSuggestion, CardCategory, CardCondition, PokemonCardCatalogItem } from '@/types/tcg';

interface PurchasesModalProps {
  session: ActiveSession;
  onClose: () => void;
  onCreated: () => void;
}

async function submitNewPurchase(
  session: ActiveSession,
  payload: {
    vendedor: string;
    descricao: string;
    valorBRL: string;
    valorLigaBRL: string;
    categoria: CardCategory;
    condicao: CardCondition;
    imagemUrl: string;
    statusPagamento: 'Pago' | 'Pendente';
  }
) {
  await apiFetch('/api/purchases', session, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      valorLigaBRL: payload.valorLigaBRL || null,
      imagemUrl: payload.imagemUrl || undefined,
    }),
  });
}

export function PurchasesModal({ session, onClose, onCreated }: PurchasesModalProps) {
  const [vendedor, setVendedor] = useState('Smarthie TCG');
  const [descricao, setDescricao] = useState('');
  const [valorBRL, setValorBRL] = useState('');
  const [valorLigaBRL, setValorLigaBRL] = useState('');
  const [categoria, setCategoria] = useState<CardCategory>('AVULSA');
  const [condicao, setCondicao] = useState<CardCondition>('NM');
  const [statusPagamento, setStatusPagamento] = useState<'Pago' | 'Pendente'>('Pago');
  const [imagemUrl, setImagemUrl] = useState('');
  const [suggestions, setSuggestions] = useState<PokemonCardCatalogItem[]>([]);
  const [bidPreview, setBidPreview] = useState<BidSuggestion | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCardSearch(text: string, ligaVal: string, cat: CardCategory) {
    try {
      const params = new URLSearchParams({ q: text, categoria: cat });
      if (ligaVal) params.set('valorLiga', ligaVal);
      const res = await apiFetch<{ cards: PokemonCardCatalogItem[]; bidSuggestion: BidSuggestion | null }>(
        `/api/pokemon-tcg/search?${params.toString()}`,
        session
      );
      setSuggestions(text.trim().length >= 2 ? res.cards : []);
      setBidPreview(res.bidSuggestion);
    } catch {
      setSuggestions([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await submitNewPurchase(session, { vendedor, descricao, valorBRL, valorLigaBRL, categoria, condicao, imagemUrl, statusPagamento });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar compra.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-purple-700/60 bg-white p-6 shadow-2xl dark:bg-[#1E1035]">
        <PurchaseModalHeader onClose={onClose} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PurchasePrimaryFields
              vendedor={vendedor}
              setVendedor={setVendedor}
              descricao={descricao}
              onDescricaoChange={(val) => { setDescricao(val); void handleCardSearch(val, valorLigaBRL, categoria); }}
              valorBRL={valorBRL}
              setValorBRL={(v) => setValorBRL(sanitizeBRLInput(v))}
            />
            <PurchaseSecondaryFields
              valorLigaBRL={valorLigaBRL}
              onValorLigaChange={(v) => { const clean = sanitizeBRLInput(v); setValorLigaBRL(clean); void handleCardSearch(descricao, clean, categoria); }}
              categoria={categoria}
              onCategoriaChange={(c) => { setCategoria(c); void handleCardSearch(descricao, valorLigaBRL, c); }}
              condicao={condicao}
              setCondicao={setCondicao}
              statusPagamento={statusPagamento}
              setStatusPagamento={setStatusPagamento}
            />
          </div>
          <AutocompleteSuggestionsBox suggestions={suggestions} onSelect={(card) => { setDescricao(card.displayLabel); setImagemUrl(card.imageUrl); setSuggestions([]); }} />
          {bidPreview && <BidPreviewBox bidPreview={bidPreview} />}
          {error && <p className="rounded bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400">{error}</p>}
          <PurchaseModalFooter saving={saving} onClose={onClose} />
        </form>
      </div>
    </div>
  );
}

function PurchaseModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-lg font-extrabold dark:text-yellow-400">
        <PikachuIcon size={22} /> Cadastrar Nova Compra
      </h3>
      <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-purple-900">
        <X size={18} />
      </button>
    </div>
  );
}

function PurchaseModalFooter({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm dark:border-purple-700">
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        data-testid="submit-new-purchase"
        className="flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold text-[#130924] transition hover:bg-yellow-300 disabled:opacity-60"
      >
        <PikachuIcon size={16} />
        {saving ? 'Salvando...' : 'Salvar Compra'}
      </button>
    </div>
  );
}

function PurchasePrimaryFields(props: {
  vendedor: string;
  setVendedor: (v: string) => void;
  descricao: string;
  onDescricaoChange: (v: string) => void;
  valorBRL: string;
  setValorBRL: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold">Local / Vendedor *</label>
        <input
          data-testid="input-purchase-vendedor"
          value={props.vendedor}
          onChange={(e) => props.setVendedor(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-700"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">Valor de Compra (R$ com vírgula) *</label>
        <input
          data-testid="input-purchase-valor"
          placeholder="Ex: 30,50"
          value={props.valorBRL}
          onChange={(e) => props.setValorBRL(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-700"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold">Descrição da Carta ou Lote *</label>
        <input
          data-testid="input-purchase-descricao"
          placeholder="Digite para buscar na Pokédex TCG (ex: Pikachu, Charizard...)"
          value={props.descricao}
          onChange={(e) => props.onDescricaoChange(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-700"
        />
      </div>
    </>
  );
}

function PurchaseSecondaryFields(props: {
  valorLigaBRL: string;
  onValorLigaChange: (v: string) => void;
  categoria: CardCategory;
  onCategoriaChange: (v: CardCategory) => void;
  condicao: CardCondition;
  setCondicao: (v: CardCondition) => void;
  statusPagamento: 'Pago' | 'Pendente';
  setStatusPagamento: (v: 'Pago' | 'Pendente') => void;
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold">Categoria</label>
        <select
          value={props.categoria}
          onChange={(e) => props.onCategoriaChange(e.target.value as CardCategory)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-[#130924]"
        >
          <option value="AVULSA">Carta Avulsa</option>
          <option value="EX_ESPECIAL">EX / Full Art / Especial</option>
          <option value="BORDA_AMARELA">Borda Amarela</option>
          <option value="KIT_8_AMARELA">Kit 8 Cartas Borda Amarela</option>
          <option value="KIT_15_CINZA">Kit 15 Cartas Borda Cinza</option>
          <option value="LOTE_COMPRA">Lote Fechado / Deck</option>
          <option value="LACRADO">Produto Lacrado</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">Valor Liga Pokémon (Opcional)</label>
        <input
          placeholder="Ex: 48,00 (calcula lance)"
          value={props.valorLigaBRL}
          onChange={(e) => props.onValorLigaChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-700"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">Condição</label>
        <select
          value={props.condicao}
          onChange={(e) => props.setCondicao(e.target.value as CardCondition)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-[#130924]"
        >
          <option value="NM">NM (Near Mint)</option>
          <option value="SP">SP (Slightly Played)</option>
          <option value="MP">MP (Moderately Played)</option>
          <option value="HP">HP (Heavily Played)</option>
          <option value="D">D (Damaged)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">Status Pagamento</label>
        <select
          value={props.statusPagamento}
          onChange={(e) => props.setStatusPagamento(e.target.value as 'Pago' | 'Pendente')}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-[#130924]"
        >
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
        </select>
      </div>
    </>
  );
}

function AutocompleteSuggestionsBox({
  suggestions,
  onSelect,
}: {
  suggestions: PokemonCardCatalogItem[];
  onSelect: (card: PokemonCardCatalogItem) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="max-h-36 overflow-y-auto rounded-md border border-purple-500/40 bg-slate-50 p-2 dark:bg-[#130924]">
      <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-purple-500 dark:text-yellow-300">
        <Search size={12} /> Autocomplete Pokémon TCG
      </p>
      {suggestions.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onSelect(card)}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-purple-600/20"
        >
          {card.imageUrl && <img src={card.imageUrl} alt={card.name} className="h-8 w-6 rounded object-cover" />}
          <span>{card.displayLabel}</span>
        </button>
      ))}
    </div>
  );
}

function BidPreviewBox({ bidPreview }: { bidPreview: BidSuggestion }) {
  return (
    <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-yellow-300">
        <ThunderboltIcon size={14} /> Sugestão de Lance (Liga {bidPreview.valorLigaBRL}):
      </p>
      <p className="mt-1">
        Inicial: <strong>{bidPreview.lanceInicialBRL}</strong> · Incremento: <strong>+{bidPreview.incrementoBRL}</strong>
      </p>
      <p className="text-slate-500 dark:text-purple-200">
        Próximos lances: {bidPreview.proximosLancesBRL.join(' → ')}
      </p>
    </div>
  );
}
