# DungeonBox — Design System "Mesa" (home-v2)

Guia para aplicar o layout da nova home (`/home-v2`) em outras áreas do site. Tudo aqui descreve o que **já existe** no código; quando algo precisar ser criado para reutilização, está marcado como **[a extrair]**.

- CSS base: `app/home-v2/home-v2.css`
- Fontes e wrapper: `app/home-v2/layout.tsx`
- Tokens Tailwind: `tailwind.config.js` → `colors.mesa`, `fontFamily.homeDisplay` / `homeBody`
- Componentes: `components/home-v2/*`
- Copy centralizada: `lib/home-v2/content.ts`

---

## 1. Direção

**Tema: "névoa de guerra sobre a mesa de jogo".** Fundo escuro de mesa, grade de battle map 28 mm como textura recorrente, laranja-brasa como único acento de ação, e conteúdo que "se revela" conforme a pessoa explora.

Princípios:

1. **Foto é o produto.** Kits montados vendem; a UI existe para emoldurar fotos, não para competir com elas.
2. **Um acento só.** Laranja (`ember`) = ação/compra. Jade = rótulo/informação. Nunca inverter.
3. **Mobile primeiro.** É o maior tráfego. Toda decisão começa em 360–390 px.
4. **Movimento com propósito.** Uma entrada forte por seção, nada de micro-animação em loop.
5. **Sem template.** Seções assimétricas, texturas (grade, grão), tipografia condensada em caixa alta.

---

## 2. Tokens

### Cores

| Token Tailwind | Var CSS | Hex | Uso |
|---|---|---|---|
| `mesa-ink` | `--ink` | `#0A0B0D` | Fundo principal, texto sobre botões laranja |
| `mesa-stone` | `--stone` | `#17191C` | Fundo alternado de seção, cards, placeholders de imagem |
| `mesa-parchment` | `--parchment` | `#F3EFE7` | Títulos e texto principal |
| `mesa-ash` | `--ash` | `#B8B8B2` | Texto de apoio, descrições, legendas |
| `mesa-ember` | `--ember` | `#FF642D` | CTA, badge "Mais comprado", foco, estado ativo |
| `mesa-jade` | `--jade` | `#9DE3D6` | Eyebrows, ícones de check, trilha da jornada |
| `gold` | — | `#FFD600` | **Somente** estrelas de avaliação |

Superfícies translúcidas (sobre `ink`/`stone`):

- Borda padrão: `border-white/10` → hover `border-white/25`
- Superfície sutil: `bg-white/[0.04]` → hover `bg-white/[0.09]`
- Card sobre fundo: `bg-mesa-stone` ou `bg-mesa-stone/70`
- Glow de fundo: `bg-mesa-ember/[0.07–0.12] blur-[120px] rounded-full` (um por seção, no máximo)

Regras:

- Alternar `bg-mesa-ink` e `bg-mesa-stone` entre seções para marcar ritmo.
- Texto corrido nunca abaixo de `text-mesa-ash` (contraste ≥ 4.5:1 em `ink` e `stone`).
- Laranja nunca em texto corrido; só em CTA, badge, número/índice ativo e foco.

### Tipografia

| Papel | Fonte | Classe |
|---|---|---|
| Display (títulos, botões, eyebrows, badges) | Barlow Condensed 500/600/700 | `home-v2-display` (uppercase, 700, `tracking 0.02em`) |
| Corpo | Manrope 400–700 | `font-homeBody` (herdado do wrapper `.home-v2`) |

Escala usada:

| Elemento | Classes |
|---|---|
| H1 (hero) | `home-v2-display text-[clamp(2.7rem,10vw,6rem)] leading-[0.88]` |
| H2 (seção) | `home-v2-display text-[clamp(2rem,7vw,4.25rem)] leading-[0.92] tracking-wide text-balance` |
| H3 (card) | `home-v2-display text-2xl leading-none` |
| Eyebrow | `home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade` |
| Label/badge | `home-v2-display text-[11px] tracking-[0.1em–0.18em]` |
| Corpo | `text-base leading-relaxed text-mesa-ash text-pretty` |
| Apoio/legenda | `text-sm text-mesa-ash` |

Regras:

- **Mínimo 11 px** para qualquer texto (10 px só no badge interno de preview admin).
- Não alterar a escala de H1/H2 por seção; a consistência dos títulos é parte da identidade.
- Botões usam fonte display com `tracking-[0.1em]`, tamanho maior que o corpo.

### Espaçamento e layout

- Container: `mx-auto max-w-6xl`
- Padding lateral da seção: `px-4 sm:px-6`
- Padding vertical da seção: `py-20 md:py-28` (faixas de evidência `py-16 md:py-24`, CTA final `py-24 md:py-32`)
- Cabeçalho de seção: `max-w-3xl`; texto de apoio `max-w-xl`
- Grid assimétrico preferido: `md:grid-cols-[1.15fr_0.85fr]`, `md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`
- Âncoras: `html:has(.home-v2)` já tem `scroll-padding-top: 5rem` para o header fixo

### Raios

| Elemento | Raio |
|---|---|
| Botões, links do header/footer | `rounded-sm` (quase reto, "peça de mesa") |
| Cards de conteúdo (avaliação, stats) | `rounded-2xl` |
| Cards de destaque (planos, jornada) | `rounded-3xl` |
| Pills, badges, dots, avatares | `rounded-full` |

### Camadas (z-index)

| Camada | z |
|---|---|
| Decoração de fundo | `-z-10` / `z-0` |
| Conteúdo sobre mídia | `z-10` / `z-20` |
| Header fixo, CTA sticky mobile | `z-50` |
| Badge de preview admin | `z-[60]` |
| Dialogs/viewers, skip link | `z-[80]` |

---

## 3. Texturas (a "assinatura" visual)

Todas em `home-v2.css`, escopadas em `.home-v2`.

| Classe | O que faz | Onde usar |
|---|---|---|
| `home-v2-grid` | Grade 28 px (battle map) com máscara radial | Fundo de seções-chave (hero, evidências, jornada, CTA final, footer) |
| `home-v2-fog` | Faz a grade "se desenhar" ao entrar na tela | Junto com `home-v2-grid` |
| `home-v2-fog-load` | Mesma revelação, mas no carregamento | Só no hero / primeira dobra |
| `home-v2-grain` | Grão de ruído via `::after` (requer `relative`) | Seções de fechamento e hero |
| `home-v2-hairline` | Divisor horizontal com fade nas pontas | Separar blocos dentro de uma seção |
| `home-v2-wordmark` | Texto só em contorno com fade | Marca gigante decorativa (footer) |

Padrão de fundo decorado:

```tsx
<section className="relative isolate overflow-hidden bg-mesa-ink px-4 py-20 sm:px-6 md:py-28">
  <div className="home-v2-grid home-v2-fog absolute inset-0 -z-10" aria-hidden="true" />
  <div className="mx-auto max-w-6xl">…</div>
</section>
```

Máximo **uma** textura dominante por seção (grade **ou** imagem de fundo **ou** glow).

---

## 4. Componentes

### Prontos para reutilizar

| Componente | Função | Notas |
|---|---|---|
| `HomeV2Button` | CTA (`Link`) | `variant`: `primary` (laranja + sheen), `secondary` (pergaminho), `ghost`, `outline`. `size`: `sm` 44 px, `md` 48 px, `lg` 56 px. `arrow` adiciona seta animada. |
| `HomeV2SectionHeading` | Eyebrow + H2 + apoio | Já vem com animações de revelação. `align="center"` para seções de fechamento. `titleId` obrigatório (usar em `aria-labelledby` da `<section>`). |
| `HomeV2MediaFrame` | Imagem com proporção fixa + zoom no hover | Aceita URL remota (via `StoreMediaImage`) ou local. Sempre passar `sizes`. |
| `HomeV2Stars` | Nota 0–5 com frações | `role="img"` com label em pt-BR; preenche em cascata. |
| `HomeV2PhotoViewer` | Galeria fullscreen | Swipe, setas, teclado, miniaturas, CTA opcional no rodapé. |
| `HomeV2PlanGallery` | Carrossel de fotos dentro de card | Pill "Ver fotos i/n", barras de progresso. |
| `useHomeV2Dialog` | Hook de dialog acessível | Trava scroll, foco inicial, trap de Tab, Esc fecha, devolve foco. |
| `HomeV2Motion` | Controlador de animações de scroll | Renderizar **uma vez** por página. |
| `HomeV2StickyMobileCta` | Barra de CTA fixa no mobile | Some sobre seções listadas em `SUPPRESSING_SECTIONS`. |

### Padrões de markup

**Seção**

```tsx
<section id="slug" aria-labelledby="pagina-slug-title"
  className="bg-mesa-ink px-4 py-20 sm:px-6 md:py-28">
  <div className="mx-auto max-w-6xl">
    <HomeV2SectionHeading eyebrow="…" title="…" titleId="pagina-slug-title" support="…" />
    …
  </div>
</section>
```

**Card**

```tsx
<article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone
  transition-[border-color,box-shadow] duration-200 hover:border-white/25
  hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)]">
```

Card em destaque (ex.: plano mais comprado): `border-mesa-ember/60 shadow-[0_30px_80px_-30px_rgba(255,100,45,0.45)]`.

**Badge de destaque**

```tsx
<span className="home-v2-display rounded-full bg-mesa-ember px-3 py-1.5 text-[11px] tracking-[0.16em] text-mesa-ink">
  Mais comprado
</span>
```

**Carrossel horizontal (mobile) → grid (desktop)**

```tsx
<ul className="home-v2-snap -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
  <li className="home-v2-reveal flex w-[82%] shrink-0 sm:w-auto" style={{ '--stagger': i }}>…</li>
</ul>
```

O card seguinte deve "espiar" na borda (`w-[82%]`) para indicar que dá para deslizar.

**Seletor segmentado (mobile)**: botões `aria-pressed` com indicador deslizante (`translateX` + `transition-transform duration-300`). Referência: `HomeV2PlanSelector`.

**Dialog**: bottom sheet no mobile, modal centralizado no desktop. Classes `home-v2-overlay` + `home-v2-sheet`. Referência: `HomeV2PlanDetails`.

---

## 5. Movimento

Sistema "névoa de guerra": o conteúdo se revela ao entrar na tela.

### Como funciona

1. `HomeV2Motion` adiciona `.home-v2-motion` ao wrapper e observa `.home-v2-reveal` e `.home-v2-fog`.
2. O que já está visível no carregamento recebe `data-inview="static"` (sem animação, sem prejudicar LCP).
3. O resto recebe `data-inview="play"` ao entrar na tela.
4. Itens dentro de um carrossel `.home-v2-snap` rolável animam juntos quando o carrossel aparece.
5. Sem JS ou com `prefers-reduced-motion: reduce`, nada fica escondido.

### Classes e atributos

| Uso | Markup | Efeito |
|---|---|---|
| Entrada padrão | `className="home-v2-reveal"` | Sobe 28 px + fade, 800 ms |
| Cascata | `style={{ '--stagger': index }}` | +90 ms por item, teto de 450 ms |
| Título com máscara | `data-reveal="mask"` + `home-v2-reveal` | Texto emerge de baixo, 950 ms |
| Grade revelada | `home-v2-grid home-v2-fog` | Grade se desenha do centro, 1600 ms |
| Estrelas | automático em `HomeV2Stars` dentro de um `.home-v2-reveal` | Preenchem uma a uma |
| Brilho no CTA | automático no `HomeV2Button` primary | Varre o botão no hover |
| Brilho único | `className="home-v2-sheen-once"` no CTA | Uma passada 1,4 s após carregar (só o CTA principal da página) |
| Entrada do hero | `home-v2-enter` + `--enter-step` | Sequência orquestrada no load |
| Trilha ligada ao scroll | `home-v2-rail` | Linha cresce com a rolagem (só onde há suporte) |
| Parallax de fundo | `home-v2-journey-bg` | Deriva leve da imagem de fundo |
| Troca de conteúdo | `home-v2-swap` + `key` | Fade de 240 ms |

### Regras

- Duração de micro-interação: 150–300 ms. Entradas: 700–950 ms com `--ease-out-expo`.
- Animar só `transform`, `opacity`, `clip-path`, `mask`. Nunca `width/height/top`.
- Hover não pode deslocar layout: usar cor, borda, sombra ou `scale` ≤ 1.04 em mídia.
- Um `home-v2-sheen-once` por página.
- Não animar texto corrido parágrafo a parágrafo; animar o bloco.

---

## 6. Imagens

- Sempre `next/image` (ou `HomeV2MediaFrame`) com `sizes` real — o projeto serve AVIF/WebP.
- Proporções: cards `aspect-[16/10]` no mobile, `aspect-[4/5]` ou `[5/4]` em destaque.
- Placeholder: fundo `bg-mesa-stone` (+ grade quando for área grande).
- Imagem de fundo de seção: converter para WebP ~2000 px (< 400 KB), aplicar `object-cover` com `object-position` separado para mobile/desktop, opacidade 35–50%, gradiente para `ink` nas bordas e `home-v2-fog` por cima. Referência: `HomeV2GrowthJourney`.
- Alt descritivo em pt-BR ("Kit Herói montado na mesa — foto 2 de 4").
- Viewer fullscreen: `sizes` com teto em 1200 px e preview da miniatura por baixo para não piscar.

---

## 7. Acessibilidade e mobile (checklist obrigatório)

- [ ] Toque mínimo 44×44 px (`min-h-11`); CTAs `min-h-12`/`min-h-14`
- [ ] Foco visível: já global (`outline 2px ember`, offset 3 px)
- [ ] Toda `<section>` com `aria-labelledby` apontando para o H2
- [ ] Botões só com ícone têm `aria-label`
- [ ] Dialogs com `useHomeV2Dialog` (Esc, trap de foco, retorno de foco)
- [ ] Sem scroll horizontal em 360 px
- [ ] Conteúdo não escondido atrás do header fixo nem do CTA sticky
- [ ] `prefers-reduced-motion` testado (tudo visível, nada anima)
- [ ] Testar em 360, 390, 768, 1024 e 1440 px

---

## 8. Como aplicar em outra área

### Hoje (sem refatorar)

O CSS e as fontes vivem no layout de `/home-v2`, que também exige admin. Para uma nova rota:

1. Criar o layout da rota replicando `app/home-v2/layout.tsx` **sem** `requireAdmin`:
   - carregar `Barlow_Condensed` (`--font-home-display`) e `Manrope` (`--font-home-body`);
   - importar `@/app/home-v2/home-v2.css`;
   - envolver com `<div className="… home-v2 font-homeBody">` e o skip link.
2. Na página, renderizar `<HomeV2Motion />` uma vez.
3. Montar as seções com `HomeV2SectionHeading`, `HomeV2Button`, `HomeV2MediaFrame` e os padrões acima.
4. Colocar a copy num arquivo em `lib/<area>/content.ts`, como em `lib/home-v2/content.ts`.

### Recomendado antes de escalar **[a extrair]**

Quando a segunda área for adotar o sistema:

- Mover `home-v2.css` para `app/styles/mesa.css` e renomear o escopo para `.mesa` (mantendo `.home-v2` como alias durante a transição).
- Criar `components/mesa/MesaShell.tsx` com fontes + wrapper + skip link + `HomeV2Motion`.
- Mover os componentes genéricos (`Button`, `SectionHeading`, `MediaFrame`, `Stars`, `PhotoViewer`, `useDialog`, `Motion`) para `components/mesa/`, deixando em `home-v2/` só as seções específicas da home.
- Extrair `Section` e `Card` como componentes (hoje são padrões de classe repetidos).

---

## 9. Não fazer

- Usar Inter/Roboto/fonte de sistema ou outra display além de Barlow Condensed.
- Adicionar segunda cor de acento ou usar laranja em texto corrido.
- Alterar tamanho/estilo de H1/H2 para "caber" numa seção — ajuste a copy.
- Colocar linha/borda decorativa no header.
- Empilhar grade + imagem + glow na mesma seção.
- Animações em loop (exceto o indicador de scroll do hero).
- Emojis como ícones (usar `lucide-react`).
- Imagens sem `sizes` ou PNG pesado como fundo.
