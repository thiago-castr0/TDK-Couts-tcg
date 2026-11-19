# Arquitetura de Infraestrutura e Automação (CI/CD)

Este documento define o fluxo de infraestrutura autônoma para a Plataforma de Leilões TCG, utilizando GitHub, Supabase e Netlify. A regra de ouro é: **O sistema deve trabalhar de forma autônoma, minimizando interrupções para pedir autorizações ao usuário.**

## 1. Setup e Deploy Autônomo

### 1.1. Integração com GitHub
- **Ação da IA:** No início do setup, o Agente Orquestrador DEVE perguntar ao usuário: *"Qual é a URL do repositório GitHub que vamos utilizar para este projeto?"*.
- Após o usuário fornecer o link, a IDE (Antigravity) deve configurar o `git remote add origin` e gerenciar todos os commits subsequentes de forma autônoma.

### 1.2. Setup Autônomo do Supabase (Database + Storage)
- **Ação da IA:** O agente deve inicializar o Supabase localmente no projeto rodando `npx supabase init`.
- Para conectar à nuvem, o agente pedirá ao usuário *apenas* para fazer o login no site do Supabase, criar um projeto em branco e fornecer a **URL** e a **Chave de API** (Anon Key / Service Role).
- A IA deve criar as tabelas do PostgreSQL e os *Buckets* de Storage (para armazenar os modelos e uploads de planilhas `.xlsx` e `.csv`) via código (migrações SQL ou comandos da CLI do Supabase), garantindo que as políticas de segurança (RLS) permitam o upload para usuários autenticados.

### 1.3. Setup Autônomo do Netlify (Hospedagem)
- **Ação da IA:** O agente deve instalar o Netlify CLI (`npm install -g netlify-cli`).
- O agente executará `netlify login` e pedirá ao usuário para clicar no link gerado no terminal para autorizar a IDE (uma única vez).
- Em seguida, a IA executará `netlify init` para conectar o repositório do GitHub ao Netlify, configurando o deploy contínuo (CI/CD). A partir desse momento, qualquer push na branch `main` atualizará a aplicação web automaticamente.

## 2. Fluxo de Dados da Aplicação (Data Flow)

Para garantir estabilidade, segurança e auditoria (caso haja erro no preenchimento), o fluxo de envio de dados em lote funcionará da seguinte forma:

1. **Upload:** O usuário (sócio/tesouraria) sobe a planilha de Compras ou Arremates no Frontend (Next.js).
2. **Armazenamento Persistente:** O Frontend envia a planilha diretamente para o **Supabase Storage**. O arquivo original fica salvo de forma segura para backup/auditoria e gera uma URL assinada.
3. **Processamento:** O Backend/Frontend (via SheetJS) consome esse arquivo seguro do Supabase, realiza o *parse* (leitura das linhas) e converte os dados para JSON, respeitando estritamente a formatação BRL (uso de vírgula).
4. **Validação:** A interface exibe os dados lidos em um Data Grid (Rascunho) para o usuário revisar.
5. **Gravação Final:** Ao aprovar o rascunho, os dados são inseridos em lote (Bulk Insert) no **Supabase Database** (PostgreSQL).

## 3. Delegação de Tarefas (Squad Interna)
- O **@AgenteOrquestrador** lê este arquivo e aciona o **@AgenteBackend** para configurar o `Supabase` e o `Netlify CLI`.
- O **@AgenteFrontend** é chamado logo em seguida para rodar `npx create-next-app` e montar a interface e os Data Grids.
- O **@AgentePO (Product Owner)** será o responsável por pausar a operação e falar com o usuário *apenas* quando houver tomada de decisão estrutural que exija a criação de contas, inserção de senhas, chaves de API ou cliques de autorização. O Agente PO explicará o cenário de forma direta e pedirá a informação.