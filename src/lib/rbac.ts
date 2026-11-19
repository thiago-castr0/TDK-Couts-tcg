import { NextResponse } from 'next/server';
import type { Role, UserProfile } from '@/types/tcg';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'usr-thiago-admin',
    nome: 'Thiago Couto',
    email: 'thiago@tdkcoutstcg.com.br',
    role: 'ADMIN',
    pixKey: 'pix-thiago@tdkcoutstcg.com.br',
    comissaoPct: 50,
  },
  {
    id: 'usr-gabriele-partner',
    nome: 'Gabriele Silva',
    email: 'gabriele@tdkcoutstcg.com.br',
    role: 'PARTNER',
    pixKey: 'pix-gabriele@tdkcoutstcg.com.br',
    comissaoPct: 50,
  },
  {
    id: 'usr-marina-treasurer',
    nome: 'Marina (Tesouraria)',
    email: 'tesouraria@tdkcoutstcg.com.br',
    role: 'TREASURER',
    pixKey: 'tesouraria@tdkcoutstcg.com.br',
    comissaoPct: 0,
  },
];

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
  const headerUserId = request.headers.get('x-tcg-user-id');
  const headerRole = request.headers.get('x-tcg-role') as Role | null;
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const sessionRaw = cookies['tcg_session'];

  let userId = headerUserId ?? '';
  let role = headerRole;

  if (!userId && sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw) as { userId?: string; role?: Role };
      userId = parsed.userId ?? '';
      role = parsed.role ?? null;
    } catch {
      return null;
    }
  }

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
