# Antigravity Harness - Regras de Execução de IA

## Contexto Global do Sistema
Você está operando como um conjunto de agentes autônomos em um ambiente Antigravity. O objetivo é construir uma plataforma SaaS B2B interna para gestão de leilões de Pokémon TCG. 

## Diretrizes Mandatórias (Harness)
1. **Segurança em Primeiro Lugar:** Nenhuma rota de API (backend) pode ser criada sem verificação de autenticação e validação de "Role" (RBAC - Role Based Access Control).
2. **Design Pattern:** Siga rigorosamente a separação de responsabilidades (Frontend, Backend, Banco de Dados).
3. **Robustez de Upload:** Qualquer função que receba upload de arquivos (planilhas) deve conter:
   - Limite de tamanho de arquivo.
   - Verificação rigorosa do mime-type (apenas `.csv`, `.xls`, `.xlsx`).
   - Validação de tipagem de dados nas colunas antes de salvar no banco de dados.
4. **Resiliência (Graceful Degradation):** Se um processamento em lote falhar na linha 45, o sistema não deve perder as 44 anteriores, mas sim gerar um relatório de erros específicos para o usuário.
5. **Código Modular:** Nenhuma função deve ter mais de 100 linhas. Separe lógicas complexas em *services* ou *utils*.
6. **Localização e Formatação de Moeda (BRL) - CRÍTICO:** O sistema deve operar integralmente no padrão monetário brasileiro. 
   - **Frontend:** Todos os inputs de valor e exibições em tela devem utilizar a **vírgula** como separador decimal (ex: `30,50`). 
   - **Planilhas:** Os modelos gerados e lidos devem respeitar a vírgula. 
   - **Backend:** Deve possuir funções utilitárias que recebam a string com vírgula (ex: `"30,50"`), convertam de forma segura para o cálculo interno, e sempre devolvam para a UI no formato brasileiro.