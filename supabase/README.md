# Supabase — DungeonBox

## Executar o schema (recomendado)

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto → **SQL Editor**
2. Cole o conteúdo de **`EXECUTAR_NO_SUPABASE.sql`** (arquivo único, ~330 linhas)
3. Clique em **Run**
4. Confirme em **Table Editor**: `plans`, `profiles`, `subscriptions`, etc.

> Execute **uma vez** em projeto vazio. Para alterar schema depois, use arquivos em `migrations/` individualmente.

## Alternativa: CLI

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## Após o SQL

### Authentication → Providers
- Email (confirmação ativada)
- Google OAuth
- Discord OAuth

### Authentication → URL Configuration
- Site URL: `http://localhost:3000` (dev)
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://dungeonbox.com.br/auth/callback` (produção)

### Variáveis no Next.js
Copie `.env.example` → `.env.local` e preencha URL + anon key do dashboard.

### Primeiro admin
Após criar sua conta:

```sql
UPDATE profiles SET is_admin = true WHERE email = 'seu@email.com';
```
