# Product Requirements Document (PRD) - Sistema de Gestão de Leilões TCG

## 1. Visão Geral
Plataforma web para gestão de estoque, controle financeiro e tesouraria de uma empresa de leilões de cartas Pokémon TCG no WhatsApp. O sistema substituirá controles manuais em planilhas, permitindo automação, colaboração entre sócios e escalabilidade futura.

## 2. Objetivos
- Centralizar o controle de compras (cartas adquiridas) e vendas (cartas arrematadas).
- Automatizar a entrada de dados via upload de planilhas (XLSX/CSV) e permitir entrada manual.
- Calcular margens de lucro de forma automatizada (cruzamento de compra vs. venda).
- Gerenciar repasses financeiros para os sócios (Tesouraria).
- Manter uma base de clientes organizada.

## 3. Tipos de Usuários e Permissões (Roles)
- **Admin:** Acesso total ao sistema, configurações, permissionamento e exclusão de dados sensíveis.
- **Vendedor/Sócio:** Pode cadastrar compras, vendas, gerenciar seus leilões e ver seus próprios repasses.
- **Tesoureiro:** Acesso aos módulos financeiros, visualização de totais arrecadados, cálculo de repasses e lucro, sem permissão para alterar descrições de produtos.

## 4. Módulos e Funcionalidades Core

### 4.1. Módulo: Minhas Compras (Entrada de Estoque)
- **Funcionalidade:** Registro de cartas adquiridas em leilões externos ou compras diretas.
- **Campos:** Local/Vendedor, Descrição da Carta, Valor de Compra, Status.
- **Ações:** 
  - Cadastro manual (único ou em lote).
  - Download de modelo de planilha padrão.
  - Upload de planilha preenchida para carga automática no banco.
- **Visualização:** Lista (Data Grid) com filtros por Vendedor, Descrição e Valor. Exibição do "Total Gasto" no rodapé.

### 4.2. Módulo: Cartas Arrematadas (Saída/Venda)
- **Funcionalidade:** Registro de cartas vendidas nos próprios leilões.
- **Campos:** Nome do Comprador, Telefone do Comprador, Descrição da Carta, Valor Arrematado, Leilão de Origem.
- **Ações:** Cadastro manual e via upload de planilha (download de modelo -> preenchimento -> upload).

### 4.3. Módulo: Contabilidade (De-Para / Lucratividade)
- **Funcionalidade:** Cruzar cartas do módulo "Compras" com cartas do módulo "Arrematadas".
- **Lógica:** Subtrair [Valor de Compra] do [Valor Arrematado] para exibir o [Lucro/Prejuízo].
- **Ações:** 
  - Match automático baseado na descrição.
  - Match manual (vincular uma compra a uma venda).
  - Lançamento em lote via planilha para conciliação.

### 4.4. Módulo: Cadastro de Clientes
- **Funcionalidade:** Banco de dados de clientes (arrematantes).
- **Campos:** Nome, Telefone/WhatsApp, Histórico de Compras.
- **Relacionamento:** Alimenta automaticamente o campo "Nome do Comprador" no módulo de vendas.

### 4.5. Módulo: Tesouraria (Repasses)
- **Funcionalidade:** Controle de fechamento de leilões e repasses aos sócios.
- **Campos:** Responsável pelo Leilão (ex: Gabriele, Thiago), ID/Nome do Leilão, Data, Valor Total do Leilão (esperado), Valor Arrematado (real), Subtotais.
- **Objetivo:** Informar à tesouraria quanto do montante arrecadado pertence a cada sócio, considerando as vendas específicas de cada um.