/**
 * Utilitários estritos para localização monetária brasileira (BRL com vírgula).
 * Regra crítica do Harness: entradas, planilhas e saídas usam vírgula decimal.
 */

export function parseBRLToCentavos(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.round(raw * 100);
  }
  const cleaned = raw.trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (!cleaned || /^-/.test(cleaned)) return null;
  if (!/^[0-9.,]+$/.test(cleaned)) return null;

  const normalized = normalizeNumericString(cleaned);
  if (normalized === null) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function normalizeNumericString(cleaned: string): string | null {
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length !== 2 || parts[1].length > 2) return null;
    const integerPart = parts[0].replace(/\./g, '');
    if (!/^\d+$/.test(integerPart) || !/^\d{1,2}$/.test(parts[1])) return null;
    return `${integerPart}.${parts[1].padEnd(2, '0')}`;
  }
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2 && /^\d+$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
      return `${parts[0]}.${parts[1].padEnd(2, '0')}`;
    }
    const asThousands = cleaned.replace(/\./g, '');
    return /^\d+$/.test(asThousands) ? asThousands : null;
  }
  return /^\d+$/.test(cleaned) ? cleaned : null;
}

export function formatCentavosToBRL(centavos: number, withPrefix = false): string {
  const safe = Number.isFinite(centavos) ? Math.round(centavos) : 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const reais = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  const reaisFormatted = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = isNegative ? '-' : '';
  const numeric = `${sign}${reaisFormatted},${cents}`;
  return withPrefix ? `R$ ${numeric}` : numeric;
}

export function sanitizeBRLInput(raw: string): string {
  const onlyValid = raw.replace(/[^0-9,]/g, '');
  const commaIndex = onlyValid.indexOf(',');
  if (commaIndex === -1) return onlyValid;
  const before = onlyValid.slice(0, commaIndex + 1);
  const after = onlyValid.slice(commaIndex + 1).replace(/,/g, '').slice(0, 2);
  return `${before}${after}`;
}
