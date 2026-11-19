import * as XLSX from 'xlsx';
import { z } from 'zod';
import { formatCentavosToBRL, parseBRLToCentavos } from '@/lib/currency-brl';
import type {
  CardCategory,
  ParsedPurchaseDraftRow,
  ParsedSaleDraftRow,
  ParsedSpreadsheetResult,
  UploadErrorRow,
} from '@/types/tcg';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  '',
]);

const purchaseRowSchema = z.object({
  vendedor: z.string().trim().min(1, 'Local/Vendedor obrigatório'),
  descricao: z.string().trim().min(2, 'Descrição da carta obrigatória'),
  valorRaw: z.union([z.string(), z.number()]),
  statusRaw: z.string().optional(),
});

const saleRowSchema = z.object({
  compradorNome: z.string().trim().min(1, 'Nome do comprador obrigatório'),
  compradorTelefone: z.string().optional().default(''),
  leilaoNome: z.string().trim().min(1, 'Leilão de origem obrigatório'),
  descricao: z.string().trim().min(2, 'Descrição da carta obrigatória'),
  valorRaw: z.union([z.string(), z.number()]),
  statusRaw: z.string().optional(),
});

export function validateUploadMetadata(
  fileName: string,
  mimeType: string,
  fileSize: number
): string | null {
  if (fileSize <= 0) return 'Arquivo vazio.';
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return 'Arquivo excede o limite máximo de 5 MB.';
  }
  const lowerName = fileName.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return 'Extensão não suportada. Envie apenas .csv, .xls ou .xlsx.';
  }
  const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
    return `MIME type não permitido (${cleanMime}). Use .csv, .xls ou .xlsx.`;
  }
  return null;
}

export function generateExcelTemplate(
  moduleName: 'compras' | 'vendas' | 'conciliacao'
): Buffer {
  const rows = buildTemplateRows(moduleName);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = rows[0].map(() => ({ wch: 28 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Modelo_${moduleName}`);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function buildTemplateRows(moduleName: 'compras' | 'vendas' | 'conciliacao'): string[][] {
  if (moduleName === 'vendas') {
    return [
      ['Nome do Comprador', 'Telefone do Comprador', 'Leilão de Origem', 'Descrição da Carta', 'Valor Arrematado', 'Status Pagamento'],
      ['Lucas Mendes', '11999887766', 'Leilão #15 - Sexta Poké', 'Pikachu ex (054/128) PT RR NM', '45,00', 'Pago'],
    ];
  }
  if (moduleName === 'conciliacao') {
    return [
      ['ID Compra', 'ID Venda', 'Custo Alocado (BRL)'],
      ['pur-001', 'sal-001', '30,50'],
    ];
  }
  return [
    ['Local de Compra', 'Descrição da Carta', 'Valor de Compra', 'Status de Pagamento'],
    ['Smarthie TCG', 'Pikachu ex (054/128) PT RR NM', '30,50', 'Pago'],
  ];
}

export function inferCategoryFromDescription(descricao: string): CardCategory {
  const lower = descricao.toLowerCase();
  if (lower.startsWith('lote ') || lower.includes('deck ')) return 'LOTE_COMPRA';
  if (lower.includes('kit') && lower.includes('8')) return 'KIT_8_AMARELA';
  if (lower.includes('kit') && lower.includes('15')) return 'KIT_15_CINZA';
  if (lower.includes('lacrado') || lower.includes('baralho')) return 'LACRADO';
  if (/\b(ex|gx|v-astro|vmax|fullart|ar|sir)\b/i.test(lower)) return 'EX_ESPECIAL';
  return 'AVULSA';
}

function readMatrixFromBuffer(fileBuffer: Buffer, fileName: string): string[][] {
  const isCsv = fileName.toLowerCase().endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(fileBuffer.toString('utf8'), { type: 'string', raw: false })
    : XLSX.read(fileBuffer, { type: 'buffer', raw: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
}

function isSummaryOrEmptyRow(cells: string[]): boolean {
  const joined = cells.map((c) => String(c ?? '').trim()).join('');
  if (!joined) return true;
  const upper = joined.toUpperCase();
  return upper.includes('TOTAL GASTO:') || upper.startsWith('TOTAL:');
}

export function parseExcelToJSON(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  fileSize: number,
  moduleName: 'compras' | 'vendas' = 'compras'
): ParsedSpreadsheetResult {
  const metaError = validateUploadMetadata(fileName, mimeType, fileSize);
  if (metaError) {
    throw new Error(metaError);
  }
  const matrix = readMatrixFromBuffer(fileBuffer, fileName);
  if (matrix.length <= 1) {
    return emptyParseResult(moduleName, fileName);
  }
  return moduleName === 'vendas'
    ? parseSaleRows(matrix.slice(1), fileName)
    : parsePurchaseRows(matrix.slice(1), fileName);
}

function emptyParseResult(module: 'compras' | 'vendas', fileName: string): ParsedSpreadsheetResult {
  return {
    module,
    fileName,
    validRows: [],
    errors: [],
    summary: { totalRead: 0, validCount: 0, errorCount: 0, totalValorBRL: '0,00' },
  };
}

function parsePurchaseRows(rows: string[][], fileName: string): ParsedSpreadsheetResult<ParsedPurchaseDraftRow> {
  const validRows: ParsedPurchaseDraftRow[] = [];
  const errors: UploadErrorRow[] = [];
  let totalCentavos = 0;

  rows.forEach((rawCells, idx) => {
    const rowNumber = idx + 2;
    if (isSummaryOrEmptyRow(rawCells)) return;
    const candidate = {
      vendedor: String(rawCells[0] ?? '').trim(),
      descricao: String(rawCells[1] ?? '').trim(),
      valorRaw: rawCells[2] ?? '',
      statusRaw: String(rawCells[3] ?? 'Pago').trim(),
    };
    const checked = purchaseRowSchema.safeParse(candidate);
    if (!checked.success) {
      errors.push({ row: rowNumber, column: 'Estrutura', value: String(rawCells.join(' | ')), message: checked.error.issues[0]?.message ?? 'Linha inválida' });
      return;
    }
    const centavos = parseBRLToCentavos(checked.data.valorRaw);
    if (centavos === null) {
      errors.push({ row: rowNumber, column: 'Valor de Compra', value: String(candidate.valorRaw), message: 'Valor monetário inválido. Utilize formato BRL com vírgula (ex: 30,50).' });
      return;
    }
    totalCentavos += centavos;
    validRows.push({
      rowNumber,
      vendedor: checked.data.vendedor,
      descricao: checked.data.descricao,
      valorBRL: formatCentavosToBRL(centavos),
      valorCentavos: centavos,
      statusPagamento: checked.data.statusRaw?.toLowerCase().includes('pend') ? 'Pendente' : 'Pago',
      categoria: inferCategoryFromDescription(checked.data.descricao),
    });
  });

  return {
    module: 'compras',
    fileName,
    validRows,
    errors,
    summary: {
      totalRead: validRows.length + errors.length,
      validCount: validRows.length,
      errorCount: errors.length,
      totalValorBRL: formatCentavosToBRL(totalCentavos),
    },
  };
}

function parseSaleRows(rows: string[][], fileName: string): ParsedSpreadsheetResult<ParsedSaleDraftRow> {
  const validRows: ParsedSaleDraftRow[] = [];
  const errors: UploadErrorRow[] = [];
  let totalCentavos = 0;

  rows.forEach((rawCells, idx) => {
    const rowNumber = idx + 2;
    if (isSummaryOrEmptyRow(rawCells)) return;
    const candidate = {
      compradorNome: String(rawCells[0] ?? '').trim(),
      compradorTelefone: String(rawCells[1] ?? '').trim(),
      leilaoNome: String(rawCells[2] ?? '').trim(),
      descricao: String(rawCells[3] ?? '').trim(),
      valorRaw: rawCells[4] ?? '',
      statusRaw: String(rawCells[5] ?? 'Pendente').trim(),
    };
    const checked = saleRowSchema.safeParse(candidate);
    if (!checked.success) {
      errors.push({ row: rowNumber, column: 'Estrutura', value: String(rawCells.join(' | ')), message: checked.error.issues[0]?.message ?? 'Linha inválida' });
      return;
    }
    const centavos = parseBRLToCentavos(checked.data.valorRaw);
    if (centavos === null) {
      errors.push({ row: rowNumber, column: 'Valor Arrematado', value: String(candidate.valorRaw), message: 'Valor inválido. Use formato BRL com vírgula (ex: 45,00).' });
      return;
    }
    totalCentavos += centavos;
    validRows.push({
      rowNumber,
      compradorNome: checked.data.compradorNome,
      compradorTelefone: checked.data.compradorTelefone,
      leilaoNome: checked.data.leilaoNome,
      descricao: checked.data.descricao,
      valorBRL: formatCentavosToBRL(centavos),
      valorCentavos: centavos,
      statusPagamento: checked.data.statusRaw?.toLowerCase().includes('pag') ? 'Pago' : 'Pendente',
    });
  });

  return {
    module: 'vendas',
    fileName,
    validRows,
    errors,
    summary: {
      totalRead: validRows.length + errors.length,
      validCount: validRows.length,
      errorCount: errors.length,
      totalValorBRL: formatCentavosToBRL(totalCentavos),
    },
  };
}
