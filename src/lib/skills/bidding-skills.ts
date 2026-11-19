import { formatCentavosToBRL } from '@/lib/currency-brl';
import type { BidSuggestion, CardCategory } from '@/types/tcg';

/**
 * Calcula o lance inicial e a progressão oficial da tabela
 * "TDK & COUTS TCG - Padronização de Lances".
 */
export function calculateSuggestedBid(
  valorLigaCentavos: number,
  categoria: CardCategory
): BidSuggestion {
  if (categoria === 'BORDA_AMARELA') {
    return buildBidSuggestion(categoria, valorLigaCentavos, 100, 100, 'Cartas de Borda Amarela (Avulsas): lance inicial R$ 1,00 e incremento de R$ 1,00.');
  }
  if (categoria === 'KIT_15_CINZA') {
    return buildBidSuggestion(categoria, valorLigaCentavos, 500, 200, 'Kit 15 Cartas Borda Cinza: lance inicial R$ 5,00 e incremento de R$ 2,00.');
  }
  if (categoria === 'KIT_8_AMARELA') {
    const base = valorLigaCentavos > 200 ? Math.max(600, Math.floor((valorLigaCentavos - 200) / 100) * 100) : 600;
    return buildBidSuggestion(categoria, valorLigaCentavos, base, 200, 'Kit 8 Cartas Borda Amarela: valores sugeridos R$ 6,00 a R$ 12,00 (R$ 1,00 a R$ 2,00 abaixo da Liga).');
  }

  const descontoCentavos = valorLigaCentavos >= 1000 ? 200 : 100;
  const rawInitial = Math.max(100, valorLigaCentavos - descontoCentavos);
  const roundedInitial = Math.max(100, Math.floor(rawInitial / 100) * 100);
  const incremento = roundedInitial <= 100 ? 100 : 200;

  return buildBidSuggestion(
    categoria,
    valorLigaCentavos,
    roundedInitial,
    incremento,
    incremento === 100
      ? 'Lance inicial R$ 1,00 (abaixo da Liga Pokémon): próximos lances de R$ 1,00 em R$ 1,00.'
      : 'Lance inicial >= R$ 2,00 (R$ 1,00 a R$ 2,00 abaixo da Liga Pokémon): próximos lances de R$ 2,00 em R$ 2,00.'
  );
}

function buildBidSuggestion(
  categoria: CardCategory,
  valorLigaCentavos: number,
  lanceInicialCentavos: number,
  incrementoCentavos: number,
  regraAplicada: string
): BidSuggestion {
  const proximos = [1, 2, 3, 4, 5].map((step) =>
    formatCentavosToBRL(lanceInicialCentavos + step * incrementoCentavos, true)
  );
  return {
    categoria,
    valorLigaBRL: formatCentavosToBRL(valorLigaCentavos, true),
    lanceInicialCentavos,
    lanceInicialBRL: formatCentavosToBRL(lanceInicialCentavos, true),
    incrementoCentavos,
    incrementoBRL: formatCentavosToBRL(incrementoCentavos, true),
    proximosLancesBRL: proximos,
    regraAplicada,
  };
}
