import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildInitialDatabaseState } from '@/lib/seed-builder';
import type {
  Auction,
  Customer,
  Purchase,
  Reconciliation,
  Sale,
  TcgDatabaseState,
} from '@/types/tcg';

const LOCAL_DB_PATH = path.join(process.cwd(), 'data', 'tcg-database.json');
const TMP_DB_PATH = path.join(os.tmpdir(), 'tdk-tcg-database.json');
let memoryFallbackState: TcgDatabaseState | null = null;

function resolveDbPath(): string {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return LOCAL_DB_PATH;
  } catch {
    return TMP_DB_PATH;
  }
}

function getSupabaseAdminClient(): SupabaseClient | null {
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

export function readDatabase(): TcgDatabaseState {
  const dbPath = resolveDbPath();
  try {
    if (!fs.existsSync(dbPath)) {
      const initial = fs.existsSync(LOCAL_DB_PATH)
        ? (JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8')) as TcgDatabaseState)
        : buildInitialDatabaseState();
      fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf8');
      memoryFallbackState = initial;
      return initial;
    }
    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as TcgDatabaseState;
    memoryFallbackState = parsed;
    return parsed;
  } catch {
    if (!memoryFallbackState) memoryFallbackState = buildInitialDatabaseState();
    return memoryFallbackState;
  }
}

export function writeDatabase(state: TcgDatabaseState): void {
  memoryFallbackState = state;
  const dbPath = resolveDbPath();
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Fallback em memória mantém operação em ambientes estritamente read-only
  }
}

export async function syncPurchasesToSupabase(items: Purchase[]): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client || items.length === 0) return;
  try {
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
    await client.from('tcg_purchases').upsert(payload);
  } catch {
    // Cache local mantém operação resiliente caso rede/Supabase esteja offline
  }
}

export async function syncSalesToSupabase(items: Sale[]): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client || items.length === 0) return;
  try {
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
    await client.from('tcg_sales').upsert(payload);
  } catch {
    // Resiliência local preservada
  }
}

export async function insertPurchases(newItems: Purchase[]): Promise<Purchase[]> {
  const db = readDatabase();
  db.purchases = [...newItems, ...db.purchases];
  writeDatabase(db);
  await syncPurchasesToSupabase(newItems);
  return newItems;
}

export async function updatePurchaseRecord(
  id: string,
  patch: Partial<Purchase>
): Promise<Purchase | null> {
  const db = readDatabase();
  const idx = db.purchases.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated: Purchase = { ...db.purchases[idx], ...patch };
  db.purchases[idx] = updated;
  writeDatabase(db);
  await syncPurchasesToSupabase([updated]);
  return updated;
}

export async function deletePurchaseRecord(id: string): Promise<boolean> {
  const db = readDatabase();
  const prevLen = db.purchases.length;
  db.purchases = db.purchases.filter((p) => p.id !== id);
  if (db.purchases.length === prevLen) return false;
  writeDatabase(db);
  return true;
}

export async function insertSales(newSales: Sale[]): Promise<Sale[]> {
  const db = readDatabase();
  for (const sale of newSales) {
    ensureCustomerAndAuction(db, sale);
  }
  db.sales = [...newSales, ...db.sales];
  writeDatabase(db);
  await syncSalesToSupabase(newSales);
  return newSales;
}

function ensureCustomerAndAuction(db: TcgDatabaseState, sale: Sale): void {
  const existingCustomer = db.customers.find(
    (c) => c.id === sale.customerId || c.nome.toLowerCase() === sale.compradorNome.toLowerCase()
  );
  if (existingCustomer) {
    sale.customerId = existingCustomer.id;
    if (!sale.compradorTelefone) sale.compradorTelefone = existingCustomer.telefone;
  } else {
    const cusId = `cus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const createdCustomer: Customer = {
      id: cusId,
      nome: sale.compradorNome,
      telefone: sale.compradorTelefone || '',
      createdAt: new Date().toISOString(),
    };
    db.customers.push(createdCustomer);
    sale.customerId = cusId;
  }

  const existingAuction = db.auctions.find(
    (a) => a.id === sale.auctionId || a.nomeLeilao.toLowerCase() === sale.leilaoNome.toLowerCase()
  );
  if (existingAuction) {
    sale.auctionId = existingAuction.id;
    existingAuction.totalArrematadoCentavos += sale.valorArremateCentavos;
  } else {
    const aucId = `auc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const owner = db.profiles.find((p) => p.id === sale.userId) ?? db.profiles[0];
    const newAuction: Auction = {
      id: aucId,
      nomeLeilao: sale.leilaoNome,
      responsavelId: owner.id,
      responsavelNome: owner.nome,
      dataLeilao: sale.dataVenda,
      totalEsperadoCentavos: sale.valorArremateCentavos,
      totalArrematadoCentavos: sale.valorArremateCentavos,
      statusRepasse: 'Pendente',
      createdAt: new Date().toISOString(),
    };
    db.auctions.push(newAuction);
    sale.auctionId = aucId;
  }
}

export async function updateSaleRecord(
  id: string,
  patch: Partial<Sale>
): Promise<Sale | null> {
  const db = readDatabase();
  const idx = db.sales.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const updated: Sale = { ...db.sales[idx], ...patch };
  db.sales[idx] = updated;
  writeDatabase(db);
  await syncSalesToSupabase([updated]);
  return updated;
}

export function applyReconciliationLinks(
  saleId: string,
  links: Array<{ purchaseId: string; custoAlocadoCentavos: number; tipoMatch: Reconciliation['tipoMatch']; score?: number }>
): { sale: Sale; reconciliations: Reconciliation[] } | null {
  const db = readDatabase();
  const saleIdx = db.sales.findIndex((s) => s.id === saleId);
  if (saleIdx === -1) return null;

  const created: Reconciliation[] = [];
  let addedCost = 0;

  for (const link of links) {
    const purIdx = db.purchases.findIndex((p) => p.id === link.purchaseId);
    if (purIdx === -1) continue;
    const purchase = db.purchases[purIdx];
    const cost = Math.max(0, Math.round(link.custoAlocadoCentavos));
    purchase.valorAlocadoCentavos += cost;
    purchase.statusEstoque =
      purchase.valorAlocadoCentavos >= purchase.valorCompraCentavos ? 'Vendido' : 'Parcial';
    addedCost += cost;
    const rec: Reconciliation = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      saleId,
      purchaseId: purchase.id,
      custoAlocadoCentavos: cost,
      tipoMatch: link.tipoMatch,
      scoreSimilaridade: link.score,
      createdAt: new Date().toISOString(),
    };
    db.reconciliations.push(rec);
    created.push(rec);
  }

  const sale = db.sales[saleIdx];
  sale.custoVinculadoCentavos += addedCost;
  sale.lucroCentavos = sale.valorArremateCentavos - sale.custoVinculadoCentavos;
  sale.statusConciliacao = 'Conciliado';
  writeDatabase(db);
  return { sale, reconciliations: created };
}

export function insertCustomerRecord(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
  const db = readDatabase();
  const created: Customer = {
    ...customer,
    id: `cus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  db.customers.unshift(created);
  writeDatabase(db);
  return created;
}

export function updateAuctionRecord(id: string, patch: Partial<Auction>): Auction | null {
  const db = readDatabase();
  const idx = db.auctions.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  db.auctions[idx] = { ...db.auctions[idx], ...patch };
  writeDatabase(db);
  return db.auctions[idx];
}
