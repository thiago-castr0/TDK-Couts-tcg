import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatCentavosToBRL, parseBRLToCentavos } from '@/lib/currency-brl';
import { insertSales, readDatabase, updateSaleRecord } from '@/lib/db-store';
import { canEditProductDescriptions, verifyRBAC } from '@/lib/rbac';
import type { Sale } from '@/types/tcg';

const singleSaleSchema = z.object({
  compradorNome: z.string().trim().min(1, 'Nome do comprador é obrigatório'),
  compradorTelefone: z.string().optional().default(''),
  leilaoNome: z.string().trim().min(1, 'Leilão de origem é obrigatório'),
  descricao: z.string().trim().min(2, 'Descrição da carta é obrigatória'),
  quantidade: z.number().int().min(1).optional().default(1),
  valorArremateBRL: z.union([z.string(), z.number()]),
  statusPagamento: z.enum(['Pago', 'Pendente', 'Atrasado']).optional().default('Pendente'),
  comprovantePixUrl: z.string().optional(),
  imagemUrl: z.string().optional(),
  dataVenda: z.string().optional(),
});

const patchSaleSchema = z.object({
  id: z.string().min(1),
  descricao: z.string().trim().min(2).optional(),
  valorArremateBRL: z.union([z.string(), z.number()]).optional(),
  statusPagamento: z.enum(['Pago', 'Pendente', 'Atrasado']).optional(),
  comprovantePixUrl: z.string().optional(),
});

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const leilao = (searchParams.get('leilao') ?? '').trim();
  const statusPagamento = (searchParams.get('statusPagamento') ?? '').trim();

  const db = readDatabase();
  const filtered = db.sales.filter((s) => {
    if (q && !s.descricao.toLowerCase().includes(q) && !s.compradorNome.toLowerCase().includes(q)) return false;
    if (leilao && leilao !== 'ALL' && s.leilaoNome !== leilao) return false;
    if (statusPagamento && statusPagamento !== 'ALL' && s.statusPagamento !== statusPagamento) return false;
    return true;
  });

  const totalArrematadoCentavos = filtered.reduce((acc, s) => acc + s.valorArremateCentavos, 0);
  const leiloes = Array.from(new Set(db.sales.map((s) => s.leilaoNome)));

  return NextResponse.json({
    items: filtered.map((s) => ({
      ...s,
      valorArremateBRL: formatCentavosToBRL(s.valorArremateCentavos, true),
      custoVinculadoBRL: formatCentavosToBRL(s.custoVinculadoCentavos, true),
      lucroBRL: formatCentavosToBRL(s.lucroCentavos, true),
    })),
    totalCount: filtered.length,
    totalArrematadoCentavos,
    totalArrematadoBRL: formatCentavosToBRL(totalArrematadoCentavos, true),
    leiloes,
  });
}

export async function POST(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER']);
  if (!rbac.ok) return rbac.response;

  const body = (await request.json()) as { rows?: unknown[] } | Record<string, unknown>;
  const rawList = Array.isArray((body as { rows?: unknown[] }).rows)
    ? (body as { rows: unknown[] }).rows
    : [body];

  const toInsert: Sale[] = [];
  for (const entry of rawList) {
    const parsed = singleSaleSchema.safeParse(entry);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados de venda inválidos' }, { status: 400 });
    }
    const centavos = parseBRLToCentavos(parsed.data.valorArremateBRL);
    if (centavos === null) {
      return NextResponse.json({ error: 'Valor arrematado inválido. Use vírgula (ex: 45,00).' }, { status: 400 });
    }
    toInsert.push({
      id: `sal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: rbac.auth.userId,
      customerId: '',
      compradorNome: parsed.data.compradorNome,
      compradorTelefone: parsed.data.compradorTelefone ?? '',
      auctionId: '',
      leilaoNome: parsed.data.leilaoNome,
      descricao: parsed.data.descricao,
      quantidade: parsed.data.quantidade,
      valorArremateCentavos: centavos,
      custoVinculadoCentavos: 0,
      lucroCentavos: 0,
      statusPagamento: parsed.data.statusPagamento,
      comprovantePixUrl: parsed.data.comprovantePixUrl,
      statusConciliacao: 'Pendente',
      imagemUrl: parsed.data.imagemUrl,
      dataVenda: parsed.data.dataVenda ?? new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    });
  }

  const inserted = await insertSales(toInsert);
  return NextResponse.json({ insertedCount: inserted.length, items: inserted }, { status: 201 });
}

export async function PATCH(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const body = await request.json();
  const parsed = patchSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  if ((parsed.data.descricao || parsed.data.valorArremateBRL !== undefined) && !canEditProductDescriptions(rbac.auth.role)) {
    return NextResponse.json(
      { error: 'Perfil Tesoureiro não tem permissão para alterar descrição ou valor do item arrematado.' },
      { status: 403 }
    );
  }

  const patch: Partial<Sale> = {};
  if (parsed.data.descricao) patch.descricao = parsed.data.descricao;
  if (parsed.data.statusPagamento) patch.statusPagamento = parsed.data.statusPagamento;
  if (parsed.data.comprovantePixUrl !== undefined) patch.comprovantePixUrl = parsed.data.comprovantePixUrl;
  if (parsed.data.valorArremateBRL !== undefined) {
    const centavos = parseBRLToCentavos(parsed.data.valorArremateBRL);
    if (centavos === null) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    patch.valorArremateCentavos = centavos;
  }

  const updated = await updateSaleRecord(parsed.data.id, patch);
  if (!updated) return NextResponse.json({ error: 'Arremate não encontrado.' }, { status: 404 });
  return NextResponse.json({ item: updated });
}
