import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatCentavosToBRL } from '@/lib/currency-brl';
import { ensureHydratedDatabase, updateAuctionRecord } from '@/lib/db-store';
import { verifyRBAC } from '@/lib/rbac';
import { calculateTreasuryPayouts } from '@/lib/skills/accounting-skills';

const updateAuctionSchema = z.object({
  id: z.string().min(1),
  statusRepasse: z.enum(['Pendente', 'Em Conferencia', 'Repassado']),
});

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const db = await ensureHydratedDatabase();
  const partnerSummaries = calculateTreasuryPayouts(db.auctions, db.sales, db.profiles);

  const auctions = db.auctions.map((auc) => {
    const auctionSales = db.sales.filter((s) => s.auctionId === auc.id);
    const arrematado = auctionSales.reduce((acc, s) => acc + s.valorArremateCentavos, 0) || auc.totalArrematadoCentavos;
    const pago = auctionSales.filter((s) => s.statusPagamento === 'Pago').reduce((acc, s) => acc + s.valorArremateCentavos, 0);
    const pendente = Math.max(0, arrematado - pago);
    const custo = auctionSales.reduce((acc, s) => acc + s.custoVinculadoCentavos, 0);
    const lucro = auctionSales.reduce((acc, s) => acc + (s.statusConciliacao === 'Conciliado' ? s.lucroCentavos : 0), 0);

    return {
      ...auc,
      totalEsperadoBRL: formatCentavosToBRL(auc.totalEsperadoCentavos, true),
      totalArrematadoCentavos: arrematado,
      totalArrematadoBRL: formatCentavosToBRL(arrematado, true),
      totalPagoPixCentavos: pago,
      totalPagoPixBRL: formatCentavosToBRL(pago, true),
      totalPendenteCentavos: pendente,
      totalPendenteBRL: formatCentavosToBRL(pendente, true),
      custoVinculadoBRL: formatCentavosToBRL(custo, true),
      lucroLiquidoCentavos: lucro,
      lucroLiquidoBRL: formatCentavosToBRL(lucro, true),
      totalItens: auctionSales.length,
    };
  });

  const totalInvestidoCentavos = db.purchases.reduce((acc, p) => acc + p.valorCompraCentavos, 0);
  const totalArrematadoGlobalCentavos = db.sales.reduce((acc, s) => acc + s.valorArremateCentavos, 0);
  const totalPendenteReceberCentavos = db.sales
    .filter((s) => s.statusPagamento !== 'Pago')
    .reduce((acc, s) => acc + s.valorArremateCentavos, 0);
  const totalLucroRealizadoCentavos = db.sales
    .filter((s) => s.statusConciliacao === 'Conciliado')
    .reduce((acc, s) => acc + s.lucroCentavos, 0);

  return NextResponse.json({
    auctions,
    partnerSummaries,
    kpis: {
      totalInvestidoCentavos,
      totalInvestidoBRL: formatCentavosToBRL(totalInvestidoCentavos, true),
      totalArrematadoGlobalCentavos,
      totalArrematadoGlobalBRL: formatCentavosToBRL(totalArrematadoGlobalCentavos, true),
      totalPendenteReceberCentavos,
      totalPendenteReceberBRL: formatCentavosToBRL(totalPendenteReceberCentavos, true),
      totalLucroRealizadoCentavos,
      totalLucroRealizadoBRL: formatCentavosToBRL(totalLucroRealizadoCentavos, true),
    },
  });
}

export async function PATCH(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const body = await request.json();
  const parsed = updateAuctionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos para atualizar repasse.' }, { status: 400 });
  }

  const updated = await updateAuctionRecord(parsed.data.id, { statusRepasse: parsed.data.statusRepasse });
  if (!updated) return NextResponse.json({ error: 'Leilão não encontrado.' }, { status: 404 });
  return NextResponse.json({ item: updated });
}
