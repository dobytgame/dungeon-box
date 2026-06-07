# DungeonBox — Sistema de Assinatura
## Documento Técnico Completo · v1.0

> Stack: Next.js 14 · Supabase · Mercado Pago · Tailwind CSS · Framer Motion

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Banco de Dados — Supabase](#2-banco-de-dados--supabase)
3. [Autenticação — Auth + Social Login](#3-autenticação--auth--social-login)
4. [Sistema de Planos e Assinaturas](#4-sistema-de-planos-e-assinaturas)
5. [Integração Mercado Pago](#5-integração-mercado-pago)
6. [Painel do Usuário](#6-painel-do-usuário)
7. [Painel Administrativo](#7-painel-administrativo)
8. [Rotas e API Routes](#8-rotas-e-api-routes)
9. [Webhooks e Eventos](#9-webhooks-e-eventos)
10. [Segurança e RLS](#10-segurança-e-rls)
11. [Estrutura de Arquivos](#11-estrutura-de-arquivos)
12. [Variáveis de Ambiente](#12-variáveis-de-ambiente)
13. [Ordem de Implementação](#13-ordem-de-implementação)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│              Next.js 14 (App Router + RSC)                  │
│         Landing Page · Auth · Dashboard · Checkout          │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
    ┌──────▼──────┐ ┌────▼────┐ ┌─────▼──────┐
    │  Supabase   │ │   MP    │ │  Next.js   │
    │  Database   │ │  API    │ │  API Routes│
    │  Auth       │ │  Webhooks│ │  Server    │
    │  Storage    │ │         │ │  Actions   │
    │  RLS        │ └─────────┘ └────────────┘
    └─────────────┘
```

### Fluxo Principal

```
Usuário acessa LP
      ↓
Escolhe plano → Clica em "Assinar"
      ↓
Tela de cadastro/login (Google, Discord, Email)
      ↓
Preenche endereço de entrega
      ↓
Checkout Mercado Pago (cartão de crédito recorrente)
      ↓
MP confirma pagamento → Webhook dispara
      ↓
Supabase cria assinatura ativa
      ↓
E-mail de boas-vindas + acesso ao painel
      ↓
[Todo mês] MP cobra → Webhook → Atualiza ciclo
```

---

## 2. Banco de Dados — Supabase

### 2.1 Diagrama de Entidades

```
users ──────────── profiles
  │                    │
  │              addresses
  │
  ├────────── subscriptions ──── plans
  │                │
  │           subscription_cycles
  │
  ├────────── payments
  │
  └────────── loyalty_progress
                   │
             loyalty_levels
```

---

### 2.2 Tabelas Completas

#### `plans` — Planos de assinatura disponíveis

```sql
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,          -- 'aventureiro' | 'heroi' | 'lendario'
  name            text NOT NULL,                 -- 'Aventureiro'
  description     text,
  price_cents     integer NOT NULL,              -- 8900 = R$89,00
  pieces_min      integer NOT NULL,              -- 10
  pieces_max      integer NOT NULL,              -- 12
  color_choices   integer NOT NULL DEFAULT 1,    -- qtd de cores que pode escolher
  freight_free    boolean NOT NULL DEFAULT false,
  freight_regions text[],                        -- ['sul','sudeste']
  store_discount  integer NOT NULL DEFAULT 0,    -- % de desconto na loja
  has_vip_group   boolean NOT NULL DEFAULT false,
  has_vote        boolean NOT NULL DEFAULT false,
  accent_color    text,                          -- '#ff6b2b'
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- Seed dos planos
INSERT INTO plans (slug, name, price_cents, pieces_min, pieces_max, color_choices, freight_free, freight_regions, store_discount, has_vip_group, has_vote, accent_color, sort_order) VALUES
  ('aventureiro', 'Aventureiro', 8900,  10, 12, 1, false, NULL,             0,  false, false, '#a0aabb', 1),
  ('heroi',       'Herói',       13900, 18, 22, 2, true,  ARRAY['sul','sudeste'], 5,  true,  false, '#ff6b2b', 2),
  ('lendario',    'Lendário',    19900, 28, 35, 99,true,  ARRAY['all'],     10, true,  true,  '#00d4ff', 3);
```

---

#### `profiles` — Dados do usuário (extensão do auth.users)

```sql
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  full_name       text,
  display_name    text,
  avatar_url      text,
  phone           text,
  cpf             text,                          -- necessário para MP
  birth_date      date,
  preferred_color text DEFAULT 'cinza-pedra',    -- cor padrão das peças
  newsletter      boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Trigger: cria profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

#### `addresses` — Endereços de entrega

```sql
CREATE TABLE addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  label        text DEFAULT 'Principal',         -- 'Casa', 'Trabalho'
  recipient    text NOT NULL,
  zip_code     text NOT NULL,
  street       text NOT NULL,
  number       text NOT NULL,
  complement   text,
  neighborhood text NOT NULL,
  city         text NOT NULL,
  state        char(2) NOT NULL,
  is_default   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- Garante apenas 1 endereço padrão por usuário
CREATE UNIQUE INDEX one_default_address
  ON addresses (user_id)
  WHERE is_default = true;
```

---

#### `subscriptions` — Assinaturas ativas/inativas

```sql
CREATE TYPE subscription_status AS ENUM (
  'pending',      -- aguardando primeiro pagamento
  'active',       -- ativa e em dia
  'paused',       -- pausada pelo usuário
  'past_due',     -- pagamento atrasado
  'cancelled',    -- cancelada
  'expired'       -- expirada
);

CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id               uuid REFERENCES plans(id),
  address_id            uuid REFERENCES addresses(id),

  -- Status
  status                subscription_status DEFAULT 'pending',

  -- Mercado Pago
  mp_subscription_id    text UNIQUE,            -- ID da pré-aprovação no MP
  mp_payer_id           text,                   -- ID do pagador no MP

  -- Preferências
  color_choices         text[],                 -- ['cinza-pedra', 'preto']
  special_notes         text,                   -- obs do cliente

  -- Datas
  started_at            timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  next_billing_date     timestamptz,
  cancelled_at          timestamptz,
  cancel_reason         text,

  -- Ciclo atual
  current_cycle         integer DEFAULT 0,      -- quantas boxes já recebeu
  loyalty_level         integer DEFAULT 1,

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Index para queries frequentes
CREATE INDEX idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_mp_id  ON subscriptions(mp_subscription_id);
```

---

#### `subscription_cycles` — Histórico de ciclos mensais

```sql
CREATE TYPE cycle_status AS ENUM (
  'upcoming',     -- próximo ciclo agendado
  'preparing',    -- em produção/impressão
  'shipped',      -- enviado
  'delivered',    -- entregue
  'failed'        -- falha no pagamento deste ciclo
);

CREATE TABLE subscription_cycles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  cycle_number     integer NOT NULL,             -- 1, 2, 3...
  theme_id         uuid REFERENCES themes(id),

  status           cycle_status DEFAULT 'upcoming',

  -- Pagamento deste ciclo
  payment_id       uuid REFERENCES payments(id),
  paid_at          timestamptz,
  amount_cents     integer,

  -- Envio
  tracking_code    text,
  carrier          text,                         -- 'correios' | 'jadlog'
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  estimated_delivery date,

  -- Personalização deste ciclo
  color_choices    text[],

  -- Bônus de fidelidade aplicados
  bonus_pieces     integer DEFAULT 0,
  bonus_notes      text,

  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
```

---

#### `payments` — Registro de pagamentos

```sql
CREATE TYPE payment_status AS ENUM (
  'pending',
  'approved',
  'authorized',
  'in_process',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back'
);

CREATE TABLE payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles(id),
  subscription_id   uuid REFERENCES subscriptions(id),

  -- Mercado Pago
  mp_payment_id     text UNIQUE,
  mp_order_id       text,

  -- Valores
  amount_cents      integer NOT NULL,
  currency          char(3) DEFAULT 'BRL',

  -- Status
  status            payment_status DEFAULT 'pending',
  status_detail     text,                        -- detalhes do MP

  -- Método
  payment_method    text,                        -- 'credit_card' | 'pix'
  payment_type      text,
  installments      integer DEFAULT 1,
  card_last4        text,
  card_brand        text,                        -- 'visa' | 'mastercard'

  -- Datas
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now(),

  -- Raw payload do webhook (para auditoria)
  mp_raw_payload    jsonb
);
```

---

#### `loyalty_levels` — Definição dos níveis de fidelidade

```sql
CREATE TABLE loyalty_levels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level           integer UNIQUE NOT NULL,       -- 1 a 5
  name            text NOT NULL,                 -- 'Recruta'
  icon            text,                          -- '🗡️'
  min_cycles      integer NOT NULL,              -- ciclos mínimos para atingir
  bonus_pieces    integer DEFAULT 0,             -- props extras por ciclo
  store_discount  integer DEFAULT 0,             -- % adicional na loja
  has_vote        boolean DEFAULT false,
  has_exclusive   boolean DEFAULT false,
  description     text
);

INSERT INTO loyalty_levels (level, name, icon, min_cycles, bonus_pieces, store_discount, has_vote, has_exclusive) VALUES
  (1, 'Recruta',     '🗡️', 0,  0, 0,  false, false),
  (2, 'Aventureiro', '⚔️', 2,  1, 5,  false, false),
  (3, 'Veterano',    '🏹', 5,  2, 10, true,  false),
  (4, 'Campeão',     '🛡️', 9,  3, 15, true,  false),
  (5, 'Lendário',    '👑', 12, 5, 20, true,  true);
```

---

#### `themes` — Temas mensais

```sql
CREATE TABLE themes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_number integer NOT NULL,                 -- 1 a 12
  year         integer NOT NULL,
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  lore         text,
  emoji        text,
  image_url    text,
  is_active    boolean DEFAULT false,
  is_revealed  boolean DEFAULT false,            -- preview liberado?
  created_at   timestamptz DEFAULT now(),

  UNIQUE(month_number, year)
);
```

---

#### `theme_votes` — Votação dos assinantes Lendário/Campeão

```sql
CREATE TABLE theme_votes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id),
  theme_option_id uuid,                          -- opções de tema futuro
  voted_at        timestamptz DEFAULT now(),

  UNIQUE(user_id, theme_option_id)
);
```

---

### 2.3 Views Úteis

```sql
-- Assinantes ativos com info completa
CREATE VIEW active_subscribers AS
SELECT
  p.id,
  p.full_name,
  p.email,
  pl.name        AS plan_name,
  pl.price_cents AS plan_price,
  s.status,
  s.current_cycle,
  s.loyalty_level,
  ll.name        AS loyalty_name,
  s.next_billing_date,
  s.started_at
FROM subscriptions s
JOIN profiles p  ON p.id = s.user_id
JOIN plans pl    ON pl.id = s.plan_id
JOIN loyalty_levels ll ON ll.level = s.loyalty_level
WHERE s.status = 'active';

-- MRR (Monthly Recurring Revenue)
CREATE VIEW mrr AS
SELECT
  pl.name,
  COUNT(s.id)               AS subscribers,
  SUM(pl.price_cents) / 100 AS mrr_brl
FROM subscriptions s
JOIN plans pl ON pl.id = s.plan_id
WHERE s.status = 'active'
GROUP BY pl.name;
```

---

## 3. Autenticação — Auth + Social Login

### 3.1 Provedores configurados no Supabase

```
✓ Email + Senha (com confirmação de e-mail)
✓ Google OAuth
✓ Discord OAuth
✓ Magic Link (sem senha)
```

### 3.2 Configuração no Supabase Dashboard

```
Authentication > Providers:
  - Google:  CLIENT_ID + CLIENT_SECRET do Google Console
  - Discord: CLIENT_ID + CLIENT_SECRET do Discord Developer Portal

Authentication > URL Configuration:
  - Site URL: https://dungeonbox.com.br
  - Redirect URLs:
      https://dungeonbox.com.br/auth/callback
      http://localhost:3000/auth/callback
```

### 3.3 Implementação

#### `app/auth/callback/route.ts`
```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Se veio do checkout, redireciona para lá
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
```

#### `components/auth/AuthForm.tsx`
```tsx
'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react'

type Mode = 'login' | 'register' | 'magic'

export default function AuthForm({ redirectTo }: { redirectTo?: string }) {
  const supabase = createClientComponentClient()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const next = redirectTo ?? '/dashboard'

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${next}` }
    })
  }

  async function handleDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${location.origin}/auth/callback?next=${next}` }
    })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` }
      })
      setMessage(error ? error.message : 'Link enviado! Verifique seu e-mail.')
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` }
      })
      setMessage(error ? error.message : 'Conta criada! Verifique seu e-mail.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Social Buttons */}
      <div className="flex flex-col gap-3 mb-6">
        <button onClick={handleGoogle}
          className="flex items-center justify-center gap-3 w-full py-3 px-4
                     bg-white text-stone-900 font-semibold rounded-none
                     hover:bg-gray-100 transition">
          <GoogleIcon /> Continuar com Google
        </button>
        <button onClick={handleDiscord}
          className="flex items-center justify-center gap-3 w-full py-3 px-4
                     bg-[#5865F2] text-white font-semibold rounded-none
                     hover:bg-[#4752C4] transition">
          <DiscordIcon /> Continuar com Discord
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-stone-500 text-sm">ou com e-mail</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Email Form */}
      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <input type="email" placeholder="seu@email.com" value={email}
          onChange={e => setEmail(e.target.value)} required
          className="w-full bg-stone-800 border border-stone-700 px-4 py-3
                     text-white placeholder-stone-500 focus:border-frost
                     focus:outline-none transition" />

        {mode !== 'magic' && (
          <input type="password" placeholder="Senha" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full bg-stone-800 border border-stone-700 px-4 py-3
                       text-white placeholder-stone-500 focus:border-frost
                       focus:outline-none transition" />
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-ember text-stone-950 font-bold
                     uppercase tracking-wider hover:bg-ember-bright
                     disabled:opacity-50 transition">
          {loading ? 'Aguarde...' : mode === 'register' ? 'Criar Conta' : mode === 'magic' ? 'Enviar Magic Link' : 'Entrar'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-center text-frost">{message}</p>}

      {/* Mode switchers */}
      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-stone-400">
        {mode === 'login' && <>
          <button onClick={() => setMode('register')} className="hover:text-white">Não tem conta? <span className="text-ember">Criar conta</span></button>
          <button onClick={() => setMode('magic')} className="hover:text-white">Entrar sem senha (Magic Link)</button>
        </>}
        {mode !== 'login' && (
          <button onClick={() => setMode('login')} className="hover:text-white">Já tenho conta · <span className="text-ember">Fazer login</span></button>
        )}
      </div>
    </div>
  )
}
```

---

## 4. Sistema de Planos e Assinaturas

### 4.1 Fluxo de Checkout

```
1. Usuário clica em "Assinar [Plano]" na LP
        ↓
2. Middleware verifica se está logado
   → Não logado: redireciona para /auth?next=/checkout?plan=heroi
   → Logado: vai direto para /checkout?plan=heroi
        ↓
3. /checkout — formulário em 3 steps:
   Step 1: Confirmar plano + preferências de cor
   Step 2: Endereço de entrega (CEP autocompleta via ViaCEP)
   Step 3: Pagamento via Mercado Pago
        ↓
4. API Route cria pré-aprovação no MP
        ↓
5. Redireciona para MP ou exibe brick de pagamento
        ↓
6. Webhook do MP confirma → assinatura ativada
        ↓
7. Redireciona para /dashboard com mensagem de boas-vindas
```

### 4.2 Checkout — Steps

#### `app/checkout/page.tsx`
```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import StepPlan     from '@/components/checkout/StepPlan'
import StepAddress  from '@/components/checkout/StepAddress'
import StepPayment  from '@/components/checkout/StepPayment'

export default function CheckoutPage() {
  const params   = useSearchParams()
  const planSlug = params.get('plan') ?? 'heroi'
  const [step, setStep]   = useState(1)
  const [data, setData]   = useState({
    planSlug,
    colorChoices: [] as string[],
    addressId: '',
    specialNotes: '',
  })

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-stone-800">
        <div className="h-full bg-ember transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <div className="w-full max-w-lg">
        {step === 1 && <StepPlan     data={data} setData={setData} onNext={() => setStep(2)} />}
        {step === 2 && <StepAddress  data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepPayment  data={data} onBack={() => setStep(2)} />}
      </div>
    </div>
  )
}
```

---

## 5. Integração Mercado Pago

### 5.1 Dependências

```bash
npm install mercadopago
```

### 5.2 Configuração do Cliente MP

```ts
// lib/mercadopago.ts
import MercadoPagoConfig, { PreApproval, Payment } from 'mercadopago'

export const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 }
})

export const preApprovalClient = new PreApproval(mp)
export const paymentClient = new Payment(mp)
```

### 5.3 Criar Pré-Aprovação (Assinatura Recorrente)

```ts
// app/api/subscriptions/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { preApprovalClient } from '@/lib/mercadopago'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { planSlug, addressId, colorChoices, specialNotes } = body

  // Busca dados do plano
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', planSlug)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Busca perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  try {
    // Cria pré-aprovação no Mercado Pago
    const preApproval = await preApprovalClient.create({
      body: {
        reason:            `DungeonBox ${plan.name} — Assinatura Mensal`,
        auto_recurring: {
          frequency:       1,
          frequency_type:  'months',
          transaction_amount: plan.price_cents / 100,
          currency_id:     'BRL',
          start_date:      new Date().toISOString(),
          end_date:        new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString(), // 10 anos
        },
        payer_email:       profile.email,
        back_url:          `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
        status:            'pending',

        // Metadata para rastrear no webhook
        external_reference: user.id,
      }
    })

    // Cria registro da assinatura no banco (status: pending)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        user_id:           user.id,
        plan_id:           plan.id,
        address_id:        addressId,
        color_choices:     colorChoices,
        special_notes:     specialNotes,
        status:            'pending',
        mp_subscription_id: preApproval.id,
      })
      .select()
      .single()

    return NextResponse.json({
      subscription_id: subscription.id,
      mp_init_point:   preApproval.init_point, // URL para redirecionar ao MP
    })

  } catch (error: any) {
    console.error('MP Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

### 5.4 Brick de Pagamento (embed no site)

Para não redirecionar ao MP, embed o brick diretamente:

```tsx
// components/checkout/MPPaymentBrick.tsx
'use client'
import { useEffect, useRef } from 'react'

interface Props {
  publicKey: string
  preferenceId: string
  onSuccess: (paymentId: string) => void
  onError: (error: any) => void
}

declare global {
  interface Window { MercadoPago: any }
}

export default function MPPaymentBrick({ publicKey, preferenceId, onSuccess, onError }: Props) {
  const brickRef = useRef<any>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = initBrick
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  async function initBrick() {
    const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
    const bricks = mp.bricks()

    brickRef.current = await bricks.create('payment', 'mp-payment-brick', {
      initialization: {
        amount:        0,  // sobrescrito pela pré-aprovação
        preferenceId,
      },
      customization: {
        paymentMethods: {
          creditCard:    'all',
          maxInstallments: 1,  // assinatura = sem parcelamento
        },
        visual: {
          style: {
            theme:       'dark',
            customVariables: {
              baseColor:       '#ff6b2b',
              borderRadius:    '0px',
              fontSizeBase:    '16px',
            }
          }
        }
      },
      callbacks: {
        onReady:    () => {},
        onSubmit:   async ({ formData }: any) => {
          const res = await fetch('/api/payments/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })
          const data = await res.json()
          if (data.payment_id) onSuccess(data.payment_id)
          else onError(data.error)
        },
        onError: onError,
      },
    })
  }

  return <div id="mp-payment-brick" className="w-full" />
}
```

---

### 5.5 Webhook — Receber Eventos do MP

```ts
// app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preApprovalClient, paymentClient } from '@/lib/mercadopago'
import crypto from 'crypto'

// Cliente admin (bypassa RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Validar assinatura do webhook MP
  const body      = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''

  const isValid = validateMPSignature(body, signature, requestId)
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  const payload = JSON.parse(body)
  const { type, data } = payload

  try {
    switch (type) {
      // Pré-aprovação criada/atualizada
      case 'subscription_preapproval':
        await handleSubscriptionEvent(data.id)
        break

      // Pagamento de ciclo mensal
      case 'payment':
        await handlePaymentEvent(data.id)
        break

      default:
        console.log('Unhandled webhook type:', type)
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionEvent(mpSubscriptionId: string) {
  const mpSub = await preApprovalClient.get({ id: mpSubscriptionId })

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('mp_subscription_id', mpSubscriptionId)
    .single()

  if (!subscription) return

  let newStatus = subscription.status

  if (mpSub.status === 'authorized') {
    newStatus = 'active'
  } else if (mpSub.status === 'cancelled') {
    newStatus = 'cancelled'
  } else if (mpSub.status === 'paused') {
    newStatus = 'paused'
  }

  await supabase
    .from('subscriptions')
    .update({
      status:        newStatus,
      mp_payer_id:   mpSub.payer_id?.toString(),
      started_at:    newStatus === 'active' && !subscription.started_at ? new Date().toISOString() : undefined,
      next_billing_date: mpSub.auto_recurring?.end_date,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', subscription.id)

  // Se ativou pela primeira vez, cria o primeiro ciclo
  if (newStatus === 'active' && subscription.status === 'pending') {
    await createNextCycle(subscription.id, 1)
    await sendWelcomeEmail(subscription.user_id)
  }
}

async function handlePaymentEvent(mpPaymentId: string) {
  const mpPayment = await paymentClient.get({ id: mpPaymentId })

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('mp_subscription_id', mpPayment.preapproval_id)
    .single()

  if (!subscription) return

  // Registra pagamento
  const { data: payment } = await supabase
    .from('payments')
    .upsert({
      user_id:          subscription.user_id,
      subscription_id:  subscription.id,
      mp_payment_id:    mpPaymentId,
      amount_cents:     Math.round((mpPayment.transaction_amount ?? 0) * 100),
      status:           mpPayment.status,
      status_detail:    mpPayment.status_detail,
      payment_method:   mpPayment.payment_method_id,
      payment_type:     mpPayment.payment_type_id,
      card_last4:       mpPayment.card?.last_four_digits,
      card_brand:       mpPayment.card?.cardholder?.name,
      paid_at:          mpPayment.status === 'approved' ? new Date().toISOString() : null,
      mp_raw_payload:   mpPayment,
    }, { onConflict: 'mp_payment_id' })
    .select()
    .single()

  if (mpPayment.status === 'approved') {
    // Atualiza ciclo atual como pago
    const newCycle = subscription.current_cycle + 1

    await supabase
      .from('subscriptions')
      .update({
        status:           'active',
        current_cycle:    newCycle,
        loyalty_level:    calculateLoyaltyLevel(newCycle),
        current_period_start: new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('id', subscription.id)

    // Cria registro do ciclo pago
    await supabase
      .from('subscription_cycles')
      .update({ status: 'preparing', payment_id: payment?.id, paid_at: new Date().toISOString(), amount_cents: payment?.amount_cents })
      .eq('subscription_id', subscription.id)
      .eq('status', 'upcoming')

    // Cria próximo ciclo
    await createNextCycle(subscription.id, newCycle + 1)

  } else if (['rejected', 'cancelled'].includes(mpPayment.status ?? '')) {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', subscription.id)

    await sendPaymentFailedEmail(subscription.user_id)
  }
}

function calculateLoyaltyLevel(cycles: number): number {
  if (cycles >= 12) return 5
  if (cycles >= 9)  return 4
  if (cycles >= 5)  return 3
  if (cycles >= 2)  return 2
  return 1
}

async function createNextCycle(subscriptionId: string, cycleNumber: number) {
  await supabase
    .from('subscription_cycles')
    .insert({
      subscription_id: subscriptionId,
      cycle_number:    cycleNumber,
      status:          'upcoming',
    })
}

function validateMPSignature(body: string, signature: string, requestId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET ?? ''
  const parts  = signature.split(',')
  const ts     = parts.find(p => p.startsWith('ts='))?.split('=')[1]
  const v1     = parts.find(p => p.startsWith('v1='))?.split('=')[1]
  if (!ts || !v1) return false
  const manifest = `id:${JSON.parse(body).data?.id};request-id:${requestId};ts:${ts};`
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return hash === v1
}

async function sendWelcomeEmail(userId: string) {
  // Implementar com Resend, SendGrid ou similar
  console.log('Send welcome email to:', userId)
}

async function sendPaymentFailedEmail(userId: string) {
  console.log('Send payment failed email to:', userId)
}
```

---

## 6. Painel do Usuário

### 6.1 Estrutura do Dashboard

```
/dashboard
  ├── /                   → Visão geral (status da assinatura, próxima entrega)
  ├── /subscription       → Detalhes e gerenciamento da assinatura
  ├── /deliveries         → Histórico de entregas e rastreamento
  ├── /payments           → Histórico de pagamentos
  ├── /profile            → Dados pessoais
  ├── /addresses          → Endereços de entrega
  └── /loyalty            → Nível de fidelidade e recompensas
```

### 6.2 Componente de Visão Geral

```tsx
// app/dashboard/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/dashboard')

  // Busca assinatura ativa
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plans(*),
      subscription_cycles(
        *,
        themes(*)
        ORDER BY cycle_number DESC
        LIMIT 3
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // Busca nível de fidelidade
  const { data: loyaltyLevel } = await supabase
    .from('loyalty_levels')
    .select('*')
    .eq('level', subscription?.loyalty_level ?? 1)
    .single()

  return (
    <div className="min-h-screen bg-stone-950 p-6">
      {/* Boas vindas */}
      <h1 className="font-display text-4xl mb-8">
        Bem-vindo de volta, <span className="text-ember">{user.email?.split('@')[0]}</span>
      </h1>

      {subscription ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Status da Assinatura */}
          <SubscriptionStatusCard subscription={subscription} />

          {/* Card: Próxima Entrega */}
          <NextDeliveryCard cycles={subscription.subscription_cycles} />

          {/* Card: Nível de Fidelidade */}
          <LoyaltyCard level={loyaltyLevel} cycles={subscription.current_cycle} />
        </div>
      ) : (
        <NoSubscriptionCTA />
      )}
    </div>
  )
}
```

### 6.3 Cancelar / Pausar Assinatura

```ts
// app/api/subscriptions/[id]/cancel/route.ts
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { reason } = body

  // Verifica se a assinatura pertence ao usuário
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('mp_subscription_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!subscription) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cancela no MP
  await preApprovalClient.update({
    id:   subscription.mp_subscription_id!,
    body: { status: 'cancelled' }
  })

  // Atualiza no banco
  await supabase
    .from('subscriptions')
    .update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq('id', params.id)

  return NextResponse.json({ success: true })
}
```

---

## 7. Painel Administrativo

### 7.1 Rotas do Admin

```
/admin                    → Dashboard com KPIs
/admin/subscribers        → Lista de assinantes
/admin/cycles             → Gerenciar ciclos mensais
/admin/themes             → Cadastrar temas mensais
/admin/shipments          → Inserir códigos de rastreio
/admin/payments           → Histórico de pagamentos
```

### 7.2 Proteção de Rota Admin

```ts
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { user } } = await supabase.auth.getUser()

  // Protege rotas do dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/auth?next=' + req.nextUrl.pathname, req.url))
  }

  // Protege rotas do admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/auth', req.url))

    // Verifica se é admin (coluna na tabela profiles ou claims JWT)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/checkout/:path*']
}
```

### 7.3 KPIs do Admin

```ts
// app/admin/page.tsx (Server Component)
async function getAdminStats(supabase: any) {
  const [mrr, subscribers, cycles, recentPayments] = await Promise.all([
    supabase.from('mrr').select('*'),
    supabase.from('active_subscribers').select('count', { count: 'exact' }),
    supabase.from('subscription_cycles').select('count', { count: 'exact' }).eq('status', 'preparing'),
    supabase.from('payments').select('*').eq('status', 'approved').order('paid_at', { ascending: false }).limit(5),
  ])

  return { mrr: mrr.data, subscribers: subscribers.count, cyclesInProduction: cycles.count, recentPayments: recentPayments.data }
}
```

---

## 8. Rotas e API Routes

### 8.1 Mapa Completo de Rotas

```
# Públicas
GET  /                          → Landing page
GET  /auth                      → Tela de login/cadastro
GET  /auth/callback             → Callback OAuth

# Checkout (requer auth)
GET  /checkout                  → Fluxo de checkout
POST /api/subscriptions/create  → Criar pré-aprovação MP
POST /api/payments/process      → Processar pagamento

# Dashboard (requer auth)
GET  /dashboard                 → Visão geral
GET  /dashboard/subscription    → Detalhes da assinatura
GET  /dashboard/deliveries      → Histórico de entregas
GET  /dashboard/payments        → Histórico de pagamentos
GET  /dashboard/profile         → Perfil do usuário
GET  /dashboard/addresses       → Endereços
GET  /dashboard/loyalty         → Nível de fidelidade

# API Dashboard (requer auth)
PATCH /api/subscriptions/[id]/cancel → Cancelar
PATCH /api/subscriptions/[id]/pause  → Pausar
PATCH /api/profile                   → Atualizar perfil
POST  /api/addresses                 → Criar endereço
PATCH /api/addresses/[id]            → Atualizar endereço
DELETE /api/addresses/[id]           → Remover endereço

# Admin (requer is_admin)
GET  /admin                          → Dashboard admin
GET  /admin/subscribers              → Lista assinantes
POST /api/admin/cycles/[id]/ship     → Marcar como enviado + tracking
GET  /api/admin/themes               → Listar temas
POST /api/admin/themes               → Criar tema

# Webhooks (requer assinatura MP)
POST /api/webhooks/mercadopago       → Eventos do MP
```

---

## 9. Webhooks e Eventos

### 9.1 Configuração no Mercado Pago

```
Dashboard MP > Suas integrações > Webhooks > Adicionar:

URL: https://dungeonbox.com.br/api/webhooks/mercadopago

Eventos a ativar:
  ✓ subscription_preapproval
  ✓ subscription_preapproval_plan
  ✓ payment
```

### 9.2 Eventos e Ações

| Evento MP                    | Ação no Sistema                                    |
|------------------------------|----------------------------------------------------|
| `subscription_preapproval` → `authorized` | Ativa assinatura, cria ciclo 1, envia e-mail boas-vindas |
| `subscription_preapproval` → `cancelled`  | Cancela assinatura no banco                        |
| `subscription_preapproval` → `paused`     | Pausa assinatura no banco                          |
| `payment` → `approved`      | Registra pagamento, avança ciclo, atualiza loyalty |
| `payment` → `rejected`      | Status `past_due`, envia e-mail de falha           |
| `payment` → `refunded`      | Registra reembolso                                 |

---

## 10. Segurança e RLS

### 10.1 Row Level Security no Supabase

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_votes       ENABLE ROW LEVEL SECURITY;

-- plans: leitura pública
CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (true);

-- profiles: usuário vê/edita apenas o seu
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- addresses: usuário gerencia apenas os seus
CREATE POLICY "addresses_own" ON addresses
  FOR ALL USING (auth.uid() = user_id);

-- subscriptions: usuário vê apenas as suas
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- subscription_cycles: usuário vê ciclos das suas assinaturas
CREATE POLICY "cycles_own" ON subscription_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = subscription_id AND s.user_id = auth.uid()
    )
  );

-- payments: usuário vê apenas os seus
CREATE POLICY "payments_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- theme_votes: usuário gerencia seus votos
CREATE POLICY "votes_own" ON theme_votes
  FOR ALL USING (auth.uid() = user_id);

-- loyalty_levels: leitura pública
CREATE POLICY "loyalty_public_read" ON loyalty_levels FOR SELECT USING (true);
CREATE POLICY "themes_public_read"  ON themes FOR SELECT USING (is_revealed = true);
```

### 10.2 Adicionar campo `is_admin` no profiles

```sql
ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;

-- Definir admin manualmente pelo Supabase Studio:
UPDATE profiles SET is_admin = true WHERE email = 'seu@email.com';
```

---

## 11. Estrutura de Arquivos

```
dungeonbox/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Landing page
│   ├── globals.css
│   │
│   ├── auth/
│   │   ├── page.tsx                  # Login/Cadastro
│   │   └── callback/route.ts         # OAuth callback
│   │
│   ├── checkout/
│   │   ├── page.tsx                  # Checkout 3-steps
│   │   └── success/page.tsx          # Confirmação
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                # Sidebar do dashboard
│   │   ├── page.tsx                  # Visão geral
│   │   ├── subscription/page.tsx
│   │   ├── deliveries/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── addresses/page.tsx
│   │   └── loyalty/page.tsx
│   │
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # KPIs
│   │   ├── subscribers/page.tsx
│   │   ├── cycles/page.tsx
│   │   ├── themes/page.tsx
│   │   └── shipments/page.tsx
│   │
│   └── api/
│       ├── subscriptions/
│       │   ├── create/route.ts
│       │   └── [id]/
│       │       ├── cancel/route.ts
│       │       └── pause/route.ts
│       ├── payments/
│       │   └── process/route.ts
│       ├── profile/route.ts
│       ├── addresses/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── admin/
│       │   ├── cycles/[id]/ship/route.ts
│       │   └── themes/route.ts
│       └── webhooks/
│           └── mercadopago/route.ts
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── DashboardSidebar.tsx
│   │
│   ├── sections/                     # Sections da LP
│   │   ├── Hero.tsx
│   │   ├── Marquee.tsx
│   │   ├── PlanSection.tsx           # Reutilizável para os 3 planos
│   │   ├── Fidelidade.tsx
│   │   ├── Temas.tsx
│   │   └── FAQ.tsx
│   │
│   ├── auth/
│   │   └── AuthForm.tsx
│   │
│   ├── checkout/
│   │   ├── StepPlan.tsx
│   │   ├── StepAddress.tsx
│   │   ├── StepPayment.tsx
│   │   └── MPPaymentBrick.tsx
│   │
│   ├── dashboard/
│   │   ├── SubscriptionStatusCard.tsx
│   │   ├── NextDeliveryCard.tsx
│   │   ├── LoyaltyCard.tsx
│   │   ├── PaymentHistoryTable.tsx
│   │   └── TrackingTimeline.tsx
│   │
│   └── ui/
│       ├── AnimatedSection.tsx
│       ├── ParallaxImage.tsx
│       ├── CTAButton.tsx
│       ├── GlowOrb.tsx
│       ├── StatusBadge.tsx
│       └── AddressForm.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server component client
│   │   └── types.ts                  # Tipos gerados pelo Supabase
│   ├── mercadopago.ts
│   ├── data.ts                       # Conteúdo estático (planos, temas, FAQ)
│   └── utils.ts                      # Helpers (formatCurrency, etc)
│
├── middleware.ts
├── tailwind.config.js
├── next.config.js
└── package.json
```

---

## 12. Variáveis de Ambiente

```env
# .env.local

# App
NEXT_PUBLIC_APP_URL=https://dungeonbox.com.br

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # NUNCA expor no cliente

# Mercado Pago
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxx   # Pública — usada no Brick
MP_ACCESS_TOKEN=APP_USR-xxx             # Privada — somente server
MP_WEBHOOK_SECRET=xxx                   # Para validar assinatura do webhook

# E-mail (Resend recomendado)
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@dungeonbox.com.br
```

---

## 13. Ordem de Implementação

### Sprint 1 — Fundação (Dias 1–3)
- [ ] Setup Next.js 14 + Tailwind + Framer Motion
- [ ] Criar projeto Supabase + configurar variáveis
- [ ] Executar migrations SQL (todas as tabelas)
- [ ] Configurar Auth: Google, Discord, Email
- [ ] Implementar `AuthForm.tsx` e `/auth/callback`
- [ ] Configurar middleware de proteção de rotas
- [ ] Popular `lib/data.ts` com planos e temas
- [ ] Seed das tabelas `plans` e `loyalty_levels`

### Sprint 2 — Landing Page (Dias 3–6)
- [ ] Hero section com paralax
- [ ] Marquee animado
- [ ] 3 sections de planos (image + texto)
- [ ] Section de fidelidade
- [ ] Section de temas mensais
- [ ] FAQ accordion
- [ ] Navbar + Footer
- [ ] Gerar imagens com IA e otimizar

### Sprint 3 — Checkout (Dias 6–9)
- [ ] Step 1: Seleção de plano e cores
- [ ] Step 2: Formulário de endereço (autocomplete ViaCEP)
- [ ] Step 3: Integração Mercado Pago Brick
- [ ] API Route `POST /api/subscriptions/create`
- [ ] Página de sucesso `/checkout/success`
- [ ] Fluxo completo testado em sandbox MP

### Sprint 4 — Webhook e Ativação (Dias 9–11)
- [ ] Implementar `/api/webhooks/mercadopago`
- [ ] Validação de assinatura do webhook
- [ ] Handler de `subscription_preapproval`
- [ ] Handler de `payment`
- [ ] Lógica de ciclos e loyalty
- [ ] Testar com ferramenta de simulação do MP

### Sprint 5 — Dashboard do Usuário (Dias 11–15)
- [ ] Layout do dashboard com sidebar
- [ ] Página de visão geral (status, próxima entrega)
- [ ] Página de assinatura (detalhes + cancelar/pausar)
- [ ] Página de entregas (histórico + tracking)
- [ ] Página de pagamentos (histórico)
- [ ] Página de perfil (editar dados, CPF)
- [ ] Página de endereços (CRUD)
- [ ] Página de fidelidade (nível atual + próximo)

### Sprint 6 — Admin e Polimento (Dias 15–18)
- [ ] Dashboard admin com KPIs (MRR, assinantes, ciclos)
- [ ] Lista de assinantes com filtros
- [ ] Tela de inserção de códigos de rastreio
- [ ] CRUD de temas mensais
- [ ] E-mails transacionais (boas-vindas, falha, enviado)
- [ ] Testes de ponta a ponta
- [ ] Deploy na Vercel + configuração de domínio

---

### Estimativa Total

| Sprint                    | Dias  |
|---------------------------|-------|
| 1 — Fundação              | 3     |
| 2 — Landing Page          | 3     |
| 3 — Checkout              | 3     |
| 4 — Webhook + Ativação    | 2     |
| 5 — Dashboard Usuário     | 4     |
| 6 — Admin + Polimento     | 3     |
| **Total**                 | **~18 dias** |

---

*DungeonBox · Documento Técnico do Sistema de Assinatura · v1.0*
