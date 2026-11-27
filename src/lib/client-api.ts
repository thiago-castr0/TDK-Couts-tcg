import type { Role } from '@/types/tcg';

export interface ActiveSession {
  userId: string;
  nome: string;
  role: Role;
}

export const INITIAL_SESSION: ActiveSession = {
  userId: 'usr-thiago-admin',
  nome: 'Thiago',
  role: 'ADMIN',
};

export async function apiFetch<T>(
  url: string,
  session: ActiveSession,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-tcg-user-id', session.userId);
  headers.set('x-tcg-role', session.role);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { credentials: 'same-origin', ...options, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Erro HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
