import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TDK & COUTS TCG — Gestão de Leilões Pokémon',
  description: 'Plataforma de gestão de estoque, leilões, contabilidade De-Para e tesouraria para cartas Pokémon TCG.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-[#130924] dark:text-slate-100">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
