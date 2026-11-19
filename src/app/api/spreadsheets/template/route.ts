import { NextResponse } from 'next/server';
import { verifyRBAC } from '@/lib/rbac';
import { generateExcelTemplate } from '@/lib/skills/excel-skills';

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const { searchParams } = new URL(request.url);
  const mod = searchParams.get('module');
  const moduleName = mod === 'vendas' || mod === 'conciliacao' ? mod : 'compras';

  const buffer = generateExcelTemplate(moduleName);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="modelo_tdk_${moduleName}.xlsx"`,
    },
  });
}
