# Skills (Habilidades) Necessárias para os Agentes

As seguintes habilidades (tools/functions) devem ser providenciadas ao ambiente Antigravity para os agentes executarem o projeto:

## Skill: `Generate_Excel_Template`

* **Descrição:** Gera um arquivo de modelo (.xlsx) com cabeçalhos pré-definidos bloqueados na primeira linha. **Obrigatório:** A coluna de valores deve ser pré-formatada para moeda brasileira (Contábil/BRL), garantindo o uso da vírgula para decimais.
* **Entrada:** Nome do Módulo (ex: "compras", "vendas").
* **Saída:** Arquivo Buffer (XLSX).

## Skill: `Parse_Excel_To_JSON`

* **Descrição:** Lê um arquivo de planilha carregado pelo usuário e converte para um array de objetos JSON manipulável pelo código. Deve conter sanitização para entender que vírgula (,) é o separador decimal.
* **Entrada:** Arquivo `.xlsx` ou `.csv`.
* **Saída:** Array de JSON contendo os valores respeitando o input visual do usuário (ex: `[{ "descricao": "Pikachu", "valor": "30,50" }]`).

## Skill: `Cross_Reference_Accounting`

* **Descrição:** Cruza os arrays do banco de dados de Entradas (Compras) e Saídas (Arremates) usando algoritmos de similaridade de texto na "Descrição da carta".
* **Entrada:** ID do Leilão.
* **Saída:** Relatório de Lucro e sugestões de Match.

## Skill: `Calculate_Treasury_Payouts`

* **Descrição:** Agrega os valores financeiros baseado no responsável (Sócio) e no status do repasse.
* **Entrada:** Mês de referência e ID do Sócio.
* **Saída:** Total a receber, Total arrecadado, Total de lucro daquele sócio (formatados em BRL com vírgula).

## Skill: `Web_Pokemon_UX_Benchmark`

* **Descrição:** Realiza pesquisa e curadoria de padrões UI/UX no universo Pokémon (Pokédex UI, Pokémon TCG Pocket, LigaPokémon) e traduz para componentes Tailwind CSS + Shadcn UI mantendo a identidade TDK & COUTS TCG (Roxo Cósmico + Amarelo Pikachu).
* **Entrada:** Módulo ou fluxo da interface a ser desenhado.
* **Saída:** Diretrizes visuais, paleta, micro-interações e hierarquia de dados.

## Skill: `Pokemon_Lucide_Icon_Craft`

* **Descrição:** Cria componentes SVG customizados seguindo estritamente as diretrizes geométricas da biblioteca Lucide (`viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`), como `PikachuIcon`, `PokeballIcon`, `MasterballIcon`, `TcgCardStackIcon`, `TdkCrownIcon` e `ThunderboltIcon`.
* **Entrada:** Nome e contexto de uso do ícone temático.
* **Saída:** Componente React tipado em `@/components/icons/pokemon-lucide.tsx`.

## Skill: `TCG_Market_Intelligence`

* **Descrição:** Mapeia e padroniza nomenclaturas, condições de cartas (`NM`, `SP`, `MP`, `HP`, `D`), raridades (`RR`, `AR`, `SIR`, `UR`, `Promo`, `Pokéball Foil`, `Reverse Foil`) e integra busca na API `pokemontcg.io` para autocomplete e imagens reais.
* **Entrada:** Termo de busca da carta ou regra de mercado.
* **Saída:** Metadados padronizados, foto oficial da carta e tags de mercado.

## Skill: `Calculate_Suggested_Bids`

* **Descrição:** Implementa a tabela oficial de "Padronização de Lances - TDK & COUTS TCG" baseada no valor de referência da Liga Pokémon e categoria (Avulsa, EX/Especial, Lacrado, Kit 8 Borda Amarela, Kit 15 Borda Cinza).
* **Entrada:** Valor de referência Liga Pokémon (BRL) e Categoria da carta/kit.
* **Saída:** Lance inicial sugerido, próximo incremento (`R$ 1,00` ou `R$ 2,00`) e sequência de lances em formato BRL com vírgula.

## Skill: `Generate_Shipping_Labels_PDF`

* **Descrição:** Gera folha A4 com 10 etiquetas personalizadas no layout oficial TDK & COUTS TCG preenchidas automaticamente com o `Nome` do cliente arrematante e a `Data` do leilão/envio, prontas para impressão.
* **Entrada:** Lista de clientes/datas selecionados (até 10 slots por folha).
* **Saída:** Layout imprimível A4 / PDF com 10 etiquetas TDK & COUTS TCG.