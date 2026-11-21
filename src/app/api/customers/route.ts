import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatCentavosToBRL } from '@/lib/currency-brl';
import { ensureHydratedDatabase, insertCustomerRecord } from '@/lib/db-store';
import { verifyRBAC } from '@/lib/rbac';

const createCustomerSchema = z.object({
  nome: z.string().trim().min(2, 'Nome do cliente é obrigatório'),
  telefone: z.string().trim().min(8, 'Telefone/WhatsApp é obrigatório'),
  handleSocial: z.string().optional(),
  observacoes: z.string().optional(),
});

function buildWhatsAppMessage(customerName: string, items: Array<{ descricao: string; valorArremateCentavos: number }>, pixKey: string): string {
  const lines = items.map(
    (item) => `- 1x ${item.descricao} - ${formatCentavosToBRL(item.valorArremateCentavos, true)}`
  );
  const total = items.reduce((acc, i) => acc + i.valorArremateCentavos, 0);
  return [
    `Olá, ${customerName}! Parabéns pelos arremates no leilão da TDK & COUTS TCG. 🥳`,
    'Aqui está o seu resumo:',
    ...lines,
    '',
    `Total do pedido: ${formatCentavosToBRL(total, true)}`,
    `Chave PIX: ${pixKey}`,
  ].join('\n');
}

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const db = await ensureHydratedDatabase();
  const pixKey = db.profiles[0]?.pixKey || 'pix@tdkcoutstcg.com.br';

  const enriched = db.customers.map((customer) => {
    const customerSales = db.sales.filter((s) => s.customerId === customer.id || s.compradorNome.toLowerCase() === customer.nome.toLowerCase());
    const totalCentavos = customerSales.reduce((acc, s) => acc + s.valorArremateCentavos, 0);
    const pendenteCentavos = customerSales
      .filter((s) => s.statusPagamento !== 'Pago')
      .reduce((acc, s) => acc + s.valorArremateCentavos, 0);
    const itemsForCharge = customerSales.filter((s) => s.statusPagamento !== 'Pago');
    const sourceItems = itemsForCharge.length > 0 ? itemsForCharge : customerSales;

    return {
      ...customer,
      totalCompras: customerSales.length,
      totalGastoCentavos: totalCentavos,
      totalGastoBRL: formatCentavosToBRL(totalCentavos, true),
      totalPendenteCentavos: pendenteCentavos,
      totalPendenteBRL: formatCentavosToBRL(pendenteCentavos, true),
      whatsappSummary: buildWhatsAppMessage(customer.nome, sourceItems, pixKey),
      historico: customerSales.map((s) => ({
        id: s.id,
        descricao: s.descricao,
        leilaoNome: s.leilaoNome,
        valorArremateBRL: formatCentavosToBRL(s.valorArremateCentavos, true),
        statusPagamento: s.statusPagamento,
        dataVenda: s.dataVenda,
      })),
    };
  });

  return NextResponse.json({ items: enriched });
}

export async function POST(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER']);
  if (!rbac.ok) return rbac.response;

  const body = await request.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const created = await insertCustomerRecord(parsed.data);
  return NextResponse.json({ item: created }, { status: 201 });
}
