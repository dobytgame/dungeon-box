# DungeonBox

Plataforma de assinatura mensal de **cenários e miniaturas 3D** para RPG de mesa. Cada mês o assinante recebe um kit temático com peças modulares, props, bilhete do mestre e materiais de apoio — prontos para montar e pintar.

Repositório: [github.com/dobytgame/dungeon-box](https://github.com/dobytgame/dungeon-box)

---

## Visão geral

| Camada | Tecnologia |
|--------|------------|
| Frontend | [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript |
| Estilo | [Tailwind CSS](https://tailwindcss.com/), Framer Motion |
| Backend / Auth | [Supabase](https://supabase.com/) (Postgres, Auth, RLS) |
| Pagamentos | [Mercado Pago](https://www.mercadopago.com.br/developers) (integração em andamento) |
| Deploy | Vercel (recomendado) |

### Planos

| Plano | Peças/mês | Destaques |
|-------|-----------|-----------|
| **Aventureiro** | 10–12 | Kit temático, piso modular, bilhete do mestre |
| **Herói** | 18–22 | Props exclusivos, frete Sul/Sudeste, grupo VIP |
| **Lendário** | 28–35 | Kit XL, peça surpresa, frete Brasil, voto no tema |

---

## Funcionalidades

### Implementado

- **Landing page** editorial — hero, planos, fidelidade, temas, FAQ
- **Autenticação** — e-mail/senha, Google OAuth (Supabase Auth)
- **Área do assinante** (`/dashboard`) — visão geral, perfil, endereços, assinatura, entregas, pagamentos, fidelidade
- **Checkout em 3 etapas** — plano → entrega → pagamento, com resumo lateral e order bump (kits de pintura)
- **Integração ViaCEP** — preenchimento automático de endereço por CEP
- **Schema Supabase** — migrations, RLS, triggers de perfil, views

### Em desenvolvimento

- Brick Mercado Pago e criação de assinatura via API
- Webhooks de pagamento e ciclos de entrega
- Painel administrativo
- E-mails transacionais (Resend)

Detalhes do roadmap em [`docs/PLANO-DE-DESENVOLVIMENTO.md`](docs/PLANO-DE-DESENVOLVIMENTO.md) e [`dungeonbox-sistema-assinatura.md`](dungeonbox-sistema-assinatura.md).

---

## Começando

### Pré-requisitos

- Node.js 20+
- npm
- Conta [Supabase](https://supabase.com/)
- (Opcional) Conta [Mercado Pago Developers](https://www.mercadopago.com.br/developers) para pagamentos

### Instalação

```bash
git clone https://github.com/dobytgame/dungeon-box.git
cd dungeon-box
npm install
cp .env.example .env.local
```

Preencha `.env.local` com as credenciais do seu projeto Supabase.

### Banco de dados

1. Crie um projeto no Supabase.
2. No **SQL Editor**, execute o script [`supabase/EXECUTAR_NO_SUPABASE.sql`](supabase/EXECUTAR_NO_SUPABASE.sql).
3. Em **Authentication → Providers**, habilite E-mail e Google (e Discord, se desejar).
4. Em **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

Guia completo: [`supabase/README.md`](supabase/README.md).

### Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Build de produção

```bash
npm run build
npm start
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_APP_URL` | Sim | URL pública da aplicação |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anon (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Service role — apenas server-side |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Não | Chave pública Mercado Pago |
| `MP_ACCESS_TOKEN` | Não | Token de acesso MP (checkout) |
| `MP_WEBHOOK_SECRET` | Não | Assinatura dos webhooks MP |
| `RESEND_API_KEY` | Não | API Resend (e-mails) |
| `EMAIL_FROM` | Não | Remetente dos e-mails |

\* Necessária para operações administrativas e webhooks futuros. **Nunca** exponha no client.

---

## Estrutura do projeto

```
dungeonbox/
├── app/                    # Rotas Next.js (App Router)
│   ├── page.tsx            # Landing page
│   ├── auth/               # Login, callback, logout
│   ├── checkout/           # Fluxo de assinatura
│   └── dashboard/          # Área do assinante
├── components/
│   ├── checkout/           # Steps, resumo, order bump
│   ├── dashboard/          # Shell, cards, formulários
│   ├── layout/             # Navbar, Footer
│   ├── sections/           # Seções da LP
│   └── ui/                 # Botões, logo, animações
├── lib/
│   ├── checkout/           # Planos, tipos, order bumps
│   ├── dashboard/          # Queries, formatação, tipos
│   ├── supabase/           # Clientes SSR / browser
│   └── data.ts             # Conteúdo estático da LP
├── supabase/
│   ├── migrations/         # Migrations incrementais
│   └── EXECUTAR_NO_SUPABASE.sql
├── public/images/          # Assets visuais
└── docs/                   # Planejamento técnico
```

---

## Rotas principais

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Landing page |
| `/auth` | Público | Login e cadastro |
| `/checkout?plan={slug}` | Autenticado | Checkout (aventureiro, heroi, lendario) |
| `/checkout/success` | Autenticado | Confirmação pós-checkout |
| `/dashboard` | Autenticado | Visão geral da conta |
| `/dashboard/profile` | Autenticado | Perfil e dados pessoais |
| `/dashboard/addresses` | Autenticado | Endereços de entrega |
| `/dashboard/subscription` | Autenticado | Assinatura ativa |
| `/dashboard/deliveries` | Autenticado | Histórico de ciclos |
| `/dashboard/payments` | Autenticado | Pagamentos |
| `/dashboard/loyalty` | Autenticado | Programa de fidelidade |

Rotas `/dashboard`, `/checkout` e `/auth` são protegidas pelo middleware em [`middleware.ts`](middleware.ts).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor em modo produção |
| `npm run lint` | ESLint (Next.js) |

---

## Design

Identidade visual **editorial dark** — fundo `stone-950`, grid sutil, tipografia Bebas Neue + DM Sans, acentos ember (`#ff6b2b`), frost (`#00d4ff`) e gold (`#ffd600`). Componentes reutilizam tokens definidos em [`tailwind.config.js`](tailwind.config.js) e [`app/globals.css`](app/globals.css).

---

## Contribuindo

1. Crie uma branch a partir de `main`.
2. Mantenha commits focados e mensagens claras.
3. Rode `npm run build` e `npm run lint` antes de abrir PR.
4. Não commite `.env.local` nem chaves de API.

---

## Licença

Projeto privado — **DungeonBox / DobyT Game**. Todos os direitos reservados.
