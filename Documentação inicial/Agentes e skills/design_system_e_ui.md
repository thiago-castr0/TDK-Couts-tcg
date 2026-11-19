# Design System & UI/UX Stack

## 1. Frameworks Exigidos
- O frontend deverá ser estilizado *exclusivamente* utilizando o framework **Tailwind CSS**.
- A biblioteca de ícones oficial do projeto é a **Lucide Icons** (`lucide-react`), complementada pelos **ícones temáticos autorais em estilo Lucide** em `@/components/icons/pokemon-lucide.tsx` (`viewBox="0 0 24 24"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"` — ex: `PikachuIcon`, `PokeballIcon`, `MasterballIcon`, `TcgCardStackIcon`, `TdkCrownIcon`, `ThunderboltIcon`). Nenhuma outra biblioteca externa (como FontAwesome ou HeroIcons) deve ser instalada.

## 2. Identidade Visual TDK & COUTS TCG & Temas
- **Dark Mode (TDK Cosmic Purple - Padrão Gamer/TCG):** Fundo Roxo Cósmico profundo (`#0F081D` / `#1A1033`), superfícies translúcidas/slate (`#1E1538`), acentos primários em **Amarelo Pikachu** (`#FACC15`), **Dourado Coroa** (`#F59E0B`), **Roxo Neon** (`#7C3AED`) e **Vermelho Pokébola** (`#EF4444`).
- **Light Mode (Pokédex Clean):** Alternância imediata via toggle no cabeçalho para ambientes claros (`#F8FAFC` / `#FFFFFF`), preservando alto contraste para tabelas financeiras e acentos da marca.

## 3. Princípios Visuais e Componentização
- **Estética Limpa e Moderna:** Seguir o padrão de design introduzido por bibliotecas como o **Shadcn UI** (bordas arredondadas suaves `rounded-md`, uso extensivo de `ring-offset` para foco de acessibilidade, cores neutras/roxas de alto contraste).
- **Data Grids (Tabelas):** Devem possuir *hover states* nas linhas (`hover:bg-muted/60`), paginação clara e cabeçalhos fixos (`sticky top-0`) para lidar com longas listas de cartas (ex: +340 compras).
- **Filtros:** Sempre posicionados no topo das tabelas, utilizando inputs de busca com o ícone de lupa (`Search` do Lucide) e select dropdowns integrados.
- **Responsividade:** Todas as telas devem utilizar as diretivas de grid e flexbox do Tailwind (`sm:`, `md:`, `lg:`) para funcionar tanto em monitores ultrawide (onde as planilhas ficarão enormes) quanto em dispositivos móveis.