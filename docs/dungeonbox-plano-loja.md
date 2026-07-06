# DungeonBox — Plano de Ação: Módulo Loja
## Plano A · Loja pública com layout próprio · Assinatura continua principal
### v1.1 · Julho 2026

---

## ESTRATÉGIA (decisão de produto)

**O site principal (`/`) não muda.** A LP continua focada em planos de assinatura — Hero, Planos, Fidelidade, Temas, FAQ.

**A loja vive em `/loja`** com layout próprio (header, footer e visual de e-commerce), separada do dashboard e da LP.

| Aspecto | Decisão |
|--------|---------|
| Produto principal | Assinatura mensal (`/#planos`, `/checkout`) |
| Loja | Complemento — extras, kits de pintura, cópias do kit do mês |
| Rotas | `/loja`, `/loja/[categoria]`, `/loja/produto/[slug]`, carrinho, checkout |
| Banco | Evoluir `store_products` + `store_categories` (não criar `shop_*` paralelo) |
| Acesso | Público para navegar e comprar kits de pintura; kit do mês exige assinatura |
| Checkout | Exige login (`/auth?next=/loja/checkout`) |
| Dashboard | Link "Loja" aponta para `/loja`; `/dashboard/loja/*` redireciona |

**Implementado (v1.1):** layout `ShopShell`, páginas em `app/loja/`, componentes em `components/shop/`, rotas centralizadas em `lib/store/routes.ts`.

---

## CONTEXTO E ESCOPO

**Stack atual:** Next.js 14 (App Router) + Supabase + Tailwind CSS
**Fase atual:** Loja pública com layout próprio — complemento da assinatura
**Referência visual:** Parvus Minis (dark fantasy, produto em destaque, fundo escuro)
**Identidade DungeonBox:** preto #0A0C10, laranja #F97316, cinza #E2E8F0

---

## PÁGINAS A DESENVOLVER

```
1. /loja                    → Home da loja (vitrine + destaque)
2. /loja/[categoria]        → Listagem por categoria
3. /loja/produto/[slug]     → Página do produto aberto
4. /loja/carrinho           → Carrinho de compras
5. /loja/checkout           → Checkout completo
```

---

## 1. ESTRUTURA DO BANCO DE DADOS (Supabase)

> **Nota v1.1:** Usar as tabelas existentes `store_products` e `store_categories`. O schema `shop_*` abaixo é referência histórica — não duplicar.

### Tabelas em uso

```sql
-- Categorias
CREATE TABLE shop_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  image_url   text,
  sort_order  int DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Produtos
CREATE TABLE shop_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid REFERENCES shop_categories(id),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  short_desc      text,          -- para card na listagem
  price_cents     int NOT NULL,  -- preço em centavos
  compare_cents   int,           -- preço riscado (de/por)
  stock           int DEFAULT 0,
  sku             text UNIQUE,
  active          boolean DEFAULT false,  -- inativo por padrão
  featured        boolean DEFAULT false,  -- aparece no destaque
  images          text[],        -- array de URLs
  specs           jsonb,         -- specs técnicas (escala, material, etc)
  tags            text[],
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Itens do carrinho
CREATE TABLE cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,    -- para usuários não logados
  user_id     uuid REFERENCES auth.users(id),
  product_id  uuid REFERENCES shop_products(id),
  quantity    int DEFAULT 1,
  created_at  timestamptz DEFAULT now()
);

-- Pedidos avulsos (diferente da assinatura)
CREATE TABLE shop_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  status          text DEFAULT 'pending',  -- pending|paid|producing|shipped|delivered
  total_cents     int NOT NULL,
  shipping_cents  int DEFAULT 0,
  address         jsonb,
  payment_id      text,          -- ID do pagamento no gateway
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE shop_order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES shop_orders(id),
  product_id  uuid REFERENCES shop_products(id),
  quantity    int NOT NULL,
  price_cents int NOT NULL      -- preço no momento da compra
);
```

### RLS — Acesso admin apenas (fase 1)

```sql
-- Produtos: somente admin lê e escreve
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only" ON shop_products
  USING (auth.jwt() ->> 'role' = 'admin');

-- Futuramente: liberar leitura de produtos ativos para todos
-- CREATE POLICY "public_read_active" ON shop_products
--   FOR SELECT USING (active = true);
```

---

## 2. PÁGINA HOME DA LOJA — `/loja`

### Estrutura de seções

```
┌─────────────────────────────────────────────┐
│  HERO BANNER                                │
│  Slide automático · 3 banners rotacionando  │
│  Imagem fullwidth + headline + CTA          │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  CATEGORIAS (ícones em linha)               │
│  Minis · Dungeons · Dados · Decoração       │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  PRODUTOS EM DESTAQUE                       │
│  Grid 4 colunas · badge "DESTAQUE"          │
│  featured = true no banco                  │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  BANNER INTERMEDIÁRIO                       │
│  "Monte sua dungeon do zero" → kits avulsos │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  NOVIDADES                                  │
│  Grid 4 colunas · ordenado por created_at   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  BANNER ASSINATURA                          │
│  Link para /planos                          │
└─────────────────────────────────────────────┘
```

### Componente ProductCard

```tsx
// components/shop/ProductCard.tsx
interface ProductCardProps {
  id: string
  name: string
  slug: string
  images: string[]
  price_cents: number
  compare_cents?: number
  featured?: boolean
  short_desc?: string
}

// Comportamento:
// - Hover: segunda imagem desliza (se houver)
// - Badge "OFERTA" se compare_cents > price_cents
// - Badge "DESTAQUE" se featured = true
// - Botão "Adicionar ao Carrinho" aparece no hover
// - Link para /loja/produto/[slug]
```

### Hero Slider

```tsx
// Usar Embla Carousel ou Swiper
// Auto-play: 5s
// Indicadores de ponto na base
// Transição: fade ou slide
// 3 banners configuráveis via painel admin
```

---

## 3. PÁGINA DE CATEGORIA — `/loja/[categoria]`

### Layout

```
┌──────────────────────────────────────────────────┐
│  HEADER DA CATEGORIA                              │
│  Nome + descrição + imagem de capa                │
└──────────────────────────────────────────────────┘

┌─────────┬────────────────────────────────────────┐
│ FILTROS │  GRID DE PRODUTOS                       │
│ (aside) │                                         │
│         │  [Card] [Card] [Card] [Card]            │
│ Ordenar │  [Card] [Card] [Card] [Card]            │
│ Por:    │  [Card] [Card] [Card] [Card]            │
│ • Menor │                                         │
│   preço │  PAGINAÇÃO: < 1 2 3 4 5 >              │
│ • Maior │                                         │
│   preço │                                         │
│ • Novo  │                                         │
│         │                                         │
│ Preço:  │                                         │
│ [──●──] │                                         │
└─────────┴────────────────────────────────────────┘
```

### Parâmetros de URL

```
/loja/miniaturas?ordenar=menor-preco&pagina=2
/loja/dungeons?ordenar=novidades
/loja/dados?preco_max=100
```

### Lógica Supabase

```ts
const { data } = await supabase
  .from('shop_products')
  .select('*')
  .eq('category_id', categoryId)
  .eq('active', true)
  .order(sort === 'preco-asc' ? 'price_cents' : 'created_at', { ascending: sort !== 'novidades' })
  .range(page * 20, (page + 1) * 20 - 1)
```

---

## 4. PÁGINA DO PRODUTO — `/loja/produto/[slug]`

### Layout

```
┌──────────────────────────────────────────────────┐
│  BREADCRUMB: Loja > Miniaturas > Nome do Produto  │
└──────────────────────────────────────────────────┘

┌─────────────────────┬────────────────────────────┐
│  GALERIA DE IMAGENS │  INFORMAÇÕES DO PRODUTO     │
│                     │                             │
│  [Imagem Principal] │  Nome do Produto            │
│                     │  ~~R$21,99~~ R$19,99        │
│  [img][img][img]    │  ★★★★★ (sem avaliação ainda)│
│  Thumbnails         │                             │
│                     │  Descrição curta            │
│                     │                             │
│                     │  Quantidade: [─ 1 +]        │
│                     │                             │
│                     │  [ADICIONAR AO CARRINHO]    │
│                     │                             │
│                     │  Envio: até 15 dias úteis   │
│                     │  ✓ Produção sob demanda     │
│                     │  ✓ Sistema OpenLOCK         │
│                     │  ✓ Escala 28mm              │
└─────────────────────┴────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  TABS: Descrição | Especificações | Avaliações    │
│                                                   │
│  DESCRIÇÃO (ativa por padrão)                     │
│  Texto completo do produto                        │
│                                                   │
│  ESPECIFICAÇÕES                                   │
│  Escala: 28mm / 32mm                             │
│  Material: PLA premium / Resina                  │
│  Tamanho: aprox. Xmm                            │
│  Sistema: OpenLOCK                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  PRODUTOS RELACIONADOS                            │
│  [Card] [Card] [Card] [Card]                     │
│  Mesma categoria · scroll horizontal mobile      │
└──────────────────────────────────────────────────┘
```

### Galeria de imagens

```tsx
// components/shop/ProductGallery.tsx
// - Imagem principal grande com zoom no hover
// - Thumbnails clicáveis abaixo
// - Mobile: swipe entre imagens
// - Botão de fullscreen/lightbox
```

### Schema JSON-LD (SEO)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nome do Produto",
  "image": ["url1", "url2"],
  "description": "...",
  "offers": {
    "@type": "Offer",
    "price": "19.99",
    "priceCurrency": "BRL",
    "availability": "https://schema.org/InStock"
  }
}
```

---

## 5. CARRINHO — `/loja/carrinho`

### Layout

```
┌──────────────────────────────────────────────────┐
│  MEU CARRINHO (3 itens)                          │
└──────────────────────────────────────────────────┘

┌─────────────────────────────┬────────────────────┐
│  ITENS                      │  RESUMO            │
│                             │                    │
│  [img] Nome produto         │  Subtotal: R$59,97 │
│        R$19,99 × [─ 1 +] ✕ │  Frete: calcular   │
│                             │  [CEP: _______]    │
│  [img] Nome produto         │                    │
│        R$19,99 × [─ 2 +] ✕ │  Total: R$59,97    │
│                             │                    │
│  [img] Nome produto         │  [FINALIZAR       ]│
│        R$19,99 × [─ 1 +] ✕ │  [COMPRA          ]│
│                             │                    │
│  ← Continuar comprando      │  ────────────────  │
│                             │  Formas de pag:    │
│                             │  💳 Cartão         │
│                             │  🔷 Pix            │
└─────────────────────────────┴────────────────────┘
```

### Estado do carrinho (Zustand)

```ts
// store/cartStore.ts
interface CartStore {
  items: CartItem[]
  addItem: (product: Product, qty: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  total: () => number
  count: () => number
}

// Persistência: localStorage + sync com cart_items no Supabase
// quando usuário está logado
```

### Cálculo de frete

```ts
// Integração com Melhor Envio API ou cálculo fixo por CEP
// Fase 1: frete fixo por região
// Fase 2: integração Melhor Envio
```

---

## 6. CHECKOUT — `/loja/checkout`

### Fluxo em 3 etapas

```
ETAPA 1 — DADOS          ETAPA 2 — ENTREGA       ETAPA 3 — PAGAMENTO
─────────────────────    ─────────────────────    ─────────────────────
Nome completo            Endereço de entrega      Cartão de crédito
E-mail                   CEP                      Dados do cartão
Telefone                 Número/complemento       OU
                         Opção de frete           PIX (QR code)

                         [CONTINUAR →]            [FINALIZAR COMPRA]
```

### Layout

```
┌──────────────────────────────────────────────────┐
│  ● Dados  ──  ○ Entrega  ──  ○ Pagamento         │
│  (barra de progresso)                            │
└──────────────────────────────────────────────────┘

┌─────────────────────────────┬────────────────────┐
│  FORMULÁRIO DA ETAPA ATUAL  │  RESUMO DO PEDIDO  │
│                             │                    │
│  [campos]                   │  Produto ×1 R$19,99│
│                             │  Produto ×2 R$39,98│
│                             │  ──────────────    │
│                             │  Subtotal  R$59,97 │
│                             │  Frete     R$15,00 │
│                             │  ──────────────    │
│                             │  TOTAL     R$74,97 │
│  [CONTINUAR →]              │                    │
└─────────────────────────────┴────────────────────┘
```

### Integração de pagamento

```ts
// Mesmo gateway da assinatura (Asaas recomendado)
// Criar um novo charge para compra avulsa
// Webhook: confirmar pagamento → mudar status do pedido → 
//          disparar e-mail de confirmação
```

---

## 7. ACESSO E AUTENTICAÇÃO

### Checkout

O checkout em `/loja/checkout` exige usuário logado. Visitantes são redirecionados para `/auth?next=/loja/checkout`.

### Kit do mês

Produtos `monthly-kit` só aparecem para assinantes ativos. Visitantes veem CTA para `/#planos`.

### Redirecionamentos legados

`/dashboard/loja/*` redireciona para as rotas equivalentes em `/loja`.

---

## 7 (legado). RESTRIÇÃO ADMIN (FASE 1) — substituído

> Removido na v1.1. A loja é pública; o controle de acesso é por produto (kit do mês = assinantes) e por login no checkout.

```ts
// middleware.ts — NÃO aplicar bloqueio admin em /loja
// A loja é pública; assinatura continua sendo o produto principal na LP
```

---

## 8. PAINEL ADMIN DA LOJA

### Rotas admin

```
/admin/loja/produtos          → Listar todos os produtos
/admin/loja/produtos/novo     → Criar produto
/admin/loja/produtos/[id]     → Editar produto
/admin/loja/categorias        → Gerenciar categorias
/admin/loja/pedidos           → Ver pedidos avulsos
/admin/loja/banners           → Gerenciar banners do slider
```

### Formulário de produto

```
Campos obrigatórios:
□ Nome
□ Slug (auto-gerado do nome, editável)
□ Categoria
□ Preço (R$)
□ Preço comparativo / "De" (opcional)
□ Imagens (upload múltiplo, drag-and-drop para ordenar)
□ Descrição curta (para card)
□ Descrição completa (rich text)
□ Especificações (escala, material, tamanho, sistema)
□ Tags

Opções:
□ Produto ativo (visível)
□ Produto em destaque (aparece na home)
□ Estoque
```

---

## 9. CRONOGRAMA DE DESENVOLVIMENTO

### Fase 1 — Estrutura base (Semana 1–2)

```
✅ Tabelas store_products + store_categories + store_banners
✅ Componente ProductCard (StoreProductCard)
✅ Página /loja (home) com grid e hero slider
✅ Página /loja/[categoria] com listagem, ordenação e paginação
✅ Layout próprio da loja (ShopShell)
```

### Fase 2 — Produto e carrinho (Semana 3–4)

```
✅ Página /loja/produto/[slug] com galeria, tabs e relacionados
✅ Galeria de imagens com thumbnails e lightbox
✅ Carrinho (localStorage) + CartDrawer lateral
✅ Página /loja/carrinho
✅ Cálculo de frete fixo por região (envio avulso)
```

### Fase 3 — Checkout e admin (Semana 5–6)

```
✅ Página /loja/checkout com stepper em 3 etapas
✅ Integração gateway de pagamento (Asaas)
✅ Webhook de confirmação de pedido
✅ E-mail transacional de pedido confirmado
✅ Painel admin: CRUD de produtos
✅ Painel admin: upload de imagens (Supabase Storage)
✅ Painel admin: banners do slider (/admin/loja/banners)
```

### Fase 4 — Polimento e liberação (Semana 7–8)

```
✅ SEO: meta tags, JSON-LD e sitemap dinâmico da loja
□ Performance: lazy loading imagens, prefetch
□ Mobile: review completo em 375px
□ Testes de checkout end-to-end
✅ Loja pública em /loja
✅ Analytics: view_item, add_to_cart, begin_checkout na loja
```

---

## 10. O QUE A PARVUS FAZ BEM — ADAPTAR PARA DUNGEONBOX

| O que a Parvus tem | Como adaptar para DungeonBox |
|---|---|
| Fundo escuro com produtos em destaque | Manter — já é a identidade DB |
| Cupom de desconto no topo | Barra com "Use FUNDADOR10 e ganhe 10% off" |
| Filtros por tipo de miniatura | Filtros: Plano · Material · Sistema · Preço |
| Badge OFERTA em vermelho | Badge OFERTA em laranja (#F97316) |
| "Combo Crítico" = produtos em conjunto | "Combo da Guilda" = kit + scatter |
| Parceiros (D&D, Witcher) | Compatibilidade: D&D · Tormenta · Pathfinder |
| Newsletter no rodapé | Newsletter → redireciona para grupo WhatsApp |

---

## 11. DIFERENCIAL VISUAL DUNGEONBOX vs PARVUS

A Parvus é boa mas genérica. A DungeonBox tem identidade própria:

```
Parvus:      verde neón (#00FF00) · foto de miniatura pintada
DungeonBox:  laranja (#F97316) · foto com dungeon montada + miniatura

Parvus:      produtos individuais isolados
DungeonBox:  produtos mostrados em uso (dungeon montada, mesa de jogo)

Parvus:      grid padrão e-commerce
DungeonBox:  grid com background escuro texturizado (o prompt que geramos)
```

---

## 12. COMPONENTES REUTILIZÁVEIS A CRIAR

```
components/shop/          → Layout e seções da loja (ShopShell, ShopHero, etc.)
components/store/         → Carrinho, cards, checkout (compartilhados)
lib/store/routes.ts       → Rotas centralizadas (/loja/*)
```

---

*DungeonBox · Plano de Ação Módulo Loja v1.1 · Julho 2026*
