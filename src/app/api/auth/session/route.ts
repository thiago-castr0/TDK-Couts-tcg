import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_PROFILES, verifyRBAC } from '@/lib/rbac';

const loginSchema = z.object({
  userId: z.string().min(1),
});

export async function GET(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  return NextResponse.json({
    authenticated: true,
    currentUser: rbac.auth.profile,
    availableProfiles: DEFAULT_PROFILES,
  });
}

export async function POST(request: Request) {
  const rbac = verifyRBAC(request, ['ADMIN', 'PARTNER', 'TREASURER']);
  if (!rbac.ok) return rbac.response;

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });
  }

  const profile = DEFAULT_PROFILES.find((p) => p.id === parsed.data.userId);
  if (!profile) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const response = NextResponse.json({ authenticated: true, currentUser: profile });
  response.cookies.set('tcg_session', JSON.stringify({ userId: profile.id, role: profile.role }), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
