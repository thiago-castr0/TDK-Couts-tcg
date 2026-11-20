import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatCentavosToBRL, parseBRLToCentavos } from '@/lib/currency-brl';
import { applyReconciliationLinks, readDatabase } from '@/lib/db-store';
import { verifyRBAC } from '@/lib/rbac';
import { crossReferenceAccounting } from '@/lib/skills/accounting-skills';

const reconcilePayloadSchema = z.object({
  saleId: z.string().min(1),
  links: z.array(
    z.object({
      purchaseId: z.string().min(1),
      custoAlocadoBRL: z.union([z.string(), z.number()]),
      tipoMatch: z.enum(['AUTO', 'MANUAL', 'RATEIO_LOTE']).default('MANUAL'),
      score: z.number().optional(),
    })
  ).min(1, 'Selecione ao menos uma compra para conciliar'),
});

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const db = readDatabase();
  const suggestions = crossReferenceAccounting(db.purchases, db.sales);

  const reconciledSales = db.sales
    .filter((s) => s.statusConciliacao === 'Conciliado')
    .map((s) => ({
      ...s,
      valorArremateBRL: formatCentavosToBRL(s.valorArremateCentavos, true),
      custoVinculadoBRL: formatCentavosToBRL(s.custoVinculadoCentavos, true),
      lucroBRL: formatCentavosToBRL(s.lucroCentavos, true),
    }));

  const pendingSales = db.sales
    .filter((s) => s.statusConciliacao === 'Pendente')
    .map((s) => ({
      ...s,
      valorArremateBRL: formatCentavosToBRL(s.valorArremateCentavos, true),
    }));

  const availablePurchases = db.purchases
    .filter((p) => p.statusEstoque !== 'Vendido')
    .map((p) => ({
      ...p,
      valorCompraBRL: formatCentavosToBRL(p.valorCompraCentavos, true),
      saldoDisponivelCentavos: Math.max(0, p.valorCompraCentavos - p.valorAlocadoCentavos),
      saldoDisponivelBRL: formatCentavosToBRL(Math.max(0, p.valorCompraCentavos - p.valorAlocadoCentavos), true),
    }));

  const lucroTotalCentavos = reconciledSales.reduce((acc, s) => acc + s.lucroCentavos, 0);

  return NextResponse.json({
    suggestions,
    reconciledSales,
    pendingSales,
    availablePurchases,
    lucroTotalCentavos,
    lucroTotalBRL: formatCentavosToBRL(lucroTotalCentavos, true),
  });
}

export async function POST(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER']);
  if (!rbac.ok) return rbac.response;

  const body = await request.json();
  const parsed = reconcilePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload inválido' }, { status: 400 });
  }

  const normalizedLinks = [];
  for (const link of parsed.data.links) {
    const custoCentavos = parseBRLToCentavos(link.custoAlocadoBRL);
    if (custoCentavos === null) {
      return NextResponse.json({ error: 'Custo alocado inválido. Use vírgula (ex: 22,00).' }, { status: 400 });
    }
    normalizedLinks.push({
      purchaseId: link.purchaseId,
      custoAlocadoCentavos: custoCentavos,
      tipoMatch: link.tipoMatch,
      score: link.score,
    });
  }

  const result = await applyReconciliationLinks(parsed.data.saleId, normalizedLinks);
  if (!result) return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 });

  return NextResponse.json({
    sale: {
      ...result.sale,
      valorArremateBRL: formatCentavosToBRL(result.sale.valorArremateCentavos, true),
      custoVinculadoBRL: formatCentavosToBRL(result.sale.custoVinculadoCentavos, true),
      lucroBRL: formatCentavosToBRL(result.sale.lucroCentavos, true),
    },
    reconciliations: result.reconciliations,
  });
}
