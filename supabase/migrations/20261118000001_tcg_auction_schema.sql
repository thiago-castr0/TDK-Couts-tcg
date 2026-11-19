-- Migration: TDK & COUTS TCG Auction Management Platform Schema
-- Isolado com prefixo tcg_ para não afetar tabelas legadas do projeto Supabase.

CREATE SCHEMA IF NOT EXISTS private;

-- 1. Perfis de Usuários da Plataforma (Admin, Vendedor/Sócio, Tesoureiro)
CREATE TABLE IF NOT EXISTS public.tcg_profiles (
  id text PRIMARY KEY,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'PARTNER', 'TREASURER')),
  pix_key text,
  comissao_pct numeric(5,2) NOT NULL DEFAULT 50.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Base de Clientes (Arrematantes)
CREATE TABLE IF NOT EXISTS public.tcg_customers (
  id text PRIMARY KEY,
  nome text NOT NULL,
  telefone text,
  handle_social text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_customers ENABLE ROW LEVEL SECURITY;

-- 3. Módulo Minhas Compras (Entrada de Estoque)
CREATE TABLE IF NOT EXISTS public.tcg_purchases (
  id text PRIMARY KEY,
  user_id text REFERENCES public.tcg_profiles(id) ON DELETE SET NULL,
  vendedor text NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'AVULSA',
  condicao text NOT NULL DEFAULT 'NM',
  colecao_numero text,
  valor_compra_centavos bigint NOT NULL CHECK (valor_compra_centavos >= 0),
  valor_alocado_centavos bigint NOT NULL DEFAULT 0 CHECK (valor_alocado_centavos >= 0),
  valor_liga_centavos bigint CHECK (valor_liga_centavos IS NULL OR valor_liga_centavos >= 0),
  status_pagamento text NOT NULL DEFAULT 'Pago',
  status_estoque text NOT NULL DEFAULT 'Disponivel',
  imagem_url text,
  data_compra date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_purchases ENABLE ROW LEVEL SECURITY;

-- 4. Módulo Tesouraria (Leilões e Repasses)
CREATE TABLE IF NOT EXISTS public.tcg_auctions (
  id text PRIMARY KEY,
  nome_leilao text NOT NULL,
  responsavel_id text REFERENCES public.tcg_profiles(id) ON DELETE SET NULL,
  responsavel_nome text NOT NULL,
  data_leilao date NOT NULL,
  total_esperado_centavos bigint NOT NULL DEFAULT 0,
  total_arrematado_centavos bigint NOT NULL DEFAULT 0,
  status_repasse text NOT NULL DEFAULT 'Pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_auctions ENABLE ROW LEVEL SECURITY;

-- 5. Módulo Cartas Arrematadas (Saída/Venda)
CREATE TABLE IF NOT EXISTS public.tcg_sales (
  id text PRIMARY KEY,
  user_id text REFERENCES public.tcg_profiles(id) ON DELETE SET NULL,
  customer_id text REFERENCES public.tcg_customers(id) ON DELETE SET NULL,
  comprador_nome text NOT NULL,
  comprador_telefone text,
  auction_id text REFERENCES public.tcg_auctions(id) ON DELETE SET NULL,
  leilao_nome text NOT NULL,
  descricao text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_arremate_centavos bigint NOT NULL CHECK (valor_arremate_centavos >= 0),
  custo_vinculado_centavos bigint NOT NULL DEFAULT 0,
  lucro_centavos bigint NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'Pendente',
  comprovante_pix_url text,
  status_conciliacao text NOT NULL DEFAULT 'Pendente',
  imagem_url text,
  data_venda date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_sales ENABLE ROW LEVEL SECURITY;

-- 6. Módulo Contabilidade (De-Para N:N entre Compras/Lotes e Vendas/Kits)
CREATE TABLE IF NOT EXISTS public.tcg_reconciliations (
  id text PRIMARY KEY,
  sale_id text NOT NULL REFERENCES public.tcg_sales(id) ON DELETE CASCADE,
  purchase_id text NOT NULL REFERENCES public.tcg_purchases(id) ON DELETE CASCADE,
  custo_alocado_centavos bigint NOT NULL CHECK (custo_alocado_centavos >= 0),
  tipo_match text NOT NULL DEFAULT 'MANUAL',
  score_similaridade numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_reconciliations ENABLE ROW LEVEL SECURITY;

-- 7. Logs de Auditoria de Uploads de Planilha
CREATE TABLE IF NOT EXISTS public.tcg_upload_logs (
  id text PRIMARY KEY,
  user_id text REFERENCES public.tcg_profiles(id) ON DELETE SET NULL,
  module text NOT NULL,
  file_name text NOT NULL,
  storage_path text,
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  errors_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tcg_upload_logs ENABLE ROW LEVEL SECURITY;

-- Índices de Performance (Busca + Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_tcg_purchases_vendedor ON public.tcg_purchases (vendedor);
CREATE INDEX IF NOT EXISTS idx_tcg_purchases_descricao ON public.tcg_purchases (descricao);
CREATE INDEX IF NOT EXISTS idx_tcg_purchases_user_id ON public.tcg_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_tcg_auctions_responsavel_id ON public.tcg_auctions (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tcg_sales_leilao ON public.tcg_sales (leilao_nome);
CREATE INDEX IF NOT EXISTS idx_tcg_sales_comprador ON public.tcg_sales (comprador_nome);
CREATE INDEX IF NOT EXISTS idx_tcg_sales_user_id ON public.tcg_sales (user_id);
CREATE INDEX IF NOT EXISTS idx_tcg_sales_customer_id ON public.tcg_sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_tcg_sales_auction_id ON public.tcg_sales (auction_id);
CREATE INDEX IF NOT EXISTS idx_tcg_reconciliations_sale_id ON public.tcg_reconciliations (sale_id);
CREATE INDEX IF NOT EXISTS idx_tcg_reconciliations_purchase_id ON public.tcg_reconciliations (purchase_id);
CREATE INDEX IF NOT EXISTS idx_tcg_upload_logs_user_id ON public.tcg_upload_logs (user_id);

-- Helper privado de autorização com verificação explícita de auth.uid()
CREATE OR REPLACE FUNCTION private.tcg_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.tcg_profiles WHERE id = (SELECT auth.uid())::text LIMIT 1),
    NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION private.tcg_current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.tcg_current_role() TO authenticated, service_role;

-- Políticas RLS para usuários autenticados vinculados à squad TDK & COUTS TCG
CREATE POLICY tcg_profiles_select_auth ON public.tcg_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid())::text OR (SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_profiles_admin_write ON public.tcg_profiles
  FOR ALL TO authenticated
  USING ((SELECT private.tcg_current_role()) = 'ADMIN')
  WITH CHECK ((SELECT private.tcg_current_role()) = 'ADMIN');

CREATE POLICY tcg_customers_select_auth ON public.tcg_customers
  FOR SELECT TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_customers_write_auth ON public.tcg_customers
  FOR ALL TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'))
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'));

CREATE POLICY tcg_purchases_select_auth ON public.tcg_purchases
  FOR SELECT TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_purchases_write_auth ON public.tcg_purchases
  FOR ALL TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'))
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'));

CREATE POLICY tcg_auctions_select_auth ON public.tcg_auctions
  FOR SELECT TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_auctions_write_auth ON public.tcg_auctions
  FOR ALL TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'))
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_sales_select_auth ON public.tcg_sales
  FOR SELECT TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_sales_insert_auth ON public.tcg_sales
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'));

CREATE POLICY tcg_sales_update_auth ON public.tcg_sales
  FOR UPDATE TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'))
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_sales_delete_auth ON public.tcg_sales
  FOR DELETE TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'));

CREATE POLICY tcg_reconciliations_select_auth ON public.tcg_reconciliations
  FOR SELECT TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_reconciliations_write_auth ON public.tcg_reconciliations
  FOR ALL TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'))
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'));

CREATE POLICY tcg_upload_logs_select_auth ON public.tcg_upload_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER'));

CREATE POLICY tcg_upload_logs_insert_auth ON public.tcg_upload_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER'));
