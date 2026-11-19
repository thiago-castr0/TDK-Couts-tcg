import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatCentavosToBRL, parseBRLToCentavos } from '@/lib/currency-brl';
import {
  deletePurchaseRecord,
  insertPurchases,
  readDatabase,
  updatePurchaseRecord,
} from '@/lib/db-store';
import { canEditProductDescriptions, verifyRBAC } from '@/lib/rbac';
import { inferCategoryFromDescription } from '@/lib/skills/excel-skills';
import type { CardCategory, CardCondition, Purchase } from '@/types/tcg';

const singlePurchaseSchema = z.object({
  vendedor: z.string().trim().min(1, 'Vendedor é obrigatório'),
  descricao: z.string().trim().min(2, 'Descrição é obrigatória'),
  valorBRL: z.union([z.string(), z.number()]),
  valorLigaBRL: z.union([z.string(), z.number()]).optional().nullable(),
  categoria: z.enum(['AVULSA', 'EX_ESPECIAL', 'BORDA_AMARELA', 'KIT_8_AMARELA', 'KIT_15_CINZA', 'LOTE_COMPRA', 'LACRADO']).optional(),
  condicao: z.enum(['NM', 'SP', 'MP', 'HP', 'D']).optional().default('NM'),
  colecaoNumero: z.string().optional(),
  imagemUrl: z.string().optional(),
  statusPagamento: z.enum(['Pago', 'Pendente']).optional().default('Pago'),
  dataCompra: z.string().optional(),
});

const patchPurchaseSchema = z.object({
  id: z.string().min(1),
  vendedor: z.string().trim().min(1).optional(),
  descricao: z.string().trim().min(2).optional(),
  valorBRL: z.union([z.string(), z.number()]).optional(),
  statusPagamento: z.enum(['Pago', 'Pendente']).optional(),
  statusEstoque: z.enum(['Disponivel', 'Parcial', 'Vendido']).optional(),
});

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const vendedor = (searchParams.get('vendedor') ?? '').trim();
  const statusPagamento = (searchParams.get('statusPagamento') ?? '').trim();
  const categoria = (searchParams.get('categoria') ?? '').trim();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') ?? '50')));

  const db = readDatabase();
  const grandTotalCentavos = db.purchases.reduce((acc, p) => acc + p.valorCompraCentavos, 0);
  const vendedores = Array.from(new Set(db.purchases.map((p) => p.vendedor))).sort((a, b) => a.localeCompare(b));

  const filtered = db.purchases.filter((item) => {
    if (q && !item.descricao.toLowerCase().includes(q) && !item.vendedor.toLowerCase().includes(q)) return false;
    if (vendedor && vendedor !== 'ALL' && item.vendedor !== vendedor) return false;
    if (statusPagamento && statusPagamento !== 'ALL' && item.statusPagamento !== statusPagamento) return false;
    if (categoria && categoria !== 'ALL' && item.categoria !== categoria) return false;
    return true;
  });

  const filteredTotalCentavos = filtered.reduce((acc, p) => acc + p.valorCompraCentavos, 0);
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit).map((item) => ({
    ...item,
    valorCompraBRL: formatCentavosToBRL(item.valorCompraCentavos, true),
    valorAlocadoBRL: formatCentavosToBRL(item.valorAlocadoCentavos, true),
  }));

  return NextResponse.json({
    items: paged,
    totalCount: filtered.length,
    totalAllCount: db.purchases.length,
    page,
    limit,
    filteredTotalCentavos,
    filteredTotalBRL: formatCentavosToBRL(filteredTotalCentavos, true),
    grandTotalCentavos,
    grandTotalBRL: formatCentavosToBRL(grandTotalCentavos, true),
    vendedores,
  });
}

export async function POST(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER']);
  if (!rbac.ok) return rbac.response;

  const body = (await request.json()) as { rows?: unknown[] } | Record<string, unknown>;
  const rawList = Array.isArray((body as { rows?: unknown[] }).rows)
    ? ((body as { rows: unknown[] }).rows)
    : [body];

  const toInsert: Purchase[] = [];
  for (const entry of rawList) {
    const parsed = singlePurchaseSchema.safeParse(entry);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    }
    const centavos = parseBRLToCentavos(parsed.data.valorBRL);
    if (centavos === null) {
      return NextResponse.json({ error: 'Valor de Compra inválido. Use vírgula (ex: 30,50).' }, { status: 400 });
    }
    const ligaCentavos = parsed.data.valorLigaBRL ? parseBRLToCentavos(parsed.data.valorLigaBRL) : null;
    toInsert.push({
      id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: rbac.auth.userId,
      vendedor: parsed.data.vendedor,
      descricao: parsed.data.descricao,
      categoria: (parsed.data.categoria ?? inferCategoryFromDescription(parsed.data.descricao)) as CardCategory,
      condicao: (parsed.data.condicao ?? 'NM') as CardCondition,
      colecaoNumero: parsed.data.colecaoNumero,
      valorCompraCentavos: centavos,
      valorAlocadoCentavos: 0,
      valorLigaCentavos: ligaCentavos,
      statusPagamento: parsed.data.statusPagamento,
      statusEstoque: 'Disponivel',
      imagemUrl: parsed.data.imagemUrl,
      dataCompra: parsed.data.dataCompra ?? new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    });
  }

  const inserted = await insertPurchases(toInsert);
  return NextResponse.json({ insertedCount: inserted.length, items: inserted }, { status: 201 });
}

export async function PATCH(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const body = await request.json();
  const parsed = patchPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload inválido' }, { status: 400 });
  }

  const triesToAlterProduct = Boolean(parsed.data.descricao || parsed.data.vendedor || parsed.data.valorBRL !== undefined);
  if (triesToAlterProduct && !canEditProductDescriptions(rbac.auth.role)) {
    return NextResponse.json(
      { error: 'Perfil Tesoureiro não tem permissão para alterar descrições ou dados de produtos.' },
      { status: 403 }
    );
  }

  const patch: Partial<Purchase> = {};
  if (parsed.data.vendedor) patch.vendedor = parsed.data.vendedor;
  if (parsed.data.descricao) patch.descricao = parsed.data.descricao;
  if (parsed.data.statusPagamento) patch.statusPagamento = parsed.data.statusPagamento;
  if (parsed.data.statusEstoque) patch.statusEstoque = parsed.data.statusEstoque;
  if (parsed.data.valorBRL !== undefined) {
    const centavos = parseBRLToCentavos(parsed.data.valorBRL);
    if (centavos === null) return NextResponse.json({ error: 'Valor inválido em BRL.' }, { status: 400 });
    patch.valorCompraCentavos = centavos;
  }

  const updated = await updatePurchaseRecord(parsed.data.id, patch);
  if (!updated) return NextResponse.json({ error: 'Compra não encontrada.' }, { status: 404 });
  return NextResponse.json({ item: updated });
}

export async function DELETE(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN']);
  if (!rbac.ok) return rbac.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const removed = await deletePurchaseRecord(id);
  if (!removed) return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
