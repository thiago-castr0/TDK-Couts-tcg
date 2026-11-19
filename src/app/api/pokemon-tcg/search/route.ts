import { NextResponse } from 'next/server';
import { parseBRLToCentavos } from '@/lib/currency-brl';
import { searchPokemonCards } from '@/lib/pokemon-catalog';
import { verifyRBAC } from '@/lib/rbac';
import { calculateSuggestedBid } from '@/lib/skills/bidding-skills';
import type { CardCategory } from '@/types/tcg';

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? '';
  const valorLigaRaw = searchParams.get('valorLiga');
  const categoria = (searchParams.get('categoria') ?? 'AVULSA') as CardCategory;

  const cards = await searchPokemonCards(query);
  let bidSuggestion = null;
  if (valorLigaRaw) {
    const centavos = parseBRLToCentavos(valorLigaRaw);
    if (centavos !== null) {
      bidSuggestion = calculateSuggestedBid(centavos, categoria);
    }
  }

  return NextResponse.json({ cards, bidSuggestion });
}
