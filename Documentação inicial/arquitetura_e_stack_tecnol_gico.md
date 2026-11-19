# Arquitetura do Sistema

## 1. Stack Sugerido
- **Frontend:** Next.js (React) + Tailwind CSS + Shadcn UI (para componentes rápidos e bonitos como Data Grids, Modais e Filtros).
- **Backend:** Node.js (Express ou NestJS) ou Next.js API Routes (Serverless) para simplificar o ecossistema.
- **Banco de Dados:** PostgreSQL (Relacional é ideal para cruzar Dados de Compra vs Dados de Venda sem perder a integridade).
- **ORM:** Prisma ou Drizzle (para tipagem forte e segurança nas queries).
- **Manipulação de Arquivos (Planilhas):** Biblioteca `SheetJS` (xlsx) para gerar modelos em branco e ler dados no frontend/backend.

## 2. Estrutura de Banco de Dados (Entidades Principais)
- `Users`: (id, nome, email, role, senha)
- `Customers`: (id, nome, telefone, data_cadastro)
- `Purchases`: (id, user_id, vendedor, descricao, valor_compra, data, status)
- `Sales`: (id, user_id, customer_id, purchase_id (nullable, para o de-para), descricao, valor_arremate, leilao_nome, data)
- `Auctions_Treasury`: (id, responsavel_id, nome_leilao, data, total_esperado, total_arrematado, status_repasse)

## 3. Fluxo de Dados (Upload de Planilha)
1. Frontend solicita modelo -> Backend gera arquivo XLSX com os cabeçalhos exatos -> Usuário faz download.
2. Usuário preenche -> Faz upload -> Frontend lê com SheetJS.
3. Frontend valida os dados básicos -> Envia JSON estruturado para o Backend.
4. Backend faz validação final de segurança -> Insere em lote (Bulk Insert) no PostgreSQL.