# DungeonBox — Plano de Implementação
## Landing Page de Assinatura · Next.js + Tailwind CSS

---

## 1. Visão Geral

**Objetivo:** Landing page de alta conversão para a assinatura mensal DungeonBox, com foco em visual épico, pouco texto e imagens grandes que vendem por si mesmas.

**Princípios de design:**
- Imagem > texto em todas as seções de plano
- Uma CTA clara por seção — sem distração
- Cada plano tem sua própria "personalidade" visual
- Scroll contínuo com paralax cria sensação de imersão

**Stack:**
- Next.js 14 (App Router)
- Tailwind CSS 3
- Framer Motion (animações e paralax)
- Lucide React (ícones)
- Fontes: Bebas Neue (display) + DM Sans (corpo)

---

## 2. Estrutura de Arquivos

```
dungeonbox/
├── app/
│   ├── layout.tsx              # Fonte, metadata, globals
│   ├── page.tsx                # Página principal (monta as sections)
│   └── globals.css             # Tailwind base + variáveis CSS
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Sticky nav com logo + CTA
│   │   └── Footer.tsx          # Rodapé simples
│   │
│   ├── sections/
│   │   ├── Hero.tsx            # Section 1 — fullscreen hero
│   │   ├── Marquee.tsx         # Section 2 — faixa animada
│   │   ├── PlanAventureiro.tsx # Section 3 — Plano Aventureiro
│   │   ├── PlanHeroi.tsx       # Section 4 — Plano Herói
│   │   ├── PlanLendario.tsx    # Section 5 — Plano Lendário
│   │   ├── Fidelidade.tsx      # Section 6 — Sistema de níveis
│   │   ├── Temas.tsx           # Section 7 — Calendário de temas
│   │   └── FAQ.tsx             # Section 8 — Perguntas frequentes
│   │
│   └── ui/
│       ├── AnimatedSection.tsx # Wrapper com fade-up on scroll
│       ├── ParallaxImage.tsx   # Imagem com efeito paralax
│       ├── PlanBadge.tsx       # Badge de plano (Aventureiro etc)
│       ├── GlowOrb.tsx         # Elemento decorativo de luz
│       └── CTAButton.tsx       # Botão CTA reutilizável
│
├── lib/
│   └── data.ts                 # Conteúdo dos planos, FAQ, temas
│
├── public/
│   └── images/
│       ├── hero-box.png        # Caixa hero (gerada por IA)
│       ├── plan-aventureiro.png
│       ├── plan-heroi.png
│       ├── plan-lendario.png
│       └── themes/             # Imagens dos temas mensais
│
├── tailwind.config.js
├── next.config.js
└── package.json
```

---

## 3. Seções da Página — Detalhamento

### SECTION 1 — Hero (fullscreen)

```
┌─────────────────────────────────────────────────┐
│  [NAVBAR]  DungeonBox              [Assinar]     │
├─────────────────────────────────────────────────┤
│                                                 │
│   DUNGEON                  ┌──────────────────┐ │
│   BOX           ←paralax→  │  [IMAGEM DA      │ │
│                             │   CAIXA ABERTA] │ │
│   Todo mês uma              │                  │ │
│   dungeon nova              └──────────────────┘ │
│   na sua porta.                                 │
│                                                 │
│   [Assinar agora]  [Ver planos ↓]               │
│                                                 │
│   ░░░░ scroll indicator ░░░░                    │
└─────────────────────────────────────────────────┘
```

**Componentes:**
- Fundo: `bg-stone-950` com grid CSS + glow radial no topo
- Título: Bebas Neue, clamp 80px–160px, split em duas linhas
- Imagem: `ParallaxImage` com movimento de -20px a +20px no scroll
- Entrada: `motion.div` com staggered fade-up (0, 0.1, 0.2, 0.3s delay)
- Badge animado: "⬡ Assinatura Mensal · Cenários 3D"

**Animações:**
```tsx
// Stagger de entrada
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
}
const item = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } }
}
```

---

### SECTION 2 — Marquee (faixa animada)

```
┌─────────────────────────────────────────────────┐
│ ⬡ CENÁRIOS 3D  ·  ⬡ SISTEMA MODULAR  ·          │
│   ⬡ TODO MÊS  ·  ⬡ COMPATÍVEL  ·  ⬡ CENÁRIOS 3D│
└─────────────────────────────────────────────────┘
```

- Loop infinito CSS com `animation: marquee 30s linear infinite`
- Cor de fundo: `bg-ember` (laranja) — contraste visual forte
- Texto branco, Bebas Neue, uppercase, letter-spacing largo

---

### SECTION 3 — Plano Aventureiro

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌────────────────────┐    AVENTUREIRO          │
│  │                    │    R$ 89/mês            │
│  │  [IMAGEM GRANDE]   │                         │
│  │  caixa aberta com  │    ✓ 10–12 peças        │
│  │  kit starter       │    ✓ Compatível          │
│  │                    │    ✓ Bilhete do mestre   │
│  └────────────────────┘    ✓ 1 cor à escolha    │
│                                                 │
│                        [Assinar Aventureiro →]  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Layout:** imagem esquerda 60% / conteúdo direita 40%  
**Cor de accent:** cinza prata `#a0aabb`  
**Fundo:** `bg-stone-950` com glow sutil  
**Entrada:** imagem desliza da esquerda, texto da direita (usando `useInView`)

---

### SECTION 4 — Plano Herói _(layout espelhado)_

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   HERÓI                  ┌────────────────────┐ │
│   R$ 139/mês             │                    │ │
│                           │  [IMAGEM GRANDE]   │ │
│   ★ MAIS POPULAR          │  caixa + dungeon   │ │
│                           │  montada ao lado   │ │
│   ✓ 18–22 peças           │                    │ │
│   ✓ 3 props exclusivos    └────────────────────┘ │
│   ✓ Frete incluso Sul/SE                        │
│   ✓ Grupo VIP                                   │
│                                                 │
│   [Assinar Herói →]                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Layout:** conteúdo esquerda 40% / imagem direita 60% _(espelhado)_  
**Cor de accent:** laranja `#ff6b2b`  
**Fundo:** transição sutil para `bg-stone-900`  
**Diferencial visual:** badge "MAIS POPULAR" pulsando  
**Efeito extra:** borda laranja animada no card de preço

---

### SECTION 5 — Plano Lendário

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌────────────────────┐    LENDÁRIO             │
│  │                    │    R$ 199/mês           │
│  │  [IMAGEM ÉPICA]    │                         │
│  │  flat lay premium  │    ✓ 28–35 peças        │
│  │  editorial style   │    ✓ Peça surpresa      │
│  │  caixa + todos     │    ✓ Frete grátis Brasil │
│  │  os itens expostos │    ✓ Voto no tema       │
│  └────────────────────┘    ✓ 10% off na loja   │
│                                                 │
│                        [Assinar Lendário →]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Layout:** imagem esquerda 60% / conteúdo direita 40%  
**Cor de accent:** ciano `#00d4ff`  
**Fundo:** `bg-stone-950` com glow ciano no topo da section  
**Efeito especial:** partículas flutuantes CSS sobre a imagem (pseudo-elements)  
**Atmosfera:** a mais "épica" das três — iluminação escura na imagem

---

### SECTION 6 — Sistema de Fidelidade

```
┌─────────────────────────────────────────────────┐
│            QUANTO MAIS TEMPO,                   │
│            MAIS RECOMPENSAS                     │
│                                                 │
│   ──●────────●────────●────────●────────●──     │
│    🗡️         ⚔️        🏹        🛡️        👑    │
│  RECRUTA  AVENTUREIRO VETERANO CAMPEÃO LENDÁRIO │
│   Mês 1    Mês 3      Mês 6    Mês 10  1 Ano   │
│                                                 │
│   [Hover em cada nível mostra os bônus]         │
└─────────────────────────────────────────────────┘
```

**Interação:** hover em cada nível expande card com perks  
**Animação:** linha de progresso cresce da esquerda ao entrar na viewport  
**Mobile:** empilhado verticalmente com linha vertical

---

### SECTION 7 — Temas Mensais

```
┌─────────────────────────────────────────────────┐
│         12 MESES · 12 AVENTURAS                 │
│                                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │ 01 │ │ 02 │ │ 03 │ │ 04 │ │ 05 │ │ 06 │    │
│  │🏚️  │ │💀  │ │🍺  │ │🕯️  │ │🏕️  │ │🏪  │    │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │ 07 │ │ 08 │ │ 09 │ │ 10 │ │ 11 │ │ 12 │    │
│  │🧪  │ │⛓️  │ │🌊  │ │🏯  │ │🌲  │ │🐉  │    │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘    │
│                                                 │
│  [hover → mostra nome + conteúdo do kit]        │
└─────────────────────────────────────────────────┘
```

---

### SECTION 8 — FAQ

- Accordion animado com Framer Motion `AnimatePresence`
- 6 perguntas principais (objeções de compra)
- Fundo mais claro `bg-stone-900` para variar ritmo visual

---

## 4. Componentes Técnicos

### `AnimatedSection.tsx`
Wrapper que usa `useInView` do Framer Motion para disparar animação quando a section entra na viewport.

```tsx
'use client'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
  delay?: number
}

export default function AnimatedSection({ children, className, delay = 0 }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

---

### `ParallaxImage.tsx`
Imagem com movimento no scroll usando `useScroll` + `useTransform`.

```tsx
'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'

interface Props {
  src: string
  alt: string
  className?: string
  speed?: number // 0.1 = sutil, 0.3 = intenso
}

export default function ParallaxImage({ src, alt, className, speed = 0.15 }: Props) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  })
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * -100}px`, `${speed * 100}px`])

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="w-full h-full scale-110">
        <Image src={src} alt={alt} fill className="object-cover" />
      </motion.div>
    </div>
  )
}
```

---

### `CTAButton.tsx`
Botão reutilizável com variantes por plano.

```tsx
interface Props {
  label: string
  variant?: 'ember' | 'frost' | 'gold' | 'default'
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

const variants = {
  ember:   'bg-ember hover:bg-ember-bright text-stone-950',
  frost:   'border border-frost text-frost hover:bg-frost/10',
  gold:    'bg-gold hover:bg-gold-bright text-stone-950',
  default: 'border border-white/20 text-white hover:bg-white/10',
}
```

---

### `GlowOrb.tsx`
Elemento decorativo de luz ambiente — posicionado absolutamente nas sections.

```tsx
interface Props {
  color: 'ember' | 'frost' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  position?: string // Tailwind classes: 'top-0 left-1/2'
}
```

---

## 5. Data Layer — `lib/data.ts`

Centraliza todo o conteúdo para fácil edição sem tocar nos componentes.

```ts
export const plans = [
  {
    id: 'aventureiro',
    name: 'Aventureiro',
    price: 89,
    accentColor: '#a0aabb',
    tailwindAccent: 'text-slate-400',
    image: '/images/plan-aventureiro.png',
    pieces: '10–12 peças',
    perks: [
      'Kit temático mensal',
      'Compatível com kits anteriores',
      'Bilhete do mestre',
      '1 cor à escolha',
    ],
    cta: 'Assinar Aventureiro',
    layout: 'image-left', // ou 'image-right'
  },
  {
    id: 'heroi',
    name: 'Herói',
    price: 139,
    badge: 'Mais Popular',
    accentColor: '#ff6b2b',
    tailwindAccent: 'text-ember',
    image: '/images/plan-heroi.png',
    pieces: '18–22 peças',
    perks: [
      'Kit temático completo',
      '3 props exclusivos',
      'Frete incluso Sul/Sudeste',
      'Grupo VIP de assinantes',
    ],
    cta: 'Assinar Herói',
    layout: 'image-right',
  },
  {
    id: 'lendario',
    name: 'Lendário',
    price: 199,
    accentColor: '#00d4ff',
    tailwindAccent: 'text-frost',
    image: '/images/plan-lendario.png',
    pieces: '28–35 peças',
    perks: [
      'Kit temático XL',
      'Peça surpresa exclusiva',
      'Frete grátis Brasil todo',
      'Voto no tema do mês',
      '10% off na loja',
    ],
    cta: 'Assinar Lendário',
    layout: 'image-left',
  },
]

export const faqItems = [
  {
    q: 'As peças do mês 3 encaixam com as do mês 1?',
    a: 'Sim! Todos os kits usam o mesmo padrão de encaixe. Você está construindo uma dungeon expansível — não colecionando objetos soltos.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem carência e sem multa. Cancele pelo painel e para de ser cobrado no próximo ciclo.',
  },
  {
    q: 'Qual o prazo de entrega?',
    a: 'Postamos entre os dias 18 e 22 de cada mês. Sul/Sudeste: 3–7 dias. Demais regiões: 7–14 dias úteis.',
  },
  {
    q: 'Para qual sistema de RPG as peças são compatíveis?',
    a: 'Escala padrão 25mm/28mm — compatível com D&D, Pathfinder, Tormenta RPG, Old Dragon e qualquer sistema com grid de 1 polegada.',
  },
  {
    q: 'Posso escolher a cor das peças?',
    a: 'Aventureiro: 1 cor. Herói: 2 cores. Lendário: cores ilimitadas + variante exclusiva.',
  },
  {
    q: 'Posso comprar kits anteriores?',
    a: 'Assinantes têm acesso à loja com desconto para adquirir edições anteriores enquanto houver estoque.',
  },
]

export const loyaltyLevels = [
  { level: 1, icon: '🗡️', name: 'Recruta',     months: 'Mês 1–2',  perks: ['Acesso ao grupo VIP', 'Bilhete do mestre'] },
  { level: 2, icon: '⚔️', name: 'Aventureiro', months: 'Mês 3–5',  perks: ['+1 prop bônus', '5% off loja', 'Preview de temas'] },
  { level: 3, icon: '🏹', name: 'Veterano',    months: 'Mês 6–9',  perks: ['+2 props bônus', '10% off loja', 'Voto no tema'] },
  { level: 4, icon: '🛡️', name: 'Campeão',     months: 'Mês 10–12',perks: ['Peça exclusiva', '15% off loja', 'Prioridade de produção'] },
  { level: 5, icon: '👑', name: 'Lendário',    months: '1 Ano',    perks: ['Boss exclusivo na 13ª box', '20% off permanente', 'Co-criação do tema'] },
]

export const themes = [
  { month: '01', emoji: '🏚️', name: 'A Entrada',         lore: 'O começo de tudo.' },
  { month: '02', emoji: '💀', name: 'Cripta',             lore: 'Os mortos não descansam.' },
  { month: '03', emoji: '🍺', name: 'Taverna',            lore: 'Negócios se fazem aqui.' },
  { month: '04', emoji: '🕯️', name: 'Santuário',         lore: 'A luz que não deveria existir.' },
  { month: '05', emoji: '🏕️', name: 'Acampamento',       lore: 'Descanso antes da batalha.' },
  { month: '06', emoji: '🏪', name: 'Mercado das Sombras',lore: 'Tudo tem um preço.' },
  { month: '07', emoji: '🧪', name: 'Laboratório',        lore: 'O arcanista estava aqui.' },
  { month: '08', emoji: '⛓️', name: 'Prisão',            lore: 'As celas estão abertas.' },
  { month: '09', emoji: '🌊', name: 'Esgotos',            lore: 'Outra cidade. Mais perigosa.' },
  { month: '10', emoji: '🏯', name: 'Câmara do Rei',      lore: 'O trono está vazio.' },
  { month: '11', emoji: '🌲', name: 'Floresta',           lore: 'As árvores têm dentes.' },
  { month: '12', emoji: '🐉', name: 'Covil do Dragão',    lore: 'Você chegou até aqui.' },
]
```

---

## 6. Implementação — Ordem de Desenvolvimento

### Fase 1 — Setup (Dia 1)
- [ ] `npx create-next-app@latest dungeonbox --typescript --tailwind --app`
- [ ] Instalar Framer Motion: `npm install framer-motion`
- [ ] Instalar Lucide: `npm install lucide-react`
- [ ] Configurar `tailwind.config.js` com tokens customizados
- [ ] Configurar fontes Google no `layout.tsx`
- [ ] Criar `globals.css` com variáveis e utilitários base
- [ ] Popular `lib/data.ts` com todo o conteúdo

### Fase 2 — Componentes Base (Dia 1–2)
- [ ] `AnimatedSection.tsx`
- [ ] `ParallaxImage.tsx`
- [ ] `CTAButton.tsx`
- [ ] `GlowOrb.tsx`
- [ ] `PlanBadge.tsx`
- [ ] `Navbar.tsx`
- [ ] `Footer.tsx`

### Fase 3 — Sections (Dia 2–4)
- [ ] `Hero.tsx` — paralax + stagger de entrada
- [ ] `Marquee.tsx` — faixa animada
- [ ] `PlanAventureiro.tsx` — layout image-left
- [ ] `PlanHeroi.tsx` — layout image-right + badge popular
- [ ] `PlanLendario.tsx` — layout image-left + efeito épico
- [ ] `Fidelidade.tsx` — linha de progresso animada
- [ ] `Temas.tsx` — grid com hover reveal
- [ ] `FAQ.tsx` — accordion Framer Motion

### Fase 4 — Imagens e Polimento (Dia 4–5)
- [ ] Gerar imagens com AI (usar prompts do arquivo de prompts)
- [ ] Otimizar com `next/image` (WebP, lazy loading)
- [ ] Testar animações em mobile
- [ ] Ajustar responsividade (breakpoints sm/md/lg)
- [ ] Testar performance (Lighthouse > 90)
- [ ] Revisar acessibilidade (`aria-label`, contraste, focus states)

---

## 7. Configuração de Fontes — `app/layout.tsx`

```tsx
import { Bebas_Neue, DM_Sans } from 'next/font/google'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="bg-stone-950 text-white font-body antialiased">
        {children}
      </body>
    </html>
  )
}
```

---

## 8. Globals CSS — Utilitários e Variáveis

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-ember: #ff6b2b;
    --color-frost:  #00d4ff;
    --color-gold:   #ffd600;
  }

  html { scroll-behavior: smooth; }

  /* Scrollbar customizada */
  ::-webkit-scrollbar       { width: 6px; }
  ::-webkit-scrollbar-track { background: #09090b; }
  ::-webkit-scrollbar-thumb { background: #3f3f4a; border-radius: 3px; }
}

@layer utilities {
  /* Grid de fundo */
  .bg-grid {
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  /* Texto com gradiente */
  .text-gradient-ember {
    background: linear-gradient(135deg, #ff6b2b, #ff9060);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .text-gradient-frost {
    background: linear-gradient(135deg, #00d4ff, #80eaff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Borda animada */
  .border-glow-ember { box-shadow: 0 0 30px rgba(255,107,43,0.3); }
  .border-glow-frost { box-shadow: 0 0 30px rgba(0,212,255,0.3); }

  /* Noise texture overlay */
  .noise::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,...");
    opacity: 0.03;
    pointer-events: none;
  }
}
```

---

## 9. SEO e Metadata — `app/layout.tsx`

```tsx
export const metadata = {
  title: 'DungeonBox — Cenários RPG 3D na sua porta todo mês',
  description: 'Assinatura mensal de cenários 3D modulares para RPG e boardgame. Cada caixa expande sua dungeon. Compatível com D&D, Pathfinder, Tormenta e mais.',
  keywords: 'dungeon tiles, RPG, cenários 3D, assinatura, boardgame, impressão 3D, D&D',
  openGraph: {
    title: 'DungeonBox — Sua dungeon cresce todo mês',
    description: 'Cenários 3D modulares impressos e entregues mensalmente.',
    images: ['/images/og-image.jpg'],
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

---

## 10. Deploy — Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Na raiz do projeto
vercel

# 3. Variáveis de ambiente (se usar formulário ou analytics)
vercel env add NEXT_PUBLIC_GA_ID
vercel env add NEXT_PUBLIC_HOTMART_URL

# 4. Deploy de produção
vercel --prod
```

**Domínio:** apontar `dungeonbox.com.br` para a Vercel nas configurações de DNS.

---

## 11. Checklist Final Antes do Lançamento

### Performance
- [ ] Lighthouse Score > 90 em todas as métricas
- [ ] Imagens em WebP com `next/image`
- [ ] Framer Motion com `lazy` import para reduzir bundle
- [ ] Fontes com `display: swap`

### Visual
- [ ] Testar paralax em iOS (Safari tem comportamento diferente)
- [ ] Checar animações com `prefers-reduced-motion`
- [ ] Validar em telas 375px (iPhone SE) até 1920px
- [ ] Dark mode já é o padrão — confirmar que não quebra em forced colors

### Conversão
- [ ] CTA visível sem scroll no Hero (above the fold)
- [ ] Preços claramente visíveis em cada section de plano
- [ ] FAQ responde as 6 objeções principais
- [ ] Link de cancelamento fácil visível (aumenta conversão)

### Acessibilidade
- [ ] `alt` text em todas as imagens
- [ ] Contraste mínimo 4.5:1 em todos os textos
- [ ] Navegação por teclado funcional
- [ ] `aria-expanded` nos accordions do FAQ

---

## 12. Estimativa de Tempo

| Fase                        | Horas |
|-----------------------------|-------|
| Setup + configuração        | 2h    |
| Componentes base (7 itens)  | 4h    |
| Sections (8 sections)       | 10h   |
| Imagens + assets            | 3h    |
| Responsividade + polimento  | 4h    |
| Testes + ajustes            | 2h    |
| **Total estimado**          | **~25h** |

> Com dedicação integral: **3–4 dias**.  
> Trabalhando algumas horas por dia: **7–10 dias**.

---

_DungeonBox · Plano de Implementação v1.0_
