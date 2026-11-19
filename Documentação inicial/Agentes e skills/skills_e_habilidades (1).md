# Skills (Habilidades) Necessárias para os Agentes

As seguintes habilidades (tools/functions) devem ser providenciadas ao ambiente Antigravity para os agentes executarem o projeto:

## Skill: `Generate_Excel_Template`
* **Descrição:** Gera um arquivo de modelo (.xlsx) com cabeçalhos pré-definidos bloqueados na primeira linha. **Obrigatório:** A coluna de valores deve ser pré-formatada para moeda brasileira (Contábil/BRL), garantindo o uso da vírgula para decimais.
* **Entrada:** Nome do Módulo (ex: "compras", "vendas").
* **Saída:** Arquivo Buffer (XLSX).

## Skill: `Parse_Excel_To_JSON`
* **Descrição:** Lê um arquivo de planilha carregado pelo usuário e converte para um array de objetos JSON manipulável pelo código. Deve conter sanitização para entender que vírgula (,) é o separador decimal.
* **Entrada:** Arquivo `.xlsx` ou `.csv`.
* **Saída:** Array de JSON (ex: `[{ "descricao": "Pikachu", "valor": "30,50" }]`).

## Skill: `Cross_Reference_Accounting`
* **Descrição:** Cruza os arrays do banco de dados de Entradas (Compras) e Saídas (Arremates).
* **Entrada:** ID do Leilão.
* **Saída:** Relatório de Lucro e sugestões de Match.

## Skill: `Playwright_E2E_Testing`
* **Descrição:** Executa suítes de testes End-to-End simulando o usuário no navegador.
* **Entrada:** Script de teste ou URL do componente.
* **Saída:** Relatório de Pass/Fail e logs de quebra de tela.

## Skill: `Enforce_Design_System`
* **Descrição:** Linter/Validador focado em garantir que apenas as classes do Tailwind e a biblioteca de ícones Lucide estão sendo renderizados nos componentes visuais.