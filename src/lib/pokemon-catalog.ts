import type { PokemonCardCatalogItem } from '@/types/tcg';

export const LOCAL_POKEMON_CATALOG: PokemonCardCatalogItem[] = [
  {
    id: 'sv1-198',
    name: 'Pikachu ex',
    number: '054',
    setTotal: '128',
    setName: '30 Anos / Scarlet & Violet',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv8/57.png',
    displayLabel: 'Pikachu ex (054/128) - RR',
  },
  {
    id: 'sv1-yanmega',
    name: 'Yanmega ex',
    number: '003',
    setTotal: '182',
    setName: 'Destined Rivals / Paradox',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv10/3.png',
    displayLabel: 'Yanmega ex (003/182) - RR',
  },
  {
    id: 'sv1-ampharos',
    name: 'Ampharos',
    number: '090',
    setTotal: '086',
    setName: 'Special Illustration / AR',
    rarity: 'Art Rare (AR)',
    imageUrl: 'https://images.pokemontcg.io/sv1/66.png',
    displayLabel: 'Ampharos (090/086) - AR',
  },
  {
    id: 'sv1-genesect',
    name: 'Genesect ex',
    number: '067',
    setTotal: '086',
    setName: 'Black Bolt / White Flare',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv5/111.png',
    displayLabel: 'Genesect ex (067/086) - RR',
  },
  {
    id: 'sv1-charizard',
    name: 'Mega Charizard X ex',
    number: '013',
    setTotal: '094',
    setName: 'Phantasmal Flames (PFL)',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv3/125.png',
    displayLabel: 'Mega Charizard X ex (013/094) - RR',
  },
  {
    id: 'sv1-mew',
    name: 'Mew ex',
    number: '066',
    setTotal: '128',
    setName: 'Pokémon 151 / 30 Anos',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/151.png',
    displayLabel: 'Mew ex (066/128) - RR',
  },
  {
    id: 'sv1-mewtwo',
    name: 'Mewtwo ex',
    number: '064',
    setTotal: '128',
    setName: '30 Anos / Evolutions',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv4/58.png',
    displayLabel: 'Mewtwo ex (064/128) - RR',
  },
  {
    id: 'sv1-gengar',
    name: 'Gengar ex',
    number: '090',
    setTotal: '128',
    setName: 'Temporal Forces / 30 Anos',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv5/104.png',
    displayLabel: 'Gengar ex (090/128) - RR',
  },
  {
    id: 'sv1-umbreon',
    name: 'Umbreon ex',
    number: '091',
    setTotal: '128',
    setName: 'Prismatic Evolutions',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/60.png',
    displayLabel: 'Umbreon ex (091/128) - RR',
  },
  {
    id: 'sv1-sylveon',
    name: 'Sylveon ex',
    number: '071',
    setTotal: '128',
    setName: 'Prismatic Evolutions',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/41.png',
    displayLabel: 'Sylveon ex (071/128) - RR',
  },
  {
    id: 'sv1-greninja',
    name: 'Greninja ex',
    number: '021',
    setTotal: '128',
    setName: 'Twilight Masquerade',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv6/106.png',
    displayLabel: 'Greninja ex (021/128) - RR',
  },
  {
    id: 'sv1-eevee',
    name: 'Eevee ex',
    number: '118',
    setTotal: '128',
    setName: 'Prismatic Evolutions',
    rarity: 'Double Rare (RR)',
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/75.png',
    displayLabel: 'Eevee ex (118/128) - RR',
  },
];

export async function searchPokemonCards(query: string): Promise<PokemonCardCatalogItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return LOCAL_POKEMON_CATALOG.slice(0, 6);

  const localMatches = LOCAL_POKEMON_CATALOG.filter(
    (card) =>
      card.name.toLowerCase().includes(q) ||
      card.number.includes(q) ||
      card.displayLabel.toLowerCase().includes(q)
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(q)}*&pageSize=6`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return localMatches;
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name: string;
        number: string;
        rarity?: string;
        images?: { small?: string };
        set?: { name?: string; printedTotal?: number };
      }>;
    };
    const remote: PokemonCardCatalogItem[] = (json.data ?? []).map((item) => {
      const total = String(item.set?.printedTotal ?? '150').padStart(3, '0');
      const num = item.number.padStart(3, '0');
      return {
        id: item.id,
        name: item.name,
        number: num,
        setTotal: total,
        setName: item.set?.name ?? 'Pokémon TCG',
        rarity: item.rarity ?? 'Standard',
        imageUrl: item.images?.small ?? '',
        displayLabel: `${item.name} (${num}/${total}) - ${item.set?.name ?? ''}`,
      };
    });
    const combined = [...localMatches, ...remote];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 8);
  } catch {
    return localMatches;
  }
}
