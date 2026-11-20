import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Auction,
  Customer,
  Purchase,
  Reconciliation,
  Sale,
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

/**
 * Cria cliente Supabase server-side usando Service Role ou ponte com TCG_BACKEND_SECRET.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const backendSecret = process.env.TCG_BACKEND_SECRET;
  if (!anonKey || !backendSecret) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { 'x-tcg-backend-secret': backendSecret } },
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
