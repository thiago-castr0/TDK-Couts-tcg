import crypto from 'node:crypto';
import type { Role } from '@/types/tcg';

const FALLBACK_SESSION_SECRET = 'tdk-couts-tcg-session-signing-key-v1';
const DEFAULT_LOGIN_PASSWORD = process.env.TCG_LOGIN_PASSWORD || 'admin123';

function getSigningSecret(): string {
  return process.env.TCG_BACKEND_SECRET || FALLBACK_SESSION_SECRET;
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

/** Verifica a senha informada no login usando comparação em tempo constante. */
export function verifyLoginPassword(password: string): boolean {
  const expected = sha256Buffer(DEFAULT_LOGIN_PASSWORD);
  const received = sha256Buffer(password);
  return crypto.timingSafeEqual(expected, received);
}

function computeSignature(payload: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload, 'utf8')
    .digest('hex');
}

/** Gera valor assinado para o cookie `tcg_session`. */
export function signSessionToken(userId: string, role: Role): string {
  const payload = JSON.stringify({ userId, role });
  const sig = computeSignature(payload);
  return JSON.stringify({ userId, role, sig });
}

/** Valida assinatura HMAC do cookie `tcg_session` e retorna `{ userId, role }`. */
export function verifySessionToken(rawCookie: string): { userId: string; role: Role } | null {
  try {
    const parsed = JSON.parse(rawCookie) as { userId?: string; role?: Role; sig?: string };
    if (!parsed.userId || !parsed.role || !parsed.sig) return null;
    const expectedSig = computeSignature(
      JSON.stringify({ userId: parsed.userId, role: parsed.role })
    );
    const sigBuf = Buffer.from(parsed.sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    return { userId: parsed.userId, role: parsed.role };
  } catch {
    return null;
  }
}
