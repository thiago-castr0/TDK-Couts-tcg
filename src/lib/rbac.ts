import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-server';
import { DEFAULT_PROFILES } from '@/lib/users';
import type { Role, UserProfile } from '@/types/tcg';

export { DEFAULT_PROFILES };

export interface AuthContext {
  userId: string;
  role: Role;
  profile: UserProfile;
}

export type RBACResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse };

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      acc[key] = val;
    }
    return acc;
  }, {});
}

export function extractAuthContext(request: Request): AuthContext | null {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const sessionRaw = cookies['tcg_session'];
  const verifiedCookie = sessionRaw ? verifySessionToken(sessionRaw) : null;

  const headerUserId = request.headers.get('x-tcg-user-id');
  const headerRole = request.headers.get('x-tcg-role') as Role | null;

  const userId = verifiedCookie?.userId ?? headerUserId ?? '';
  const role = verifiedCookie?.role ?? headerRole;

  if (!userId || !role) return null;
  const profile = DEFAULT_PROFILES.find((p) => p.id === userId && p.role === role);
  if (!profile) {
    if (!['ADMIN', 'PARTNER', 'TREASURER'].includes(role)) return null;
    return {
      userId,
      role,
      profile: {
        id: userId,
        nome: userId,
        email: `${userId}@tdkcoutstcg.com.br`,
        role,
        pixKey: '',
        comissaoPct: 50,
      },
    };
  }
  return { userId: profile.id, role: profile.role, profile };
}

export function verifyRBAC(request: Request, allowedRoles: Role[]): RBACResult {
  const auth = extractAuthContext(request);
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Não autenticado. Envie sessão ou credenciais RBAC válidas.' },
        { status: 401 }
      ),
    };
  }
  if (!allowedRoles.includes(auth.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Acesso negado para o perfil ${auth.role}.` },
        { status: 403 }
      ),
    };
  }
  return { ok: true, auth };
}

export function canEditProductDescriptions(role: Role): boolean {
  return role === 'ADMIN' || role === 'PARTNER';
}
