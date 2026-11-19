import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const CSV_PATH = path.join(process.cwd(), 'Documentação inicial', 'Controle de Compras - Pokémon TCG - Página1.csv');
const DB_PATH = path.join(process.cwd(), 'data', 'tcg-database.json');
const SEED_SQL_PATH = path.join(process.cwd(), 'supabase', 'seed_tcg.sql');

function parseBRL(raw) {
  if (typeof raw === 'number') return Math.round(raw * 100);
  const cleaned = String(raw ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (!cleaned) return null;
  if (cleaned.includes(',')) {
    const [intPart, decPart] = cleaned.split(',');
    return Math.round(Number(`${intPart.replace(/\./g, '')}.${decPart.padEnd(2, '0')}`) * 100);
  }
  return Math.round(Number(cleaned) * 100);
}

function formatBRL(centavos) {
  const reais = Math.floor(centavos / 100);
  const cents = String(centavos % 100).padStart(2, '0');
  return `R$ ${reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}

function inferCategory(desc) {
  const lower = desc.toLowerCase();
  if (lower.startsWith('lote ') || lower.includes('deck ')) return 'LOTE_COMPRA';
  if (lower.includes('kit') && lower.includes('8')) return 'KIT_8_AMARELA';
  if (lower.includes('kit') && lower.includes('15')) return 'KIT_15_CINZA';
  if (lower.includes('lacrado') || lower.includes('baralho')) return 'LACRADO';
  if (/\b(ex|gx|v-astro|vmax|fullart|ar|sir)\b/i.test(lower)) return 'EX_ESPECIAL';
  return 'AVULSA';
}

function extractNum(desc) {
  const m = desc.match(/(\d{1,3}\/\d{2,3})/);
  return m ? m[1] : null;
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function run() {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const wb = XLSX.read(csvContent, { type: 'string', raw: false });
  const matrix = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });

  const profiles = [
    { id: 'usr-thiago-admin', nome: 'Thiago Couto', email: 'thiago@tdkcoutstcg.com.br', role: 'ADMIN', pixKey: 'pix-thiago@tdkcoutstcg.com.br', comissaoPct: 50 },
    { id: 'usr-gabriele-partner', nome: 'Gabriele Silva', email: 'gabriele@tdkcoutstcg.com.br', role: 'PARTNER', pixKey: 'pix-gabriele@tdkcoutstcg.com.br', comissaoPct: 50 },
    { id: 'usr-marina-treasurer', nome: 'Marina (Tesouraria)', email: 'tesouraria@tdkcoutstcg.com.br', role: 'TREASURER', pixKey: 'tesouraria@tdkcoutstcg.com.br', comissaoPct: 0 },
  ];

  const purchases = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    const joined = row.map((c) => String(c ?? '').trim()).join('');
    if (!joined || joined.toUpperCase().includes('TOTAL GASTO:')) continue;
    const vendedor = String(row[0] ?? '').trim();
    const descricao = String(row[1] ?? '').trim();
    const centavos = parseBRL(row[2]);
    if (!vendedor || !descricao || centavos === null) continue;
    purchases.push({
      id: `pur-${String(purchases.length + 1).padStart(4, '0')}`,
      userId: purchases.length % 3 === 1 ? 'usr-gabriele-partner' : 'usr-thiago-admin',
      vendedor,
      descricao,
      categoria: inferCategory(descricao),
      condicao: /\bSP\b/i.test(descricao) ? 'SP' : 'NM',
      colecaoNumero: extractNum(descricao) ?? undefined,
      valorCompraCentavos: centavos,
      valorAlocadoCentavos: 0,
      valorLigaCentavos: centavos > 0 ? centavos + 400 : null,
      statusPagamento: String(row[3] ?? '').toLowerCase().includes('pend') ? 'Pendente' : 'Pago',
      statusEstoque: 'Disponivel',
      dataCompra: '2026-11-10',
      createdAt: '2026-11-10T12:00:00.000Z',
    });
  }

  const ampharosCost = purchases[0]?.valorCompraCentavos ?? 2200;
  if (purchases[0]) {
    purchases[0].valorAlocadoCentavos = ampharosCost;
    purchases[0].statusEstoque = 'Vendido';
  }

  const customers = [
    { id: 'cus-001', nome: 'Lucas Mendes', telefone: '11998765432', handleSocial: '@lucaspoke', observacoes: 'Coleciona Pikachu e 151', createdAt: '2026-11-12T10:00:00.000Z' },
    { id: 'cus-002', nome: 'Rafael Costa', telefone: '21987651234', handleSocial: '@rafatcg', observacoes: 'Prefere envio via carta registrada', createdAt: '2026-11-12T11:00:00.000Z' },
    { id: 'cus-003', nome: 'Mariana Oliveira', telefone: '31991234567', handleSocial: '@mari.cards', observacoes: 'Arremata cartas AR e Full Art', createdAt: '2026-11-14T15:00:00.000Z' },
    { id: 'cus-004', nome: 'Bruno Almeida', telefone: '41994567890', handleSocial: '@brunoex', observacoes: 'Paga sempre na sexta-feira', createdAt: '2026-11-15T18:00:00.000Z' },
  ];

  const auctions = [
    { id: 'auc-014', nomeLeilao: 'Leilão #14 - Especial Kanto & ARs', responsavelId: 'usr-thiago-admin', responsavelNome: 'Thiago Couto', dataLeilao: '2026-11-14', totalEsperadoCentavos: 22000, totalArrematadoCentavos: 23500, statusRepasse: 'Em Conferencia', createdAt: '2026-11-14T20:00:00.000Z' },
    { id: 'auc-015', nomeLeilao: 'Leilão #15 - Sexta Poké & Kits', responsavelId: 'usr-gabriele-partner', responsavelNome: 'Gabriele Silva', dataLeilao: '2026-11-17', totalEsperadoCentavos: 18000, totalArrematadoCentavos: 17100, statusRepasse: 'Pendente', createdAt: '2026-11-17T20:00:00.000Z' },
  ];

  const sales = [
    { id: 'sal-001', userId: 'usr-thiago-admin', customerId: 'cus-001', compradorNome: 'Lucas Mendes', compradorTelefone: '11998765432', auctionId: 'auc-014', leilaoNome: 'Leilão #14 - Especial Kanto & ARs', descricao: 'Ampharos PT AR NM - 090/086', quantidade: 1, valorArremateCentavos: 3800, custoVinculadoCentavos: ampharosCost, lucroCentavos: 3800 - ampharosCost, statusPagamento: 'Pago', comprovantePixUrl: '/brand/foto-carta-leilao.jpeg', statusConciliacao: 'Conciliado', dataVenda: '2026-11-14', createdAt: '2026-11-14T21:00:00.000Z' },
    { id: 'sal-002', userId: 'usr-thiago-admin', customerId: 'cus-001', compradorNome: 'Lucas Mendes', compradorTelefone: '11998765432', auctionId: 'auc-014', leilaoNome: 'Leilão #14 - Especial Kanto & ARs', descricao: 'Pikachu ex (054/128)', quantidade: 1, valorArremateCentavos: 2800, custoVinculadoCentavos: 0, lucroCentavos: 0, statusPagamento: 'Pendente', statusConciliacao: 'Pendente', dataVenda: '2026-11-14', createdAt: '2026-11-14T21:15:00.000Z' },
    { id: 'sal-003', userId: 'usr-thiago-admin', customerId: 'cus-003', compradorNome: 'Mariana Oliveira', compradorTelefone: '31991234567', auctionId: 'auc-014', leilaoNome: 'Leilão #14 - Especial Kanto & ARs', descricao: 'Mew ex (066/128) PT RR NM', quantidade: 1, valorArremateCentavos: 4900, custoVinculadoCentavos: 0, lucroCentavos: 0, statusPagamento: 'Pago', statusConciliacao: 'Pendente', dataVenda: '2026-11-14', createdAt: '2026-11-14T21:30:00.000Z' },
    { id: 'sal-004', userId: 'usr-gabriele-partner', customerId: 'cus-002', compradorNome: 'Rafael Costa', compradorTelefone: '21987651234', auctionId: 'auc-015', leilaoNome: 'Leilão #15 - Sexta Poké & Kits', descricao: 'Genesect ex (067/086) PT RR NM', quantidade: 1, valorArremateCentavos: 3200, custoVinculadoCentavos: 0, lucroCentavos: 0, statusPagamento: 'Atrasado', statusConciliacao: 'Pendente', dataVenda: '2026-11-17', createdAt: '2026-11-17T21:00:00.000Z' },
    { id: 'sal-005', userId: 'usr-gabriele-partner', customerId: 'cus-004', compradorNome: 'Bruno Almeida', compradorTelefone: '41994567890', auctionId: 'auc-015', leilaoNome: 'Leilão #15 - Sexta Poké & Kits', descricao: 'Mega Charizard X ex (013/094) - PFL', quantidade: 1, valorArremateCentavos: 3900, custoVinculadoCentavos: 0, lucroCentavos: 0, statusPagamento: 'Pago', statusConciliacao: 'Pendente', dataVenda: '2026-11-17', createdAt: '2026-11-17T21:20:00.000Z' },
  ];

  const reconciliations = [
    { id: 'rec-001', saleId: 'sal-001', purchaseId: 'pur-0001', custoAlocadoCentavos: ampharosCost, tipoMatch: 'AUTO', scoreSimilaridade: 1, createdAt: '2026-11-14T22:00:00.000Z' },
  ];

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify({ profiles, customers, purchases, auctions, sales, reconciliations }, null, 2), 'utf8');

  const totalCentavos = purchases.reduce((acc, p) => acc + p.valorCompraCentavos, 0);
  console.log(`Seed local gerado: ${purchases.length} compras, soma = ${totalCentavos} centavos (${formatBRL(totalCentavos)})`);

  const sqlLines = [];
  for (const p of profiles) {
    sqlLines.push(`INSERT INTO public.tcg_profiles (id, nome, email, role, pix_key, comissao_pct) VALUES (${sqlEscape(p.id)}, ${sqlEscape(p.nome)}, ${sqlEscape(p.email)}, ${sqlEscape(p.role)}, ${sqlEscape(p.pixKey)}, ${p.comissaoPct}) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const c of customers) {
    sqlLines.push(`INSERT INTO public.tcg_customers (id, nome, telefone, handle_social, observacoes) VALUES (${sqlEscape(c.id)}, ${sqlEscape(c.nome)}, ${sqlEscape(c.telefone)}, ${sqlEscape(c.handleSocial)}, ${sqlEscape(c.observacoes)}) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const a of auctions) {
    sqlLines.push(`INSERT INTO public.tcg_auctions (id, nome_leilao, responsavel_id, responsavel_nome, data_leilao, total_esperado_centavos, total_arrematado_centavos, status_repasse) VALUES (${sqlEscape(a.id)}, ${sqlEscape(a.nomeLeilao)}, ${sqlEscape(a.responsavelId)}, ${sqlEscape(a.responsavelNome)}, ${sqlEscape(a.dataLeilao)}, ${a.totalEsperadoCentavos}, ${a.totalArrematadoCentavos}, ${sqlEscape(a.statusRepasse)}) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const p of purchases) {
    sqlLines.push(`INSERT INTO public.tcg_purchases (id, user_id, vendedor, descricao, categoria, condicao, colecao_numero, valor_compra_centavos, valor_alocado_centavos, valor_liga_centavos, status_pagamento, status_estoque, data_compra) VALUES (${sqlEscape(p.id)}, ${sqlEscape(p.userId)}, ${sqlEscape(p.vendedor)}, ${sqlEscape(p.descricao)}, ${sqlEscape(p.categoria)}, ${sqlEscape(p.condicao)}, ${sqlEscape(p.colecaoNumero)}, ${p.valorCompraCentavos}, ${p.valorAlocadoCentavos}, ${p.valorLigaCentavos ?? 'NULL'}, ${sqlEscape(p.statusPagamento)}, ${sqlEscape(p.statusEstoque)}, ${sqlEscape(p.dataCompra)}) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const s of sales) {
    sqlLines.push(`INSERT INTO public.tcg_sales (id, user_id, customer_id, comprador_nome, comprador_telefone, auction_id, leilao_nome, descricao, quantidade, valor_arremate_centavos, custo_vinculado_centavos, lucro_centavos, status_pagamento, comprovante_pix_url, status_conciliacao, data_venda) VALUES (${sqlEscape(s.id)}, ${sqlEscape(s.userId)}, ${sqlEscape(s.customerId)}, ${sqlEscape(s.compradorNome)}, ${sqlEscape(s.compradorTelefone)}, ${sqlEscape(s.auctionId)}, ${sqlEscape(s.leilaoNome)}, ${sqlEscape(s.descricao)}, ${s.quantidade}, ${s.valorArremateCentavos}, ${s.custoVinculadoCentavos}, ${s.lucroCentavos}, ${sqlEscape(s.statusPagamento)}, ${sqlEscape(s.comprovantePixUrl)}, ${sqlEscape(s.statusConciliacao)}, ${sqlEscape(s.dataVenda)}) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const r of reconciliations) {
    sqlLines.push(`INSERT INTO public.tcg_reconciliations (id, sale_id, purchase_id, custo_alocado_centavos, tipo_match, score_similaridade) VALUES (${sqlEscape(r.id)}, ${sqlEscape(r.saleId)}, ${sqlEscape(r.purchaseId)}, ${r.custoAlocadoCentavos}, ${sqlEscape(r.tipoMatch)}, ${r.scoreSimilaridade}) ON CONFLICT (id) DO NOTHING;`);
  }
  fs.writeFileSync(SEED_SQL_PATH, sqlLines.join('\n'), 'utf8');
}

run();
