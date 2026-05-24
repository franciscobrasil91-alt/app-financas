# Guia de Deploy — App de Finanças Pessoais

## 1. Pré-requisitos

- Node.js 18+ instalado (https://nodejs.org)
- Conta no Supabase (https://supabase.com) — gratuita
- Conta na Vercel (https://vercel.com) — gratuita

---

## 2. Configurar o Supabase

### 2.1 Criar projeto
1. Acesse https://supabase.com e clique em **New Project**
2. Escolha um nome (ex: `financas-pessoais`) e senha forte
3. Aguarde a criação (~2 min)

### 2.2 Executar o SQL
1. No painel do Supabase, vá em **SQL Editor → New query**
2. Cole o conteúdo do arquivo `supabase/migrations/001_schema.sql`
3. Clique em **Run** — todas as tabelas serão criadas com RLS ativado

### 2.3 Obter as credenciais
1. Vá em **Settings → API**
2. Copie:
   - **Project URL** → será sua `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → será sua `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Rodar localmente

### 3.1 Instalar dependências
```bash
npm install
```

### 3.2 Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```

Edite `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 3.3 Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Acesse http://localhost:3000

---

## 4. Deploy na Vercel

### 4.1 Subir o código no GitHub
```bash
git init
git add .
git commit -m "feat: app de finanças pessoais"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/financas-pessoais.git
git push -u origin main
```

### 4.2 Importar na Vercel
1. Acesse https://vercel.com/new
2. Clique em **Import Git Repository**
3. Selecione o repositório `financas-pessoais`
4. Clique em **Deploy** — a Vercel detecta automaticamente o Next.js

### 4.3 Configurar variáveis de ambiente na Vercel
1. Após o primeiro deploy (que falhará sem as env vars), vá em:
   **Settings → Environment Variables**
2. Adicione as duas variáveis:
   ```
   NEXT_PUBLIC_SUPABASE_URL    = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
   ```
3. Clique em **Redeploy**

### 4.4 Configurar o callback de autenticação no Supabase
1. No Supabase, vá em **Authentication → URL Configuration**
2. Em **Site URL**, coloque a URL da sua aplicação na Vercel:
   ```
   https://seu-projeto.vercel.app
   ```
3. Em **Redirect URLs**, adicione:
   ```
   https://seu-projeto.vercel.app/api/auth/callback
   ```

---

## 5. Primeiros passos após o deploy

1. **Cadastre-se** na tela de login
2. Verifique o e-mail (confirme o link que o Supabase envia)
3. Acesse **Cadastros → Categorias** e clique em "Criar categorias padrão"
4. Cadastre seus **Cartões** e **Contas bancárias**
5. Comece a lançar suas receitas e despesas!

---

## 6. Configurações recomendadas no Supabase

### Desativar confirmação de e-mail (para uso pessoal/testes)
- **Authentication → Providers → Email**
- Desative "Confirm email" se não quiser verificar e-mail

### Autenticação com Google (opcional)
- **Authentication → Providers → Google**
- Configure OAuth no Google Cloud Console e cole as credenciais

---

## 7. Estrutura do banco de dados

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de usuário (criado automaticamente) |
| `contas_bancarias` | Contas para vincular despesas/receitas |
| `cartoes_credito` | Cartões com dia de fechamento/vencimento |
| `categorias` | Categorias de despesas, receitas e cartão |
| `lancamentos_cartao` | Compras parceladas no cartão (1 linha por parcela) |
| `despesas` | Despesas recorrentes/estimadas |
| `despesas_valores` | Grade de valores mensais por despesa |
| `receitas` | Fontes de receita |
| `receitas_valores` | Grade de valores mensais por receita |
| `aplicacoes` | Investimentos e reservas |
| `aportes_valores` | Grade de aportes mensais por aplicação |
| `saldos_bancarios` | Saldo bancário registrado por mês |
