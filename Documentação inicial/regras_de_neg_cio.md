# Regras de Negócio (Business Rules) - Sistema de Leilões TCG

## 1. O que é o Projeto?
O sistema é uma plataforma web (SaaS interno) projetada para gerenciar todo o ciclo de vida comercial de uma empresa que realiza leilões de cartas Pokémon TCG via WhatsApp. O objetivo é substituir planilhas manuais e descentralizadas por um fluxo de dados estruturado, auditável e colaborativo entre os sócios.

## 2. Ciclo de Vida da Operação

### Fase 1: Aquisição (Compras / Estoque)
- Os sócios adquirem cartas em outros leilões, lojas ou de colecionadores.
- Toda carta comprada gera um "Custo".
- **Regra:** O sistema deve registrar o Vendedor (Local), a Descrição exata da carta, o Valor de Compra (em formato BRL, ex: 10,50) e o Status de Pagamento (se a empresa já pagou o fornecedor).
- **Entrada:** Pode ser unitária ou em lote (via upload de arquivo `.xlsx` com template gerado pelo próprio sistema).

### Fase 2: Venda (Arremates no Leilão)
- As cartas são leiloadas no WhatsApp.
- O sistema registra quem ganhou (Nome/Telefone), qual foi a carta, a qual leilão pertence e o Valor Arrematado.
- **Regra:** A entrada deve ser flexível (manual ou via template `.xlsx`) para garantir agilidade após o fim de um leilão.

### Fase 3: Conciliação (Contabilidade / De-Para)
- É o coração do negócio. O sistema precisa cruzar as "Entradas" (Fase 1) com as "Saídas" (Fase 2).
- **Regra de Lucratividade:** O lucro é calculado exclusivamente pela fórmula: `Valor Arrematado - Valor de Compra`.
- **Match:** O sistema deve tentar sugerir o cruzamento automaticamente baseado na semelhança da descrição da carta, mas deve SEMPRE permitir a vinculação ou correção manual.

### Fase 4: Fechamento e Tesouraria (Repasses)
- Cada leilão tem um Sócio Responsável.
- **Regra de Repasse:** A tesoureira consolida o valor total movimentado no leilão e repassa aos sócios e parceiros. 
- O sistema precisa exibir o total esperado vs. o total efetivamente pago/arrematado para evitar furos no caixa.

## 3. Formatação Monetária
- O Brasil utiliza **vírgula** como separador decimal.
- É regra de negócio estrita que o sistema não corrompa valores como "30,50". A interface deve receber, exportar e exibir com vírgula, enquanto o banco de dados armazena da forma técnica segura, sob a responsabilidade do backend de fazer o parse correto.