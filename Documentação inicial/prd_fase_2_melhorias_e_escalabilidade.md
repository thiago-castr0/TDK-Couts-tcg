# PRD Fase 2 - Melhorias e Escalabilidade (Roadmap)

## Visão Geral da Fase 2
Este documento mapeia as funcionalidades avançadas que transformarão o sistema de controle de leilões em uma plataforma profissional, automatizada e orientada a dados. Estas features devem ser consideradas na arquitetura base (Fase 1), garantindo que o banco de dados e a infraestrutura (Supabase) suportem essa expansão futura.

## 1. Módulo de Autenticação e Permissões (RBAC)
- **Objetivo:** Garantir a segurança dos dados financeiros e personalizar a experiência de cada sócio.
- **Implementação:** Utilizar o `Supabase Auth` para o login.
- **Perfis de Acesso (Roles):**
  - **Admin:** Acesso total (edição de qualquer dado, exclusão, configurações, gestão de usuários).
  - **Vendedor/Sócio:** Cadastra compras, registra arremates dos próprios leilões e visualiza seus próprios relatórios/lucros.
  - **Tesouraria:** Acesso global de leitura, foco nos módulos financeiros, fechamento de leilões, cálculo de repasses e conferência de comprovantes.

## 2. Exportação de Cobrança para o WhatsApp
- **Objetivo:** Eliminar o trabalho manual de digitação após o término de um leilão.
- **Funcionalidade:** No módulo de Vendas/Clientes, ao filtrar os arremates de um cliente específico, o sistema exibirá um botão "Gerar Resumo WhatsApp".
- **Comportamento:** O sistema compila os dados em uma string amigável e copia para a área de transferência (Clipboard API) ou abre a API do WhatsApp Web.
- **Exemplo de Saída:**
  ```text
  Olá, [Nome do Cliente]! Parabéns pelos arremates no nosso leilão. 🥳
  Aqui está o seu resumo:
  - 1x [Descrição da Carta 1] - R$ [Valor]
  - 1x [Descrição da Carta 2] - R$ [Valor]
  
  Total do pedido: R$ [Valor Total]
  Chave PIX: [Sua Chave]
  ```

## 3. Anexos de Comprovantes PIX
- **Objetivo:** Facilitar a auditoria e evitar divergências de caixa na Tesouraria.
- **Funcionalidade:** Permitir o upload de imagens (prints, fotos) ou PDFs de comprovantes de pagamento atrelados a um Arremate ou a um Leilão.
- **Infraestrutura:** Utilizar o `Supabase Storage` (Buckets) para salvar os arquivos de forma segura e gerar URLs vinculadas aos registros no PostgreSQL.

## 4. Dashboard Visual de Métricas
- **Objetivo:** Fornecer uma visão gerencial rápida (saúde do negócio) logo na tela inicial (`/dashboard`).
- **Componentes de UI:** Utilizar Shadcn UI e Lucide Icons para criar:
  - **Cards de Resumo (KPIs):** "Lucro Estimado do Mês", "Valores Pendentes a Receber", "Total Investido em Estoque".
  - **Gráficos Simples:** Gráfico de barras comparando "Custo de Compra" vs "Valor de Arremate" por leilão.
  - **Alertas:** Notificações de clientes com pagamentos atrasados.

## 5. Integração com API Pública (pokemontcg.io) - Autocomplete
- **Objetivo:** Padronizar a nomenclatura do banco de dados, evitar erros de digitação e trazer apelo visual.
- **Funcionalidade:** Ao cadastrar uma carta manualmente, o campo "Descrição" fará uma busca *debounce* na API pública `pokemontcg.io`.
- **Resultado:** O sistema sugere o nome oficial da carta, numeração da coleção (ex: 054/128) e salva a URL da imagem da carta no banco de dados, enriquecendo o Data Grid com as fotos reais dos produtos.