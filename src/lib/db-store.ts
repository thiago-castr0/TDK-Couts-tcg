import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildInitialDatabaseState } from '@/lib/seed-builder';
import {
  deletePurchaseFromSupabase,
  fetchDatabaseFromSupabase,
  syncAuctionsToSupabase,
  syncCustomersToSupabase,
  syncPurchasesToSupabase,
  syncReconciliationsToSupabase,
  syncSalesToSupabase,
} from '@/lib/supabase-sync';
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

let hydratedFromSupabase = false;
let hydrationPromise: Promise<void> | null = null;

export async function ensureHydratedDatabase(): Promise<TcgDatabaseState> {
  if (!hydratedFromSupabase) {
    if (!hydrationPromise) {
      hydrationPromise = (async () => {
        try {
          const remote = await fetchDatabaseFromSupabase();
          if (remote && remote.purchases.length > 0) writeDatabase(remote);
        } finally {
          hydratedFromSupabase = true;
          hydrationPromise = null;
        }
      })();
    }
    await hydrationPromise;
  }
  return readDatabase();
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
  await deletePurchaseFromSupabase(id);
  return true;
}

export async function insertSales(newSales: Sale[]): Promise<Sale[]> {
  const db = readDatabase();
  const touchedCustomers = new Map<string, Customer>();
  const touchedAuctions = new Map<string, Auction>();
  for (const sale of newSales) {
    const { customer, auction } = ensureCustomerAndAuction(db, sale);
    touchedCustomers.set(customer.id, customer);
    touchedAuctions.set(auction.id, auction);
  }
  db.sales = [...newSales, ...db.sales];
  writeDatabase(db);
  await syncCustomersToSupabase([...touchedCustomers.values()]);
  await syncAuctionsToSupabase([...touchedAuctions.values()]);
  await syncSalesToSupabase(newSales);
  return newSales;
}

function ensureCustomerAndAuction(
  db: TcgDatabaseState,
  sale: Sale
): { customer: Customer; auction: Auction } {
  let resolvedCustomer = db.customers.find(
    (c) => c.id === sale.customerId || c.nome.toLowerCase() === sale.compradorNome.toLowerCase()
  );
  if (resolvedCustomer) {
    sale.customerId = resolvedCustomer.id;
    if (!sale.compradorTelefone) sale.compradorTelefone = resolvedCustomer.telefone;
  } else {
    const cusId = `cus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    resolvedCustomer = {
      id: cusId,
      nome: sale.compradorNome,
      telefone: sale.compradorTelefone || '',
      createdAt: new Date().toISOString(),
    };
    db.customers.push(resolvedCustomer);
    sale.customerId = cusId;
  }

  let resolvedAuction = db.auctions.find(
    (a) => a.id === sale.auctionId || a.nomeLeilao.toLowerCase() === sale.leilaoNome.toLowerCase()
  );
  if (resolvedAuction) {
    sale.auctionId = resolvedAuction.id;
    resolvedAuction.totalArrematadoCentavos += sale.valorArremateCentavos;
  } else {
    const aucId = `auc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const owner = db.profiles.find((p) => p.id === sale.userId) ?? db.profiles[0];
    resolvedAuction = {
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
    db.auctions.push(resolvedAuction);
    sale.auctionId = aucId;
  }

  return { customer: resolvedCustomer, auction: resolvedAuction };
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

export async function applyReconciliationLinks(
  saleId: string,
  links: Array<{ purchaseId: string; custoAlocadoCentavos: number; tipoMatch: Reconciliation['tipoMatch']; score?: number }>
): Promise<{ sale: Sale; reconciliations: Reconciliation[] } | null> {
  const db = readDatabase();
  const saleIdx = db.sales.findIndex((s) => s.id === saleId);
  if (saleIdx === -1) return null;

  const created: Reconciliation[] = [];
  const updatedPurchases = new Map<string, Purchase>();
  let addedCost = 0;

  for (const link of links) {
    const purIdx = db.purchases.findIndex((p) => p.id === link.purchaseId);
    if (purIdx === -1) continue;
    const purchase = db.purchases[purIdx];
    const cost = Math.max(0, Math.round(link.custoAlocadoCentavos));
    purchase.valorAlocadoCentavos += cost;
    purchase.statusEstoque =
      purchase.valorAlocadoCentavos >= purchase.valorCompraCentavos ? 'Vendido' : 'Parcial';
    updatedPurchases.set(purchase.id, purchase);
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

  await syncPurchasesToSupabase([...updatedPurchases.values()]);
  await syncSalesToSupabase([sale]);
  await syncReconciliationsToSupabase(created);

  return { sale, reconciliations: created };
}

export async function insertCustomerRecord(
  customer: Omit<Customer, 'id' | 'createdAt'>
): Promise<Customer> {
  const db = readDatabase();
  const created: Customer = {
    ...customer,
    id: `cus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  db.customers.unshift(created);
  writeDatabase(db);
  await syncCustomersToSupabase([created]);
  return created;
}

export async function updateAuctionRecord(
  id: string,
  patch: Partial<Auction>
): Promise<Auction | null> {
  const db = readDatabase();
  const idx = db.auctions.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  db.auctions[idx] = { ...db.auctions[idx], ...patch };
  writeDatabase(db);
  await syncAuctionsToSupabase([db.auctions[idx]]);
  return db.auctions[idx];
}
