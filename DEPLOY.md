# Guia de Deploy em Produção — TDK & COUTS TCG

Este guia resume as opções rápidas de publicação em produção usando o repositório sincronizado no GitHub (`https://github.com/thiago-castr0/TDK-Couts-tcg.git`) e o projeto Supabase (`lafvgkbxmxwhvgiwnxgp`).

---

## 1. Arquitetura de Persistência Híbrida (Serverless-Ready)

A aplicação opera com persistência bidirecional resiliente, compatível tanto com servidor local quanto com funções serverless (Vercel / Netlify):

1. **Hidratação no Cold-Start (`ensureHydratedDatabase` + `fetchDatabaseFromSupabase`):**
   - Na primeira leitura em qualquer instância fria, o backend consulta as tabelas `tcg_profiles`, `tcg_customers`, `tcg_purchases`, `tcg_auctions`, `tcg_sales` e `tcg_reconciliations` no Supabase e hidrata o cache em memória/disco.
2. **Cache Local / Serverless (`/tmp` ou `data/`):**
   - Leituras subsequentes usam `data/tcg-database.json` (quando o disco é gravável) ou `/tmp/tdk-tcg-database.json` em ambientes serverless read-only, com fallback estático inicial em `src/lib/initial-purchases-fallback.json`.
3. **Sincronização Assíncrona (`src/lib/supabase-sync.ts`):**
   - Mutações (`POST`, `PATCH`, `DELETE`, conciliação De-Para, clientes, leilões e uploads de planilhas para o bucket privado `tcg-uploads` + `tcg_upload_logs`) são gravadas nas 7 tabelas `tcg_*` via `SUPABASE_SERVICE_ROLE_KEY` (opcional) ou pela ponte server-side `TCG_BACKEND_SECRET` (`x-tcg-backend-secret`).

---

## 2. Opção A — Publicação Rápida na Vercel (Recomendada no Momento)

1. Acesse **Vercel -> Add New Project** e importe o repositório `https://github.com/thiago-castr0/TDK-Couts-tcg.git` (branch `main`, framework preset **Next.js**).
2. Em **Environment Variables**, cadastre as **4 variáveis abaixo** copiando exatamente os valores do seu `.env.local` (nunca versione `.env.local` no Git):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `TCG_BACKEND_SECRET`
   - *(Opcional)* `SUPABASE_SERVICE_ROLE_KEY` — caso deseje escrita direta com privilégio Service Role em vez da ponte `TCG_BACKEND_SECRET`.
3. Clique em **Deploy**. O build gera as rotas App Router (`/`, `/api/*`) e conecta automaticamente ao banco e Storage no Supabase.

---

## 3. Opção B — Netlify (Projeto Já Provisionado)

O site **`tdk-couts-tcg`** já está criado e configurado no Netlify:

- **Dashboard:** `https://app.netlify.com/projects/tdk-couts-tcg`
- **Site ID:** `dd321459-4a29-4b98-897f-1b4fb2078375` (time `castro-thiagoux`)
- **Configuração:** `netlify.toml` já inclui `[[plugins]] package = "@netlify/plugin-nextjs"` e as 4 variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `TCG_BACKEND_SECRET`) já estão cadastradas no painel.
- **Para ativar:** assim que os créditos de build da conta Netlify forem renovados ou regularizados, conecte o repositório GitHub em **Site configuration -> Build & deploy** (ou dispare um novo deploy manual) sem necessidade de reconfigurar variáveis.
