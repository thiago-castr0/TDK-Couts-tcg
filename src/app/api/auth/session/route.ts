import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signSessionToken, verifyLoginPassword } from '@/lib/auth-server';
import { DEFAULT_PROFILES, verifyRBAC } from '@/lib/rbac';

const loginSchema = z.object({
  userId: z.string().trim().min(1, 'Selecione um usuário.'),
  password: z.string().min(1, 'Informe a senha.'),
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
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados de login inválidos.' },
      { status: 400 }
    );
  }

  const normalized = parsed.data.userId.toLowerCase();
  const profile = DEFAULT_PROFILES.find(
    (p) =>
      p.id === parsed.data.userId ||
      p.nome.toLowerCase() === normalized ||
      p.email.toLowerCase() === normalized
  );

  if (!profile || !verifyLoginPassword(parsed.data.password)) {
    return NextResponse.json(
      { error: 'Usuário ou senha incorretos. Verifique e tente novamente.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ authenticated: true, currentUser: profile });
  response.cookies.set('tcg_session', signSessionToken(profile.id, profile.role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set('tcg_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
