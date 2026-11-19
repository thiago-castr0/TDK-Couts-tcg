import { formatCentavosToBRL } from '@/lib/currency-brl';
import type { Auction, MatchSuggestion, Purchase, Sale, UserProfile } from '@/types/tcg';

const STOP_WORDS = new Set(['pt', 'en', 'nm', 'sp', 'mp', 'hp', 'de', 'da', 'do', 'foil', 'reverse', 'pokeball', 'carta', 'kit']);

export function normalizeCardText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractCardNumber(text: string): string | null {
  const match = text.match(/(\d{1,3}\/\d{2,3})/);
  return match ? match[1] : null;
}

function tokenizeCard(text: string): Set<string> {
  const tokens = normalizeCardText(text).split(' ');
  return new Set(tokens.filter((t) => t.length >= 2 && !STOP_WORDS.has(t)));
}

export function computeSimilarityScore(purchaseDesc: string, saleDesc: string): number {
  const pCode = extractCardNumber(purchaseDesc);
  const sCode = extractCardNumber(saleDesc);
  const codeBonus = pCode && sCode && pCode === sCode ? 0.5 : 0;

  const pTokens = tokenizeCard(purchaseDesc);
  const sTokens = tokenizeCard(saleDesc);
  if (pTokens.size === 0 || sTokens.size === 0) return codeBonus;

  let intersection = 0;
  pTokens.forEach((tok) => {
    if (sTokens.has(tok)) intersection += 1;
  });
  const union = new Set([...pTokens, ...sTokens]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  return Math.min(1, Number((codeBonus + jaccard * (codeBonus > 0 ? 0.5 : 1)).toFixed(2)));
}

export function crossReferenceAccounting(
  purchases: Purchase[],
  sales: Sale[]
): MatchSuggestion[] {
  const pendingSales = sales.filter((s) => s.statusConciliacao === 'Pendente');
  const availablePurchases = purchases.filter((p) => p.statusEstoque !== 'Vendido');
  const suggestions: MatchSuggestion[] = [];

  for (const sale of pendingSales) {
    const scored = availablePurchases
      .map((purchase) => ({
        purchase,
        score: computeSimilarityScore(purchase.descricao, sale.descricao),
      }))
      .filter((item) => item.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const item of scored) {
      const disponivel = Math.max(0, item.purchase.valorCompraCentavos - item.purchase.valorAlocadoCentavos);
      const custoRef = item.purchase.categoria === 'LOTE_COMPRA' ? Math.min(disponivel, sale.valorArremateCentavos) : item.purchase.valorCompraCentavos;
      const lucro = sale.valorArremateCentavos - custoRef;
      suggestions.push({
        saleId: sale.id,
        saleDescricao: sale.descricao,
        saleValorBRL: formatCentavosToBRL(sale.valorArremateCentavos, true),
        purchaseId: item.purchase.id,
        purchaseDescricao: item.purchase.descricao,
        purchaseVendedor: item.purchase.vendedor,
        purchaseValorBRL: formatCentavosToBRL(item.purchase.valorCompraCentavos, true),
        purchaseDisponivelCentavos: disponivel,
        score: item.score,
        lucroEstimadoCentavos: lucro,
        lucroEstimadoBRL: formatCentavosToBRL(lucro, true),
      });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

export interface PartnerTreasurySummary {
  profileId: string;
  responsavelNome: string;
  pixKey: string;
  totalLeiloes: number;
  totalEsperadoCentavos: number;
  totalEsperadoBRL: string;
  totalArrematadoCentavos: number;
  totalArrematadoBRL: string;
  totalPagoPixCentavos: number;
  totalPagoPixBRL: string;
  totalPendenteCentavos: number;
  totalPendenteBRL: string;
  custoVinculadoCentavos: number;
  custoVinculadoBRL: string;
  lucroLiquidoCentavos: number;
  lucroLiquidoBRL: string;
  repasseSugeridoCentavos: number;
  repasseSugeridoBRL: string;
}

export function calculateTreasuryPayouts(
  auctions: Auction[],
  sales: Sale[],
  profiles: UserProfile[]
): PartnerTreasurySummary[] {
  const partnerMap = new Map<string, PartnerTreasurySummary>();

  for (const profile of profiles.filter((p) => p.role !== 'TREASURER')) {
    partnerMap.set(profile.id, {
      profileId: profile.id,
      responsavelNome: profile.nome,
      pixKey: profile.pixKey,
      totalLeiloes: 0,
      totalEsperadoCentavos: 0,
      totalEsperadoBRL: '0,00',
      totalArrematadoCentavos: 0,
      totalArrematadoBRL: '0,00',
      totalPagoPixCentavos: 0,
      totalPagoPixBRL: '0,00',
      totalPendenteCentavos: 0,
      totalPendenteBRL: '0,00',
      custoVinculadoCentavos: 0,
      custoVinculadoBRL: '0,00',
      lucroLiquidoCentavos: 0,
      lucroLiquidoBRL: '0,00',
      repasseSugeridoCentavos: 0,
      repasseSugeridoBRL: '0,00',
    });
  }

  for (const auction of auctions) {
    const entry = partnerMap.get(auction.responsavelId);
    if (!entry) continue;
    const auctionSales = sales.filter((s) => s.auctionId === auction.id);
    const arrematado = auctionSales.reduce((acc, s) => acc + s.valorArremateCentavos, 0) || auction.totalArrematadoCentavos;
    const pago = auctionSales.filter((s) => s.statusPagamento === 'Pago').reduce((acc, s) => acc + s.valorArremateCentavos, 0);
    const custo = auctionSales.reduce((acc, s) => acc + s.custoVinculadoCentavos, 0);
    const lucro = auctionSales.reduce((acc, s) => acc + (s.statusConciliacao === 'Conciliado' ? s.lucroCentavos : 0), 0);

    entry.totalLeiloes += 1;
    entry.totalEsperadoCentavos += auction.totalEsperadoCentavos;
    entry.totalArrematadoCentavos += arrematado;
    entry.totalPagoPixCentavos += pago;
    entry.totalPendenteCentavos += Math.max(0, arrematado - pago);
    entry.custoVinculadoCentavos += custo;
    entry.lucroLiquidoCentavos += lucro;
    entry.repasseSugeridoCentavos += pago;
  }

  return Array.from(partnerMap.values()).map((row) => ({
    ...row,
    totalEsperadoBRL: formatCentavosToBRL(row.totalEsperadoCentavos, true),
    totalArrematadoBRL: formatCentavosToBRL(row.totalArrematadoCentavos, true),
    totalPagoPixBRL: formatCentavosToBRL(row.totalPagoPixCentavos, true),
    totalPendenteBRL: formatCentavosToBRL(row.totalPendenteCentavos, true),
    custoVinculadoBRL: formatCentavosToBRL(row.custoVinculadoCentavos, true),
    lucroLiquidoBRL: formatCentavosToBRL(row.lucroLiquidoCentavos, true),
    repasseSugeridoBRL: formatCentavosToBRL(row.repasseSugeridoCentavos, true),
  }));
}
