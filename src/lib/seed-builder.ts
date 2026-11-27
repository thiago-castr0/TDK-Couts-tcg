import fs from 'node:fs';
import path from 'node:path';
import initialPurchasesFallback from '@/lib/initial-purchases-fallback.json';
import { DEFAULT_PROFILES } from '@/lib/rbac';
import { extractCardNumber } from '@/lib/skills/accounting-skills';
import { parseExcelToJSON } from '@/lib/skills/excel-skills';
import type {
  Auction,
  Customer,
  Purchase,
  Reconciliation,
  Sale,
  TcgDatabaseState,
} from '@/types/tcg';

const CSV_RELATIVE_PATH = path.join('Documentação inicial', 'Controle de Compras - Pokémon TCG - Página1.csv');

function detectCondition(descricao: string): Purchase['condicao'] {
  if (/\bSP\b/i.test(descricao)) return 'SP';
  if (/\bMP\b/i.test(descricao)) return 'MP';
  if (/\bHP\b/i.test(descricao)) return 'HP';
  return 'NM';
}

function buildSeedPurchases(): Purchase[] {
  const csvPath = path.join(process.cwd(), CSV_RELATIVE_PATH);
  if (!fs.existsSync(csvPath)) {
    return (initialPurchasesFallback as Purchase[]).map((item) => ({ ...item }));
  }

  const buffer = fs.readFileSync(csvPath);
  const parsed = parseExcelToJSON(buffer, 'Controle de Compras - Pokémon TCG - Página1.csv', 'text/csv', buffer.byteLength, 'compras');

  return parsed.validRows.map((row, idx) => {
    const r = row as {
      vendedor: string;
      descricao: string;
      valorCentavos: number;
      statusPagamento: 'Pago' | 'Pendente';
      categoria: Purchase['categoria'];
    };
    const isGabriele = idx % 3 === 1;
    return {
      id: `pur-${String(idx + 1).padStart(4, '0')}`,
      userId: isGabriele ? 'usr-gabriele-partner' : 'usr-thiago-admin',
      vendedor: r.vendedor,
      descricao: r.descricao,
      categoria: r.categoria,
      condicao: detectCondition(r.descricao),
      colecaoNumero: extractCardNumber(r.descricao) ?? undefined,
      valorCompraCentavos: r.valorCentavos,
      valorAlocadoCentavos: 0,
      valorLigaCentavos: r.valorCentavos > 0 ? r.valorCentavos + 400 : null,
      statusPagamento: r.statusPagamento,
      statusEstoque: 'Disponivel',
      dataCompra: '2026-11-10',
      createdAt: '2026-11-10T12:00:00.000Z',
    };
  });
}

function buildSeedCustomers(): Customer[] {
  return [
    { id: 'cus-001', nome: 'Lucas Mendes', telefone: '11998765432', handleSocial: '@lucaspoke', observacoes: 'Coleciona Pikachu e 151', createdAt: '2026-11-12T10:00:00.000Z' },
    { id: 'cus-002', nome: 'Rafael Costa', telefone: '21987651234', handleSocial: '@rafatcg', observacoes: 'Prefere envio via carta registrada', createdAt: '2026-11-12T11:00:00.000Z' },
    { id: 'cus-003', nome: 'Mariana Oliveira', telefone: '31991234567', handleSocial: '@mari.cards', observacoes: 'Arremata cartas AR e Full Art', createdAt: '2026-11-14T15:00:00.000Z' },
    { id: 'cus-004', nome: 'Bruno Almeida', telefone: '41994567890', handleSocial: '@brunoex', observacoes: 'Paga sempre na sexta-feira', createdAt: '2026-11-15T18:00:00.000Z' },
  ];
}

function buildSeedAuctions(): Auction[] {
  return [
    {
      id: 'auc-014',
      nomeLeilao: 'Leilão #14 - Especial Kanto & ARs',
      responsavelId: 'usr-thiago-admin',
      responsavelNome: 'Thiago',
      dataLeilao: '2026-11-14',
      totalEsperadoCentavos: 22000,
      totalArrematadoCentavos: 23500,
      statusRepasse: 'Em Conferencia',
      createdAt: '2026-11-14T20:00:00.000Z',
    },
    {
      id: 'auc-015',
      nomeLeilao: 'Leilão #15 - Sexta Poké & Kits',
      responsavelId: 'usr-gabriele-partner',
      responsavelNome: 'Gabrielle',
      dataLeilao: '2026-11-17',
      totalEsperadoCentavos: 18000,
      totalArrematadoCentavos: 17100,
      statusRepasse: 'Pendente',
      createdAt: '2026-11-17T20:00:00.000Z',
    },
  ];
}

function createInitialSalesList(ampharosCost: number): Sale[] {
  return [
    {
      id: 'sal-001',
      userId: 'usr-thiago-admin',
      customerId: 'cus-001',
      compradorNome: 'Lucas Mendes',
      compradorTelefone: '11998765432',
      auctionId: 'auc-014',
      leilaoNome: 'Leilão #14 - Especial Kanto & ARs',
      descricao: 'Ampharos PT AR NM - 090/086',
      quantidade: 1,
      valorArremateCentavos: 3800,
      custoVinculadoCentavos: ampharosCost,
      lucroCentavos: 3800 - ampharosCost,
      statusPagamento: 'Pago',
      comprovantePixUrl: '/brand/foto-carta-leilao.jpeg',
      statusConciliacao: 'Conciliado',
      dataVenda: '2026-11-14',
      createdAt: '2026-11-14T21:00:00.000Z',
    },
    {
      id: 'sal-002',
      userId: 'usr-thiago-admin',
      customerId: 'cus-001',
      compradorNome: 'Lucas Mendes',
      compradorTelefone: '11998765432',
      auctionId: 'auc-014',
      leilaoNome: 'Leilão #14 - Especial Kanto & ARs',
      descricao: 'Pikachu ex (054/128)',
      quantidade: 1,
      valorArremateCentavos: 2800,
      custoVinculadoCentavos: 0,
      lucroCentavos: 0,
      statusPagamento: 'Pendente',
      statusConciliacao: 'Pendente',
      dataVenda: '2026-11-14',
      createdAt: '2026-11-14T21:15:00.000Z',
    },
    {
      id: 'sal-003',
      userId: 'usr-thiago-admin',
      customerId: 'cus-003',
      compradorNome: 'Mariana Oliveira',
      compradorTelefone: '31991234567',
      auctionId: 'auc-014',
      leilaoNome: 'Leilão #14 - Especial Kanto & ARs',
      descricao: 'Mew ex (066/128) PT RR NM',
      quantidade: 1,
      valorArremateCentavos: 4900,
      custoVinculadoCentavos: 0,
      lucroCentavos: 0,
      statusPagamento: 'Pago',
      statusConciliacao: 'Pendente',
      dataVenda: '2026-11-14',
      createdAt: '2026-11-14T21:30:00.000Z',
    },
    {
      id: 'sal-004',
      userId: 'usr-gabriele-partner',
      customerId: 'cus-002',
      compradorNome: 'Rafael Costa',
      compradorTelefone: '21987651234',
      auctionId: 'auc-015',
      leilaoNome: 'Leilão #15 - Sexta Poké & Kits',
      descricao: 'Genesect ex (067/086) PT RR NM',
      quantidade: 1,
      valorArremateCentavos: 3200,
      custoVinculadoCentavos: 0,
      lucroCentavos: 0,
      statusPagamento: 'Atrasado',
      statusConciliacao: 'Pendente',
      dataVenda: '2026-11-17',
      createdAt: '2026-11-17T21:00:00.000Z',
    },
    {
      id: 'sal-005',
      userId: 'usr-gabriele-partner',
      customerId: 'cus-004',
      compradorNome: 'Bruno Almeida',
      compradorTelefone: '41994567890',
      auctionId: 'auc-015',
      leilaoNome: 'Leilão #15 - Sexta Poké & Kits',
      descricao: 'Mega Charizard X ex (013/094) - PFL',
      quantidade: 1,
      valorArremateCentavos: 3900,
      custoVinculadoCentavos: 0,
      lucroCentavos: 0,
      statusPagamento: 'Pago',
      statusConciliacao: 'Pendente',
      dataVenda: '2026-11-17',
      createdAt: '2026-11-17T21:20:00.000Z',
    },
  ];
}

function buildSeedSalesAndReconciliations(purchases: Purchase[]): {
  sales: Sale[];
  reconciliations: Reconciliation[];
} {
  const firstPurchase = purchases[0];
  const ampharosCost = firstPurchase ? firstPurchase.valorCompraCentavos : 2200;
  if (firstPurchase) {
    firstPurchase.valorAlocadoCentavos = ampharosCost;
    firstPurchase.statusEstoque = 'Vendido';
  }
  const sales = createInitialSalesList(ampharosCost);
  const reconciliations: Reconciliation[] = firstPurchase
    ? [{
        id: 'rec-001',
        saleId: 'sal-001',
        purchaseId: firstPurchase.id,
        custoAlocadoCentavos: ampharosCost,
        tipoMatch: 'AUTO',
        scoreSimilaridade: 1,
        createdAt: '2026-11-14T22:00:00.000Z',
      }]
    : [];
  return { sales, reconciliations };
}

export function buildInitialDatabaseState(): TcgDatabaseState {
  const purchases = buildSeedPurchases();
  const customers = buildSeedCustomers();
  const auctions = buildSeedAuctions();
  const { sales, reconciliations } = buildSeedSalesAndReconciliations(purchases);

  return {
    profiles: DEFAULT_PROFILES,
    customers,
    purchases,
    auctions,
    sales,
    reconciliations,
  };
}
