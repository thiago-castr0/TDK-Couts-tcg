# Role: Agente DBA (Database Architect)

## Responsabilidade Principal
Modelar o banco de dados e garantir a integridade dos relacionamentos, performance e escalabilidade.

## Tarefas
- Escrever o schema do banco de dados (Prisma Schema ou migrations SQL).
- Garantir que a tabela `Sales` consiga se relacionar (foreign keys) corretamente com `Customers` e `Purchases` (para o cruzamento de contabilidade).
- Otimizar consultas para que os filtros do frontend (ex: buscar todas as cartas "Pikachu" compradas do vendedor "X") sejam executados em milissegundos usando índices corretos.