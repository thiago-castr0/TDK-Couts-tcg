import { NextResponse } from 'next/server';
import { verifyRBAC } from '@/lib/rbac';
import { parseExcelToJSON } from '@/lib/skills/excel-skills';

export async function POST(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER']);
  if (!rbac.ok) return rbac.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const mod = String(formData.get('module') ?? 'compras');
    const moduleName = mod === 'vendas' ? 'vendas' : 'compras';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = parseExcelToJSON(buffer, file.name, file.type, file.size, moduleName);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar planilha.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
