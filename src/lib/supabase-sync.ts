import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Auction,
  Customer,
  Purchase,
  Reconciliation,
  Sale,
  TcgDatabaseState,
  UserProfile,
} from '@/types/tcg';

export interface SpreadsheetUploadAuditParams {
  userId: string;
  moduleName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errorsJson: unknown;
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(3500) });
}

/**
 * Cria cliente Supabase server-side usando Service Role ou ponte com TCG_BACKEND_SECRET.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: { fetch: fetchWithTimeout },
    });
  }
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const backendSecret = process.env.TCG_BACKEND_SECRET;
  if (!anonKey || !backendSecret) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: { 'x-tcg-backend-secret': backendSecret },
      fetch: fetchWithTimeout,
    },
  });
}

async function upsertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client || rows.length === 0) return;
  try {
    await client.from(table).upsert(rows);
  } catch {
    // Degradação graciosa: cache local preserva operação mesmo sem rede
  }
}

/** Sincroniza clientes (`tcg_customers`) com o Supabase. */
export async function syncCustomersToSupabase(items: Customer[]): Promise<void> {
  const payload = items.map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone || null,
    handle_social: c.handleSocial ?? null,
    observacoes: c.observacoes ?? null,
  }));
  await upsertRows('tcg_customers', payload);
}

/** Sincroniza leilões (`tcg_auctions`) com o Supabase. */
export async function syncAuctionsToSupabase(items: Auction[]): Promise<void> {
  const payload = items.map((a) => ({
    id: a.id,
    nome_leilao: a.nomeLeilao,
    responsavel_id: a.responsavelId || null,
    responsavel_nome: a.responsavelNome,
    data_leilao: a.dataLeilao,
    total_esperado_centavos: a.totalEsperadoCentavos,
    total_arrematado_centavos: a.totalArrematadoCentavos,
    status_repasse: a.statusRepasse,
  }));
  await upsertRows('tcg_auctions', payload);
}

/** Sincroniza compras (`tcg_purchases`) com o Supabase. */
export async function syncPurchasesToSupabase(items: Purchase[]): Promise<void> {
  const payload = items.map((p) => ({
    id: p.id,
    user_id: p.userId,
    vendedor: p.vendedor,
    descricao: p.descricao,
    categoria: p.categoria,
    condicao: p.condicao,
    colecao_numero: p.colecaoNumero ?? null,
    valor_compra_centavos: p.valorCompraCentavos,
    valor_alocado_centavos: p.valorAlocadoCentavos,
    valor_liga_centavos: p.valorLigaCentavos ?? null,
    status_pagamento: p.statusPagamento,
    status_estoque: p.statusEstoque,
    imagem_url: p.imagemUrl ?? null,
    data_compra: p.dataCompra,
  }));
  await upsertRows('tcg_purchases', payload);
}

/** Remove uma compra específica em `tcg_purchases`. */
export async function deletePurchaseFromSupabase(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;
  try {
    await client.from('tcg_purchases').delete().eq('id', id);
  } catch {
    // Degradação graciosa preservada
  }
}

/** Sincroniza arremates (`tcg_sales`) com o Supabase. */
export async function syncSalesToSupabase(items: Sale[]): Promise<void> {
  const payload = items.map((s) => ({
    id: s.id,
    user_id: s.userId,
    customer_id: s.customerId,
    comprador_nome: s.compradorNome,
    comprador_telefone: s.compradorTelefone,
    auction_id: s.auctionId,
    leilao_nome: s.leilaoNome,
    descricao: s.descricao,
    quantidade: s.quantidade,
    valor_arremate_centavos: s.valorArremateCentavos,
    custo_vinculado_centavos: s.custoVinculadoCentavos,
    lucro_centavos: s.lucroCentavos,
    status_pagamento: s.statusPagamento,
    comprovante_pix_url: s.comprovantePixUrl ?? null,
    status_conciliacao: s.statusConciliacao,
    imagem_url: s.imagemUrl ?? null,
    data_venda: s.dataVenda,
  }));
  await upsertRows('tcg_sales', payload);
}

/** Sincroniza conciliações De-Para (`tcg_reconciliations`) com o Supabase. */
export async function syncReconciliationsToSupabase(items: Reconciliation[]): Promise<void> {
  const payload = items.map((r) => ({
    id: r.id,
    sale_id: r.saleId,
    purchase_id: r.purchaseId,
    custo_alocado_centavos: r.custoAlocadoCentavos,
    tipo_match: r.tipoMatch,
    score_similaridade: r.scoreSimilaridade ?? null,
  }));
  await upsertRows('tcg_reconciliations', payload);
}

function resolveSpreadsheetMimeType(mimeType: string, fileName: string): string {
  if (mimeType) return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  return 'text/csv';
}

/**
 * Envia a planilha original para o bucket privado `tcg-uploads` e registra auditoria em `tcg_upload_logs`.
 */
export async function recordSpreadsheetUploadToSupabase(
  params: SpreadsheetUploadAuditParams
): Promise<string | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;

  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${params.moduleName}/${Date.now()}-${safeName}`;
  const contentType = resolveSpreadsheetMimeType(params.mimeType, params.fileName);

  try {
    const { error: uploadError } = await client.storage
      .from('tcg-uploads')
      .upload(storagePath, params.buffer, { contentType, upsert: false });

    const uploadedPath = uploadError ? null : storagePath;

    await client.from('tcg_upload_logs').insert({
      id: `upl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: params.userId,
      module: params.moduleName,
      file_name: params.fileName,
      storage_path: uploadedPath,
      total_rows: params.totalRows,
      valid_rows: params.validRows,
      error_rows: params.errorRows,
      errors_json: params.errorsJson,
    });

    return uploadedPath;
  } catch {
    return null;
  }
}

function mapPurchaseRow(r: Record<string, unknown>): Purchase {
  return {
    id: String(r.id),
    userId: String(r.user_id ?? 'usr-thiago-admin'),
    vendedor: String(r.vendedor),
    descricao: String(r.descricao),
    categoria: r.categoria as Purchase['categoria'],
    condicao: r.condicao as Purchase['condicao'],
    colecaoNumero: r.colecao_numero ? String(r.colecao_numero) : undefined,
    valorCompraCentavos: Number(r.valor_compra_centavos ?? 0),
    valorAlocadoCentavos: Number(r.valor_alocado_centavos ?? 0),
    valorLigaCentavos: r.valor_liga_centavos != null ? Number(r.valor_liga_centavos) : null,
    statusPagamento: r.status_pagamento as Purchase['statusPagamento'],
    statusEstoque: r.status_estoque as Purchase['statusEstoque'],
    imagemUrl: r.imagem_url ? String(r.imagem_url) : undefined,
    dataCompra: String(r.data_compra),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

function mapSaleRow(r: Record<string, unknown>): Sale {
  return {
    id: String(r.id),
    userId: String(r.user_id ?? 'usr-thiago-admin'),
    customerId: String(r.customer_id ?? ''),
    compradorNome: String(r.comprador_nome),
    compradorTelefone: r.comprador_telefone ? String(r.comprador_telefone) : '',
    auctionId: String(r.auction_id ?? ''),
    leilaoNome: String(r.leilao_nome),
    descricao: String(r.descricao),
    quantidade: Number(r.quantidade ?? 1),
    valorArremateCentavos: Number(r.valor_arremate_centavos ?? 0),
    custoVinculadoCentavos: Number(r.custo_vinculado_centavos ?? 0),
    lucroCentavos: Number(r.lucro_centavos ?? 0),
    statusPagamento: r.status_pagamento as Sale['statusPagamento'],
    comprovantePixUrl: r.comprovante_pix_url ? String(r.comprovante_pix_url) : undefined,
    statusConciliacao: r.status_conciliacao as Sale['statusConciliacao'],
    imagemUrl: r.imagem_url ? String(r.imagem_url) : undefined,
    dataVenda: String(r.data_venda),
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

function mapAuxRows(
  profiles: Record<string, unknown>[],
  customers: Record<string, unknown>[],
  auctions: Record<string, unknown>[],
  reconciliations: Record<string, unknown>[]
): Pick<TcgDatabaseState, 'profiles' | 'customers' | 'auctions' | 'reconciliations'> {
  return {
    profiles: profiles.map((p) => ({
      id: String(p.id), nome: String(p.nome), email: String(p.email),
      role: p.role as UserProfile['role'],
      pixKey: p.pix_key ? String(p.pix_key) : '',
      comissaoPct: Number(p.comissao_pct ?? 50),
    })),
    customers: customers.map((c) => ({
      id: String(c.id), nome: String(c.nome),
      telefone: c.telefone ? String(c.telefone) : '',
      handleSocial: c.handle_social ? String(c.handle_social) : undefined,
      observacoes: c.observacoes ? String(c.observacoes) : undefined,
      createdAt: String(c.created_at ?? new Date().toISOString()),
    })),
    auctions: auctions.map((a) => ({
      id: String(a.id), nomeLeilao: String(a.nome_leilao),
      responsavelId: String(a.responsavel_id ?? ''),
      responsavelNome: String(a.responsavel_nome),
      dataLeilao: String(a.data_leilao),
      totalEsperadoCentavos: Number(a.total_esperado_centavos ?? 0),
      totalArrematadoCentavos: Number(a.total_arrematado_centavos ?? 0),
      statusRepasse: a.status_repasse as Auction['statusRepasse'],
      createdAt: String(a.created_at ?? new Date().toISOString()),
    })),
    reconciliations: reconciliations.map((rec) => ({
      id: String(rec.id), saleId: String(rec.sale_id), purchaseId: String(rec.purchase_id),
      custoAlocadoCentavos: Number(rec.custo_alocado_centavos ?? 0),
      tipoMatch: rec.tipo_match as Reconciliation['tipoMatch'],
      scoreSimilaridade: rec.score_similaridade != null ? Number(rec.score_similaridade) : undefined,
      createdAt: String(rec.created_at ?? new Date().toISOString()),
    })),
  };
}

/**
 * Hidrata o estado completo diretamente das tabelas `tcg_*` do Supabase no cold-start.
 */
export async function fetchDatabaseFromSupabase(): Promise<TcgDatabaseState | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  try {
    const [profilesRes, customersRes, purchasesRes, auctionsRes, salesRes, recRes] =
      await Promise.all([
        client.from('tcg_profiles').select('*'),
        client.from('tcg_customers').select('*'),
        client.from('tcg_purchases').select('*').order('id', { ascending: true }).limit(2000),
        client.from('tcg_auctions').select('*'),
        client.from('tcg_sales').select('*').order('id', { ascending: true }),
        client.from('tcg_reconciliations').select('*'),
      ]);

    const hasError =
      profilesRes.error || customersRes.error || purchasesRes.error ||
      auctionsRes.error || salesRes.error || recRes.error;
    if (hasError || !purchasesRes.data || purchasesRes.data.length === 0) return null;

    const aux = mapAuxRows(
      (profilesRes.data ?? []) as Record<string, unknown>[],
      (customersRes.data ?? []) as Record<string, unknown>[],
      (auctionsRes.data ?? []) as Record<string, unknown>[],
      (recRes.data ?? []) as Record<string, unknown>[]
    );
    return {
      ...aux,
      purchases: (purchasesRes.data as Record<string, unknown>[]).map(mapPurchaseRow),
      sales: ((salesRes.data ?? []) as Record<string, unknown>[]).map(mapSaleRow),
    };
  } catch {
    return null;
  }
}
