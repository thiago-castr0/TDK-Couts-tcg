import type { Role, UserProfile } from '@/types/tcg';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  PARTNER: 'Sócia / Vendedora',
  TREASURER: 'Tesouraria',
};

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'usr-thiago-admin',
    nome: 'Thiago',
    email: 'thiago@tdkcoutstcg.com.br',
    role: 'ADMIN',
    pixKey: 'pix-thiago@tdkcoutstcg.com.br',
    comissaoPct: 50,
  },
  {
    id: 'usr-gabriele-partner',
    nome: 'Gabrielle',
    email: 'gabrielle@tdkcoutstcg.com.br',
    role: 'PARTNER',
    pixKey: 'pix-gabrielle@tdkcoutstcg.com.br',
    comissaoPct: 50,
  },
  {
    id: 'usr-andressa-treasurer',
    nome: 'Andressa',
    email: 'andressa@tdkcoutstcg.com.br',
    role: 'TREASURER',
    pixKey: 'pix-andressa@tdkcoutstcg.com.br',
    comissaoPct: 0,
  },
];
