# DungeonBox — Implementação Multi-Gateway
## Asaas + Pagar.me · Checkout transparente · Toggle no Admin
### v2.0 · Julho 2026

> Documento alinhado ao código em produção. Descreve o estado atual validado (Asaas),
> o que falta implementar (Pagar.me) e como integrar os dois fluxos sem quebrar
> assinaturas, combos, webhooks ou o painel admin existente.

---

## 1. Estado atual (validado)

### 1.1 Provedores no código

| Provedor | Papel | Colunas no banco | Status |
|---|---|---|---|
| **Asaas** | Checkout ativo (padrão) | `profiles.asaas_customer_id`, `subscriptions.asaas_*` | ✅ Produção |
| **Stripe** | Legado / rollback via env | `profiles.stripe_customer_id`, `subscriptions.stripe_*` | ⚠️ Mantido, desativado por padrão |
| **Mercado Pago** | Legado (assinaturas antigas) | `subscriptions.mp_*` | ⚠️ Somente leitura / webhooks |
| **Pagar.me** | Novo segundo gateway | `pagarme_*` (a criar) | ❌ A implementar |

### 1.2 Como o checkout escolhe o provedor hoje

O provedor ativo é definido por variável de ambiente, não pelo admin:

```ts
// lib/payments/public.ts
export const ACTIVE_PAYMENT_PROVIDER: 'asaas' | 'stripe' =
  explicit === 'stripe' || explicit === 'asaas' ? explicit : 'asaas';
```

```env
# .env.example
PAYMENT_PROVIDER=asaas
NEXT_PUBLIC_PAYMENT_PROVIDER=asaas
```

O servidor usa `lib/payments/provider.ts` (`getPaymentProvider()`, `isAsaasCheckout()`).

### 1.3 Fluxo Asaas (referência — não reimplementar)

```
StepPayment.tsx
  └─ AsaasPaymentForm (cartão no client, enviado ao servidor)
       └─ POST /api/asaas/subscription/create
            └─ lib/asaas/subscription-checkout.ts → createAsaasSubscription()
                 ├─ prepareCheckoutSubscription()  (retry / bloqueio / ativação)
                 ├─ combo billing + parcelas + cupom + frete + bump
                 ├─ insert/update em subscriptions (status: pending)
                 └─ syncAsaasSubscriptionPayments()
  └─ Webhook POST /api/webhooks/asaas
       └─ lib/asaas/webhook-handlers.ts
            ├─ ativação, ciclos, combo, loja, referral, upgrade
            └─ past_due, refund, overdue
```

**Arquivos-chave (Asaas):**

| Camada | Arquivo |
|---|---|
| Formulário | `components/checkout/AsaasPaymentForm.tsx` |
| Orquestração checkout | `components/checkout/StepPayment.tsx` |
| API criação | `app/api/asaas/subscription/create/route.ts` |
| Lógica de negócio | `lib/asaas/subscription-checkout.ts` |
| Webhook | `app/api/webhooks/asaas/route.ts` |
| Handlers | `lib/asaas/webhook-handlers.ts` |
| Troca de cartão | `app/api/subscriptions/payment-method/route.ts` |
| | `lib/subscriptions/update-asaas-payment-method.ts` |
| Sync admin | `components/admin/SyncAsaasButton.tsx` |
| Lista admin | `app/admin/assinaturas/page.tsx` |

### 1.4 Regra de ouro: gateway por assinatura

Cada assinatura fica vinculada ao gateway em que foi criada. O toggle no admin afeta
**somente novos checkouts**. Assinantes existentes continuam cobrando no gateway original
até migração explícita (fluxo de update de cartão, seção 8).

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN — /admin/financeiro/gateway                          │
│  Gateway ativo para novos assinantes: [ ASAAS ▼ | PAGAR.ME ] │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   Novos checkouts               Assinantes existentes
   usam gateway ativo            permanecem no gateway
                                  registrado na assinatura
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  /admin/assinaturas  (já existe — estender com filtro)      │
│  Nome | Plano | Gateway | Próx. cobrança | Status | Ações    │
└─────────────────────────────────────────────────────────────┘
```

### 1.5 Como identificar o gateway de uma assinatura

Função utilitária a criar em `lib/payments/subscription-gateway.ts`:

```ts
export type SubscriptionGateway = 'asaas' | 'pagarme' | 'stripe' | 'mercadopago' | 'partner' | 'none';

export function resolveSubscriptionGateway(sub: {
  is_partner?: boolean | null;
  asaas_subscription_id?: string | null;
  pagarme_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
  mp_subscription_id?: string | null;
}): SubscriptionGateway {
  if (sub.is_partner) return 'partner';
  if (sub.pagarme_subscription_id) return 'pagarme';
  if (sub.asaas_subscription_id) return 'asaas';
  if (sub.stripe_subscription_id) return 'stripe';
  if (sub.mp_subscription_id) return 'mercadopago';
  return 'none';
}
```

> **Não** usar coluna genérica `gateway` + `gateway_sub_id`. O projeto já segue o padrão
> de colunas por provedor (`asaas_*`, `stripe_*`, `mp_*`). Manter consistência.

---

## 2. Banco de dados

### 2.1 Migration — colunas Pagar.me

Seguir o mesmo padrão de `supabase/migrations/20260612_asaas.sql`:

```sql
-- supabase/migrations/YYYYMMDD_pagarme.sql

-- Customer no Pagar.me (por perfil)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pagarme_customer_id text UNIQUE;

-- Assinatura no Pagar.me
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pagarme_customer_id text,
  ADD COLUMN IF NOT EXISTS pagarme_subscription_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_pagarme_id
  ON subscriptions(pagarme_subscription_id);

-- Campos de migração Asaas → Pagar.me (update de cartão)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS card_last4       text,
  ADD COLUMN IF NOT EXISTS card_brand       text,
  ADD COLUMN IF NOT EXISTS update_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS migrated_to_pagarme_at timestamptz;
```

### 2.2 Migration — configuração ativa no admin

```sql
CREATE TABLE gateway_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_gateway  text NOT NULL DEFAULT 'asaas'
                    CHECK (active_gateway IN ('asaas', 'pagarme')),
  updated_by      uuid REFERENCES auth.users(id),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Configuração inicial
INSERT INTO gateway_config (active_gateway) VALUES ('asaas');

-- RLS: somente service role / admin escreve; leitura pública do valor ativo via API server-side
ALTER TABLE gateway_config ENABLE ROW LEVEL SECURITY;
```

### 2.3 Migration — log de migração de cartão

```sql
CREATE TABLE gateway_migration_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_from    text NOT NULL,
  gateway_to      text NOT NULL,
  update_token    text UNIQUE,          -- token do link de email (hash ou UUID)
  token_expires_at timestamptz,
  email_sent_at   timestamptz,
  card_updated_at timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','updated','expired','failed')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gateway_migration_sub ON gateway_migration_log(subscription_id);
CREATE INDEX idx_gateway_migration_token ON gateway_migration_log(update_token)
  WHERE update_token IS NOT NULL;
```

### 2.4 Campos que o doc v1 usava incorretamente

| Doc v1 (errado) | Código real |
|---|---|
| `plan_slug` na subscription | `plan_id` (FK → `plans`) |
| `next_billing_at` | `next_billing_date` |
| `gateway` + `gateway_sub_id` | `asaas_subscription_id`, `pagarme_subscription_id`, etc. |
| `status: 'cancelled'` no webhook | enum `subscription_status` — usar `'cancelled'` (já correto) |

---

## 3. Variáveis de ambiente

Adicionar ao `.env.example`:

```env
# Provedor de pagamento no checkout: asaas (padrão) | pagarme | stripe (legado)
# PAYMENT_PROVIDER continua como fallback se gateway_config estiver vazio
PAYMENT_PROVIDER=asaas
NEXT_PUBLIC_PAYMENT_PROVIDER=asaas

# Asaas (já existente)
ASAAS_API_KEY=\$aact_xxx
ASAAS_WEBHOOK_TOKEN=seu-token-do-webhook-asaas
ASAAS_ENV=sandbox

# Pagar.me (novo)
PAGARME_SECRET_KEY=sk_xxx
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=pk_xxx
PAGARME_WEBHOOK_SECRET=whsec_xxx
# Planos criados manualmente no painel Pagar.me Core v5
PAGARME_PLAN_AVENTUREIRO_ID=plan_xxx
PAGARME_PLAN_HEROI_ID=plan_xxx
PAGARME_PLAN_LENDARIO_ID=plan_xxx

# Cron (já existente — lib/cron/auth.ts)
CRON_SECRET=seu-cron-secret
```

---

## 4. Provedor ativo — estender `lib/payments/provider.ts`

Substituir leitura exclusiva de env por: **banco → env → default**.

```ts
// lib/payments/provider.ts

export type PaymentProvider = 'asaas' | 'pagarme' | 'stripe';

export async function getActivePaymentProvider(): Promise<PaymentProvider | null> {
  // 1. gateway_config (admin)
  const fromDb = await readGatewayConfigFromDb();
  if (fromDb === 'pagarme' && PAGARME_CONFIGURED) return 'pagarme';
  if (fromDb === 'asaas' && ASAAS_CONFIGURED) return 'asaas';

  // 2. env (fallback / dev local)
  const fromEnv = normalizeProvider(process.env.PAYMENT_PROVIDER);
  if (fromEnv === 'pagarme' && PAGARME_CONFIGURED) return 'pagarme';
  if (fromEnv === 'asaas' && ASAAS_CONFIGURED) return 'asaas';
  if (fromEnv === 'stripe' && STRIPE_CONFIGURED) return 'stripe';

  // 3. auto
  if (ASAAS_CONFIGURED) return 'asaas';
  if (PAGARME_CONFIGURED) return 'pagarme';
  if (STRIPE_CONFIGURED) return 'stripe';
  return null;
}
```

Atualizar `lib/payments/public.ts` para expor `'pagarme'` no client:

```ts
export const ACTIVE_PAYMENT_PROVIDERS = ['asaas', 'pagarme', 'stripe'] as const;
export const PAGARME_CHECKOUT_READY = ACTIVE_PAYMENT_PROVIDER === 'pagarme';
```

> O valor client-side pode ser lido via API (`GET /api/checkout/provider`) ou
> `NEXT_PUBLIC_PAYMENT_PROVIDER` sincronizado ao salvar no admin (revalidar cache).

---

## 5. Módulo Pagar.me — espelhar `lib/asaas/*`

Estrutura proposta (mesma granularidade do Asaas):

```
lib/pagarme/
  client.ts              # auth, base URL, pagarmeRequest()
  errors.ts              # userFacingPagarmeError()
  customer.ts            # getOrCreatePagarmeCustomer()
  subscription-checkout.ts  # createPagarmeSubscription() — espelho de asaas/subscription-checkout.ts
  subscription-api.ts    # cancel, update plan
  update-subscription-card.ts
  payment-sync.ts
  webhook-handlers.ts    # handlers espelhando lib/asaas/webhook-handlers.ts
  webhook-auth.ts
  client-ip.ts           # reutilizar lib/asaas/client-ip.ts ou extrair para lib/http/
  reconcile-pending.ts
```

### 5.1 Client HTTP

```ts
// lib/pagarme/client.ts
const BASE_URL = 'https://api.pagar.me/core/v5';

export const PAGARME_CONFIGURED = Boolean(process.env.PAGARME_SECRET_KEY?.trim());

function authHeader() {
  const key = process.env.PAGARME_SECRET_KEY!.trim();
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
}

export async function pagarmeRequest<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: authHeader(),
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PagarmeApiError(/* ... */);
  return data as T;
}
```

### 5.2 Criação de assinatura

`createPagarmeSubscription()` deve seguir **o mesmo contrato** de `createAsaasSubscription()`:

- Receber `CreatePagarmeSubscriptionInput` (mesmos campos de negócio)
- Usar `prepareCheckoutSubscription()` antes de criar
- Gravar `subscriptions` com `pagarme_customer_id`, `pagarme_subscription_id`
- Suportar retry de assinatura `pending`
- Registrar cupom, frete, bump, `billing_term`, combo fields

**Diferença de tokenização:** Pagar.me exige token client-side (seção 6).
O servidor recebe `cardToken`, não dados brutos do cartão.

### 5.3 Mapeamento de planos

```ts
// lib/pagarme/plan-ids.ts
const PLAN_MAP: Record<PlanSlug, string> = {
  aventureiro: process.env.PAGARME_PLAN_AVENTUREIRO_ID!,
  heroi:       process.env.PAGARME_PLAN_HEROI_ID!,
  lendario:    process.env.PAGARME_PLAN_LENDARIO_ID!,
};
```

Criar os 3 planos no painel Pagar.me com os mesmos valores dos planos DungeonBox.

### 5.4 Escopo v1 do Pagar.me

| Feature | Asaas (hoje) | Pagar.me v1 |
|---|---|---|
| Assinatura mensal simples | ✅ | ✅ |
| Múltiplos planos no mesmo checkout | ✅ | ✅ |
| Cupom de desconto | ✅ | ✅ |
| Frete mensal | ✅ | ✅ |
| Paint kit bump | ✅ | ✅ |
| Combo 3/6/12 meses + parcelas | ✅ | ⚠️ Fase 2 — bloquear no checkout se gateway = pagarme |
| Upgrade de plano | ✅ | ⚠️ Fase 2 |
| Loja avulsa | ✅ (Asaas) | ❌ Loja continua no Asaas |
| Stripe / MP legado | leitura | leitura |

No `StepPayment.tsx`, se `PAGARME_CHECKOUT_READY && isCombo`, exibir mensagem:
*"Combos disponíveis apenas com Asaas no momento."*

---

## 6. Checkout — frontend

### 6.1 Estender `StepPayment.tsx` (não criar página paralela)

O componente já bifurca Asaas vs Stripe. Adicionar terceiro ramo:

```tsx
// components/checkout/StepPayment.tsx

import PagarmePaymentForm, { type PagarmeCardPayload } from './PagarmePaymentForm';
import { ASAAS_CHECKOUT_READY, PAGARME_CHECKOUT_READY, STRIPE_CHECKOUT_ACTIVE } from '@/lib/payments/public';

// handlePagarmeSubmit — espelha handleAsaasSubmit
async function handlePagarmeSubmit(cardToken: string, meta: { last4: string; brand: string }) {
  const res = await fetch('/api/pagarme/subscription/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planSlugs: data.planSlugs,
      addressId: data.addressId,
      specialNotes: data.specialNotes,
      paintKitBump: data.paintKitBump,
      paintKitBumpRecurring: data.paintKitBumpRecurring,
      billingTerm: data.billingTerm,
      installmentCount: data.installmentCount,
      cardToken,
      cardLast4: meta.last4,
      cardBrand: meta.brand,
      couponCode: promotionCode,
    }),
  });
  // ... mesmo tratamento de erro/sucesso do Asaas
}
```

### 6.2 `PagarmePaymentForm.tsx` — tokenização client-side

Usar SDK oficial compatível com **Core v5** (validar versão na documentação Pagar.me
antes de implementar — não usar `pagarme.min.js` v4 se incompatível com v5).

```tsx
// components/checkout/PagarmePaymentForm.tsx
'use client';

// UI idêntica ao AsaasPaymentForm (reutilizar classes CSS)
// Diferença: ao submeter, tokenizar no client e chamar onSubmit(token, { last4, brand })
```

### 6.3 API — `app/api/pagarme/subscription/create/route.ts`

Espelhar `app/api/asaas/subscription/create/route.ts`:

- Mesmo `bodySchema` (trocar `creditCard` por `cardToken` + `cardLast4` + `cardBrand`)
- `getUser()` via sessão (nunca confiar em `userId` do body)
- `isPagarmeCheckout()` guard no início
- Mesmo loop de `planSlugs`, referral, cupom, frete
- Chamar `createPagarmeSubscription()` em vez de `createAsaasSubscription()`

---

## 7. Webhooks

### 7.1 Rota — `app/api/webhooks/pagarme/route.ts`

Seguir o padrão de `app/api/webhooks/asaas/route.ts`:

```ts
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // 1. Validar assinatura (lib/pagarme/webhook-auth.ts)
  // 2. Parsear evento
  // 3. Delegar para lib/pagarme/webhook-handlers.ts
  // 4. Retornar { received: true, processed, skipped }
}
```

### 7.2 Handlers — espelhar lógica Asaas

`lib/pagarme/webhook-handlers.ts` deve chamar as mesmas funções de domínio:

| Evento Pagar.me | Ação local (reutilizar) |
|---|---|
| Assinatura ativa / cobrança paga | `activateSubscriptionFromPagarme()` (novo, espelho de `activate-asaas.ts`) |
| | `processActiveSubscriptionPayment()` |
| | `markCyclePreparing()` |
| Pagamento em atraso | `applySubscriptionStatusChange('past_due')` |
| Assinatura cancelada | `applySubscriptionStatusChange('cancelled')` |
| | `cleanupSubscriptionCyclesOnCancel()` |
| | `cancelReferralForSubscription()` |

> Combo, loja e parcelas: na v1, webhooks Pagar.me tratam apenas assinatura mensal.
> Eventos de combo ficam exclusivos do Asaas até Fase 2.

### 7.3 Idempotência

Antes de processar, verificar se o `pagarme_payment_id` / evento já foi registrado
na tabela `payments` (mesmo padrão usado para `asaas_payment_id`).

---

## 8. Migração Asaas → Pagar.me (assinantes existentes)

Fluxo para migrar assinantes mensais do Asaas para o Pagar.me sem interromper cobrança.

### 8.1 Pré-requisitos

- Assinatura `active` com `asaas_subscription_id` preenchido
- `billing_term = 'monthly'` (sem combo)
- `migrated_to_pagarme_at IS NULL`

### 8.2 Disparo semanal (cron)

```ts
// lib/pagarme/migration-emails.ts
// Espelha padrão de lib/cron/auth.ts + app/api/cron/subscriptions/reconcile-pending/route.ts

export async function processWeeklyMigrationEmails() {
  const in7days = /* now + 7 days */;

  const { data: candidates } = await supabaseAdmin
    .from('subscriptions')
    .select(`id, user_id, next_billing_date, profiles(email, full_name)`)
    .eq('status', 'active')
    .not('asaas_subscription_id', 'is', null)
    .is('pagarme_subscription_id', null)
    .is('migrated_to_pagarme_at', null)
    .eq('billing_term', 'monthly')
    .lte('next_billing_date', in7days.toISOString())
    .or(`update_requested_at.is.null,update_requested_at.lt.${sevenDaysAgo}`);

  for (const sub of candidates ?? []) {
    const token = crypto.randomUUID();
    const expiresAt = /* now + 7 days */;

    await supabaseAdmin.from('gateway_migration_log').insert({
      subscription_id: sub.id,
      user_id: sub.user_id,
      gateway_from: 'asaas',
      gateway_to: 'pagarme',
      update_token: token,           // em produção: armazenar hash
      token_expires_at: expiresAt,
      status: 'sent',
      email_sent_at: new Date().toISOString(),
    });

    await supabaseAdmin.from('subscriptions')
      .update({ update_requested_at: new Date().toISOString() })
      .eq('id', sub.id);

    await sendCardMigrationEmail({
      to: sub.profiles.email,
      name: sub.profiles.full_name,
      updateLink: `${getSiteUrl()}/atualizar-pagamento?token=${token}`,
      billingDate: sub.next_billing_date,
    });
  }
}
```

### 8.3 Cron

```json
// vercel.json — adicionar ao array existente
{
  "path": "/api/cron/gateway-migration-emails",
  "schedule": "0 9 * * 1"
}
```

```ts
// app/api/cron/gateway-migration-emails/route.ts
import { verifyCronSecret, unauthorizedCronResponse } from '@/lib/cron/auth';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) return unauthorizedCronResponse();
  const result = await processWeeklyMigrationEmails();
  return NextResponse.json({ ok: true, ...result });
}
```

### 8.4 Página pública — `app/atualizar-pagamento/page.tsx`

- Validar `token` contra `gateway_migration_log` (não expirado, status `sent`)
- Exibir `PagarmePaymentForm` (gateway fixo: pagarme)
- POST `/api/subscriptions/migrate-payment` com `{ token, cardToken, cardLast4, cardBrand }`

### 8.5 API de migração — `app/api/subscriptions/migrate-payment/route.ts`

```
1. Validar token + expiração
2. Buscar assinatura Asaas
3. Criar assinatura Pagar.me com novo cartão
4. Cancelar assinatura Asaas (best-effort, como cancelAsaasSubscriptionBestEffort)
5. Atualizar subscriptions:
   - pagarme_subscription_id, pagarme_customer_id
   - card_last4, card_brand
   - migrated_to_pagarme_at = now()
6. Marcar gateway_migration_log.status = 'updated'
```

### 8.6 Email — usar layout existente

```ts
// lib/email/card-migration.ts
// Usar buildEmailHtml / buildEmailText de lib/email/layout.ts
// Mesmo padrão visual de lib/email/subscription-notify.ts
```

---

## 9. Painel Admin

### 9.1 Nova página — `/admin/financeiro/gateway`

Adicionar ao `ADMIN_NAV` em `lib/admin/constants.ts` (grupo Operação, após Financeiro):

```ts
{
  href: '/admin/financeiro/gateway',
  label: 'Gateway',
  eyebrow: 'Pagamentos',
  description: 'Provedor ativo para novos checkouts.',
  icon: 'credit-card',
  group: 'operacao',
}
```

**UI:** toggle Asaas / Pagar.me com confirmação e aviso:
*"Assinantes existentes não são afetados. Apenas novos checkouts usarão o gateway selecionado."*

### 9.2 API — `app/api/admin/gateway/switch/route.ts`

```ts
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(request: Request) {
  const { user, admin } = await requireAdmin();
  const { gateway } = await request.json();

  if (!['asaas', 'pagarme'].includes(gateway)) {
    return Response.json({ error: 'Gateway inválido' }, { status: 400 });
  }

  await admin.from('gateway_config').insert({
    active_gateway: gateway,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  await logAdminAction(admin, user.id, 'gateway.switch', { gateway });

  return Response.json({ success: true, active_gateway: gateway });
}
```

### 9.3 Estender `/admin/assinaturas` (não criar página nova)

Alterações em arquivos existentes:

| Arquivo | Mudança |
|---|---|
| `components/admin/AdminSubscriptionsFiltersForm.tsx` | Filtro `gateway`: Todos \| Asaas \| Pagar.me \| Stripe \| MP |
| `lib/admin/queries.ts` → `listAdminSubscriptions` | Select `pagarme_subscription_id`; filtro por gateway |
| `lib/admin/queries.ts` | Busca incluir `pagarme_subscription_id.ilike` |
| `app/admin/assinaturas/page.tsx` | Coluna Gateway (badge), resumo no topo |
| `components/admin/AdminSubscriptionActions.tsx` | `SyncPagarmeButton` (espelho do Asaas) |

**Resumo no topo da lista:**

```
Total Asaas: XX  |  Total Pagar.me: XX  |  Pendentes migração: XX
```

**Ações por linha (adicionar):**

- Enviar email de migração manualmente (Asaas → Pagar.me)
- Ver no painel do gateway (link externo)
- Sync Pagarme (quando `pagarme_subscription_id` presente)

---

## 10. Troca de cartão no dashboard (assinantes já no Pagar.me)

Espelhar fluxo Asaas existente:

| Asaas (hoje) | Pagar.me (criar) |
|---|---|
| `components/dashboard/SubscriptionCardUpdate.tsx` | Mesmo componente, bifurcar por gateway |
| `app/api/subscriptions/payment-method/route.ts` | Estender para rotear por `resolveSubscriptionGateway()` |
| `lib/subscriptions/update-asaas-payment-method.ts` | `lib/subscriptions/update-pagarme-payment-method.ts` |
| `lib/asaas/update-subscription-credit-card.ts` | `lib/pagarme/update-subscription-card.ts` |

---

## 11. Cronograma de implementação

### Fase 1 — Infraestrutura (3–4 dias)

```
□ Migration Supabase (pagarme_*, gateway_config, gateway_migration_log)
□ Conta Pagar.me + 3 planos no painel
□ Variáveis de ambiente (local + Vercel)
□ lib/pagarme/client.ts, errors.ts, customer.ts, plan-ids.ts
□ Estender lib/payments/provider.ts (banco + env)
□ lib/payments/subscription-gateway.ts
□ GET /api/checkout/provider (opcional, para client dinâmico)
```

### Fase 2 — Checkout mensal (5–7 dias)

```
□ PagarmePaymentForm.tsx (tokenização v5)
□ Estender StepPayment.tsx (terceiro ramo)
□ lib/pagarme/subscription-checkout.ts
□ POST /api/pagarme/subscription/create/route.ts
□ lib/pagarme/webhook-handlers.ts + POST /api/webhooks/pagarme/route.ts
□ lib/subscriptions/activate-pagarme.ts
□ Testar sandbox: aprovado, recusado, webhook de ativação
□ Bloquear combo no checkout Pagar.me (mensagem clara)
```

### Fase 3 — Admin (2–3 dias)

```
□ /admin/financeiro/gateway (toggle)
□ POST /api/admin/gateway/switch + auditoria
□ Filtro gateway em /admin/assinaturas
□ SyncPagarmeButton
□ Testar alternância Asaas ↔ Pagar.me em staging
```

### Fase 4 — Migração de assinantes (4–5 dias)

```
□ lib/pagarme/migration-emails.ts
□ lib/email/card-migration.ts
□ app/atualizar-pagamento/page.tsx
□ POST /api/subscriptions/migrate-payment/route.ts
□ Cron /api/cron/gateway-migration-emails
□ Estender payment-method para Pagar.me
□ Testar fluxo completo: email → token → novo cartão → cancel Asaas
```

### Fase 5 — Migração em produção (2–3 semanas)

```
□ Primeira rodada: assinantes mensais com vencimento em 7 dias
□ Monitorar no admin: pendentes migração, falhas, inadimplência
□ Lembrete manual (admin) para quem não migrou em 3 dias
□ Repetir semanalmente até esvaziar fila Asaas mensal
□ Combos Asaas: manter no Asaas indefinidamente ou planejar Fase 6
```

### Fase 6 — Paridade avançada (backlog)

```
□ Combo billing no Pagar.me
□ Upgrade de plano via Pagar.me
□ reconcile-pending para Pagar.me
□ Desativar Stripe/MP quando fila zerar
```

---

## 12. Cartões de teste — Pagar.me Sandbox

```
Aprovado:   4111111111111111  | 01/30 | 123
Recusado:   4000000000000002  | 01/30 | 123
Sem saldo:  4000000000000119  | 01/30 | 123
```

---

## 13. Checklist de validação antes de ir para produção

```
□ Novo checkout com Asaas ativo no admin → assinatura com asaas_subscription_id
□ Novo checkout com Pagar.me ativo no admin → assinatura com pagarme_subscription_id
□ Alternar gateway no admin não afeta assinaturas existentes
□ Webhook Pagar.me ativa assinatura e dispara ciclo de produção
□ Webhook Asaas continua funcionando para assinantes legados
□ Combo bloqueado no checkout Pagar.me (v1)
□ Migração: email → token → cartão → cancel Asaas → ativo no Pagar.me
□ Troca de cartão no dashboard funciona para ambos os gateways
□ Admin lista e filtra por gateway corretamente
□ CRON_SECRET protege endpoints de cron
□ Auditoria registra troca de gateway
```

---

## 14. Decisões registradas

| Decisão | Escolha |
|---|---|
| Modelo de dados | Colunas por provedor (`pagarme_*`), não genérico |
| Toggle admin | `gateway_config` com fallback para `PAYMENT_PROVIDER` env |
| Checkout | Estender `StepPayment.tsx`, não criar fluxo paralelo |
| API criação | `/api/pagarme/subscription/create` espelhando `/api/asaas/subscription/create` |
| Admin assinaturas | Estender `/admin/assinaturas`, não criar `/admin/financeiro/assinantes` |
| Combo no Pagar.me | Fora do escopo v1 |
| Loja avulsa | Permanece no Asaas |
| Stripe / MP | Legado — somente leitura até fila zerar |
| Auth admin | `requireAdmin()` + `logAdminAction()` |
| Cron | `verifyCronSecret()` de `lib/cron/auth.ts` |
| Email | `lib/email/layout.ts` (templates existentes) |

---

*DungeonBox · Implementação Multi-Gateway v2.0 · Julho 2026*
