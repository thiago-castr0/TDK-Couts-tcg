# Checkpoint do Projeto — TDK & COUTS TCG (Plataforma de Gestão de Leilões)

**Última Atualização:** 21/11/2026 às 20:03 (UTC-3)  
**Orquestrador:** `@AgenteOrquestrador (Tech Lead)`  
**Workspace:** `d:\Projetos\TDK-Couts-tcg-app`  
**Repositório GitHub:** `https://github.com/thiago-castr0/TDK-Couts-tcg.git` (branch `main`)  
**Projeto Supabase:** `tdk-card-games` (`project_id`: `lafvgkbxmxwhvgiwnxgp` | URL: `https://lafvgkbxmxwhvgiwnxgp.supabase.co`)  
**Projeto Netlify:** `tdk-couts-tcg` (`siteId`: `dd321459-4a29-4b98-897f-1b4fb2078375` | Dashboard: `https://app.netlify.com/projects/tdk-couts-tcg`)

---

## 1. O que já foi implantado e validado

### A. Documentação, Agentes e Skills
- Mantida íntegra toda a pasta `Documentação inicial/` e ativos originais.
- Criados os novos agentes solicitados:
  - `Documentação inicial/Agentes e skills/agente_ux_ui_benchmark.md` (`@AgenteUXBenchmark`)
  - `Documentação inicial/Agentes e skills/agente_market_discovery.md` (`@AgenteMarketDiscovery`)
- Atualizados `Documentação inicial/Agentes e skills/skills_e_habilidades.md` e `Documentação inicial/Agentes e skills/design_system_e_ui.md` com as novas skills (`Web_Pokemon_UX_Benchmark`, `Pokemon_Lucide_Icon_Craft`, `TCG_Market_Intelligence`, `Calculate_Suggested_Bids`, `Generate_Shipping_Labels_PDF`) e suporte a Dark/Light Mode + ícones temáticos compatíveis com Lucide.

### B. Banco de Dados (`@AgenteDBA` + Supabase)
- Criada e aplicada via Supabase MCP (`execute_sql`) a migração `supabase/migrations/20261118000001_tcg_auction_schema.sql`.
- Criadas **7 tabelas isoladas** com prefixo `tcg_` (sem alterar as 12 tabelas PascalCase do e-commerce legado):
  - `public.tcg_profiles`
  - `public.tcg_customers`
  - `public.tcg_purchases`
  - `public.tcg_auctions`
  - `public.tcg_sales`
  - `public.tcg_reconciliations`
  - `public.tcg_upload_logs`
- Todas com **RLS habilitado**, função `private.tcg_current_role()` e índices de busca e chaves estrangeiras.
- **Seed real aplicado:** `supabase/seed_tcg.sql` e `scripts/seed-db.mjs` carregaram as **343 compras reais** do CSV `Controle de Compras - Pokémon TCG - Página1.csv`, somando exatamente **412.376 centavos (`R$ 4.123,76`)**, além de perfis (`Thiago Couto - ADMIN`, `Gabriele Silva - PARTNER`, `Marina - TREASURER`), clientes, leilões e arremates de exemplo.
- **Storage Bucket criado:** `supabase/migrations/20261119000001_tcg_storage_bucket.sql` criou o bucket privado `tcg-uploads` (limite 5 MB, MIME types permitidos para `.csv`, `.xls`, `.xlsx`, `.jpeg`, `.png`, `.pdf`) com políticas RLS (`SELECT`, `INSERT`, `UPDATE`) em `storage.objects`.
- **Supabase Security Advisor:** `get_advisors` (`security`) retornou `lints: []` (zero alertas nas tabelas `tcg_*` e no Storage).

### C. Backend, Harness & Regras de Negócio (`@AgenteBackend`)
- `src/lib/currency-brl.ts`: Parse e formatação BRL estrita com vírgula (`parseBRLToCentavos`, `formatCentavosToBRL`, `sanitizeBRLInput`).
- `src/lib/rbac.ts`: Controle de acesso RBAC (`verifyRBAC`, `canEditProductDescriptions`) — bloqueia `401` sem sessão e `403` quando `TREASURER` tenta editar descrição ou valor de produtos.
- `src/lib/skills/excel-skills.ts`: Geração de templates `.xlsx` e parse resiliente (`.csv`, `.xls`, `.xlsx`, limite 5 MB, Zod linha a linha com degradação graciosa para não perder linhas válidas quando outra falhar).
- `src/lib/skills/accounting-skills.ts`: Sugestões de match De-Para por similaridade (`crossReferenceAccounting`), vínculo N:N (Lotes e Kits) e consolidado da Tesouraria (`calculateTreasuryPayouts`).
- `src/lib/skills/bidding-skills.ts`: Regras de "Padronização de Lances TDK & COUTS TCG" baseadas no valor da Liga Pokémon.
- `src/lib/pokemon-catalog.ts`: Autocomplete Pokémon TCG com catálogo local + consulta à API `pokemontcg.io`.
- `src/lib/supabase-sync.ts`: Módulo dedicado de persistência bidirecional nas 7 tabelas `tcg_*` (`fetchDatabaseFromSupabase` para hidratação no cold-start + sincronização de `tcg_customers`, `tcg_auctions`, `tcg_purchases`, `tcg_sales`, `tcg_reconciliations`, `tcg_upload_logs` e upload real para o bucket privado `tcg-uploads`).
- `src/lib/db-store.ts`: Camada de persistência híbrida (`ensureHydratedDatabase` hidratando do Supabase no cold-start em todas as rotas `GET` + cache local / `/tmp` + sincronização assíncrona via `supabase-sync.ts`).
- `DEPLOY.md`: Guia rápido de publicação na Vercel (opção imediata via GitHub) e retomada no Netlify.
- **9 rotas de API** em `src/app/api/`, todas protegidas por `verifyRBAC`:
  - `/api/purchases`, `/api/sales`, `/api/reconciliation`, `/api/customers`, `/api/treasury`, `/api/spreadsheets/template`, `/api/spreadsheets/parse`, `/api/pokemon-tcg/search`, `/api/auth/session`.

### D. Frontend Temático & Ícones Pokémon-Lucide (`@AgenteFrontend` & `@AgenteUXBenchmark`)
- Ativos copiados de `Documentação inicial/Image/` para `public/brand/` (`tdk-banner.jpeg`, `regras-lances.jpeg`, `foto-carta-leilao.jpeg`, `etiquetas_tdk_couts_tcg_10_por_folha.pdf`).
- Ícones SVG autorais em padrão Lucide (`24x24`, `strokeWidth={2}`) em `src/components/icons/pokemon-lucide.tsx`: `PikachuIcon`, `PokeballIcon`, `MasterballIcon`, `TcgCardStackIcon`, `TdkCrownIcon`, `ThunderboltIcon`.
- Interface completa em Next.js 15 + Tailwind CSS com **Light Mode como padrão** (suporte a Dark Mode via toggle), **marcas d'água de contorno Pokémon nas laterais** (`src/components/PokemonSideWatermarks.tsx`), **navegação superior limpa** (sem caixa roxa, apenas texto e ícone coloridos quando selecionados), **botões no estilo outline** e emblema/ícones de **Pokébola** (`PokeballIcon`) no lugar da coroa:
  - `src/components/PokemonSideWatermarks.tsx` (contornos Pikachu, Pokébola, Carta TCG, Eevee e Raio nas laterais)
  - `src/components/HeaderBar.tsx` (emblema Pokébola outline + navegação limpa + seletor RBAC + toggle tema)
  - `src/components/DashboardTab.tsx` (banner claro sem barra roxa escura, KPIs, gráfico por leilão, alertas PIX e guia de lances)
  - `src/components/PurchasesTab.tsx`, `PurchasesModal.tsx`, `SpreadsheetUploadModal.tsx`
  - `src/components/SalesTab.tsx`
  - `src/components/AccountingTab.tsx`
  - `src/components/CustomersLabelsTab.tsx` (Resumo WhatsApp + Folha A4 com 10 Etiquetas TDK & COUTS TCG)
  - `src/components/TreasuryTab.tsx`

### E. Qualidade e Testes Validados (`@AgenteQA` — 21/11/2026)
- `npm run qa:design` (`scripts/enforce-design-system.mjs`): **Passou** — 33 arquivos validados, 100% das funções `<= 100` linhas, `verifyRBAC` em 100% das rotas, Tailwind CSS + Lucide estritos.
- `npx tsc --noEmit`: **Passou** (exit code 0).
- `npm run build`: **Passou** (Next.js 15.5.29, 13 rotas compiladas).
- `npx playwright test` (`tests/e2e.spec.ts`): **6 passed (5.9s)** no Chromium real com hidratação cold-start ativa do Supabase (Dashboard `R$ 4.123,76`, filtros/cadastro `30,50`, upload resiliente com gravação real no bucket `tcg-uploads` e `tcg_upload_logs`, conciliação De-Para em `tcg_reconciliations`, WhatsApp + 10 etiquetas, e segurança RBAC `401`/`403`).
- Bancos local e remoto higienizados após os testes (`node scripts/seed-db.mjs` + verificação Supabase -> 343 compras = `412376` centavos / `R$ 4.123,76`).

---

## 2. Em que passo estamos agora?

- **MVP + Fase 2 + Refinos Visuais + Persistência Bidirecional Supabase (hidratação cold-start + escrita nas 7 tabelas `tcg_*` e bucket `tcg-uploads`) + Guia `DEPLOY.md` implementados, compilados e revalidados em 21/11/2026.**
- **Supabase (`lafvgkbxmxwhvgiwnxgp`) pronto para produção:**
  - 7 tabelas isoladas `tcg_*` populadas (343 compras = `R$ 4.123,76`) + bucket privado `tcg-uploads`.
  - Módulo `src/lib/supabase-sync.ts` (`fetchDatabaseFromSupabase` + `sync*ToSupabase` + `recordSpreadsheetUploadToSupabase`) conectado a `ensureHydratedDatabase()` e às rotas de API via ponte SHA-256 (`supabase/migrations/20261119000002_tcg_backend_bridge.sql`).
  - Fallback serverless em `/tmp` e catálogo JSON inicial (`src/lib/initial-purchases-fallback.json`) ativos em `src/lib/db-store.ts` para execução sem disco persistente.
- **GitHub sincronizado:** Código publicado em `https://github.com/thiago-castr0/TDK-Couts-tcg.git` (branch `main`).
- **Netlify configurado e bloqueado por limite de conta:**
  - Projeto `tdk-couts-tcg` (`siteId`: `dd321459-4a29-4b98-897f-1b4fb2078375`, time `castro-thiagoux`) criado em `https://app.netlify.com/projects/tdk-couts-tcg`.
  - `netlify.toml` configurado com `[[plugins]] package = "@netlify/plugin-nextjs"` e 4 variáveis de ambiente configuradas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `TCG_BACKEND_SECRET`).
  - O deploy `6aff730afc0047dc9106839e` foi interrompido pelo Netlify com o erro `"Skipped due to account credit usage exceeded"`.
- **Servidor Local Ativo:** Servidor Next.js disponível fora do sandbox em `http://localhost:3000` para revisão visual e funcional do Thiago no navegador.

---

## 3. Próximos Passos

1. **Desbloquear Hospedagem em Produção (escolher uma opção):**
   - **Opção A — Netlify:** Regularizar/adicionar créditos na conta Netlify (`https://app.netlify.com/projects/tdk-couts-tcg`) ou conectar o deploy contínuo ao GitHub após liberar créditos, e disparar novo deploy.
   - **Opção B — Vercel (Alternativa imediata):** Importar o repositório `https://github.com/thiago-castr0/TDK-Couts-tcg.git` na Vercel e cadastrar as 4 variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `TCG_BACKEND_SECRET`).
2. **Revisão Visual e Funcional em `http://localhost:3000`:**
   - Validar cada tela no navegador: Dashboard, Minhas Compras, Arremates, Contabilidade De-Para, Cobrança WhatsApp, Etiquetas 10-por-folha e Tesouraria.
   - Opcionalmente adicionar `SUPABASE_SERVICE_ROLE_KEY` ao `.env.local` e ao provedor de produção, caso deseje escrita direta via Service Role além da ponte `TCG_BACKEND_SECRET`.
3. **Pendência de Segurança Legada no Supabase (Decisão do Thiago):**
   - Decidir se quer habilitar RLS e criar políticas nas 12 tabelas antigas do e-commerce (`Produto`, `Pedido`, `Usuario`, etc.) no projeto `lafvgkbxmxwhvgiwnxgp`.

---

## 4. Comandos Úteis para Retomada Rápida

```powershell
# Restaurar banco local limpo (343 compras = R$ 4.123,76)
node scripts/seed-db.mjs

# Rodar auditoria QA (Harness <100 linhas, RBAC, Tailwind + Lucide)
npm run qa:design

# Build de produção (no Windows usar fora do sandbox se SWC der os error 5)
npm run build

# Rodar suíte E2E Playwright (6 testes)
npx playwright test

# Subir servidor em modo dev
npm run dev
```

*(Nota Windows/Node v24: caso precise rodar `npm install` ou `npx playwright install` novamente na máquina, usar `$env:NODE_OPTIONS="--use-system-ca"` por conta da cadeia de certificados SSL do sistema.)*
