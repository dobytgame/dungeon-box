# DungeonBox — Redesign LP `/entre-para-guilda`
**Documento de diretrizes:** Design System · Layout · Copy de conversão  
**Versão:** 2.0 · Agosto 2026  
**Objetivo:** Aumentar conversão de 11,2% para 20%+

---

## 1. Diagnóstico da versão atual

### Problemas críticos identificados

| Problema | Impacto estimado |
|---|---|
| Linguagem de pré-lançamento ("em breve", "fundador") | -30% conversão — produto já ativo com 90 assinantes |
| Seção de planos com 3 preços detalhados | -20% conversão — barreira de preço antes de criar valor |
| Fotos pequenas, muito texto, pouca hierarquia visual | -15% conversão — visitante não sente o produto |
| Depoimentos muito abaixo da dobra | -10% conversão — prova social chega tarde demais |
| Imagem hero 3840px em mobile 375px | -10% velocidade de carregamento |
| Contador "20" sem contexto | Confusão e desconfiança |

### O que funciona e deve ser mantido
- Headline principal: forte e direta
- Link WhatsApp sem redirecionamento intermediário
- Texto de identificação "Você conhece essa cena": funciona bem
- Depoimentos: específicos e credíveis — precisam estar mais acima
- FAQ: completo e relevante

---

## 2. Design System

### 2.1 Paleta de cores

```
Primárias:
--color-bg:         #0D0D0D   /* Fundo principal — preto profundo */
--color-surface:    #1A1A1A   /* Cards e seções alternadas */
--color-surface-2:  #252525   /* Elementos internos */

Marca:
--color-gold:       #C9A84C   /* Dourado — CTAs, destaques, ícones */
--color-gold-light: #E8C96A   /* Hover dos CTAs */
--color-orange:     #E67E22   /* Laranja — badges, acentos secundários */

Texto:
--color-text:       #E8E4DC   /* Texto principal */
--color-text-muted: #8A8680   /* Texto secundário */
--color-text-faint: #555550   /* Legendas e meta-texto */

Bordas:
--color-border:     rgba(255,255,255,0.08)
--color-border-gold: rgba(201,168,76,0.3)

Estado:
--color-success:    #2ECC71
--color-danger:     #C0392B
```

### 2.2 Tipografia

```
Fonte heading:  'Cinzel', serif          /* Títulos com personalidade fantasy */
Fonte body:     'Inter', sans-serif      /* Leitura limpa e moderna */

Escala:
--text-hero:    clamp(36px, 6vw, 64px)  /* Headline principal */
--text-h1:      clamp(28px, 4vw, 44px)  /* Seções */
--text-h2:      clamp(22px, 3vw, 32px)  /* Sub-seções */
--text-h3:      20px
--text-body:    16px / line-height 1.7
--text-small:   14px
--text-micro:   12px

Pesos:
400 — corpo e texto corrido
600 — ênfase e subtítulos
700 — headlines e CTAs
```

### 2.3 Espaçamento

```
--space-xs:   8px
--space-sm:   16px
--space-md:   24px
--space-lg:   48px
--space-xl:   80px
--space-2xl:  120px

Seções:       padding vertical --space-xl (80px)
Cards:        padding --space-md (24px)
Gap grid:     --space-md (24px)
```

### 2.4 Componentes

**Botão primário (CTA principal)**
```
background:    #C9A84C
color:         #0D0D0D
font-weight:   700
font-size:     18px
padding:       16px 40px
border-radius: 4px
text-transform: uppercase
letter-spacing: 0.08em

hover:
background:    #E8C96A
transform:     translateY(-2px)
box-shadow:    0 8px 24px rgba(201,168,76,0.3)

mobile:
width:         100%
padding:       18px 24px
font-size:     17px
```

**Botão secundário**
```
background:    transparent
border:        1px solid rgba(201,168,76,0.5)
color:         #C9A84C
padding:       12px 28px
border-radius: 4px
```

**Card de kit**
```
background:    #1A1A1A
border:        1px solid rgba(255,255,255,0.08)
border-radius: 8px
overflow:      hidden

Imagem:        aspect-ratio 4/3, object-fit cover, width 100%
Conteúdo:      padding 20px
```

**Badge de prova social**
```
background:    rgba(201,168,76,0.12)
border:        1px solid rgba(201,168,76,0.25)
color:         #C9A84C
font-size:     12px
font-weight:   600
padding:       4px 12px
border-radius: 20px
letter-spacing: 0.06em
text-transform: uppercase
```

### 2.5 Grid e breakpoints

```
Mobile first. Container max-width: 1200px, padding: 0 20px.

Breakpoints:
--mobile:   375px  (1 coluna)
--tablet:   768px  (2 colunas)
--desktop:  1200px (3 colunas onde aplicável)

Grid de kits:    1 col mobile → 3 col desktop
Grid social:     1 col mobile → 3 col desktop
Grid benefícios: 1 col mobile → 2 col tablet → 4 col desktop
```

### 2.6 Imagens — diretrizes

```
Hero:           1200×800px mínimo, formato webp, qualidade 85
                srcset para mobile (800px) e desktop (1600px)
                LCP target: < 2.5s

Kits (cards):   800×600px, formato webp, qualidade 80
                Sempre mostrar produto montado com iluminação âmbar
                Fundo escuro ou neutro — nunca fundo branco

Fotos prioritárias por ordem de impacto:
1. Dungeon completa montada — ângulo isométrico (acima e levemente de lado)
2. Close em detalhe de peça encaixando — mãos em ação
3. Mesa completa com dados e miniaturas — wide shot
4. Caixa aberta com kit organizado — flat lay de cima
5. Confronto monstro + herói dentro da dungeon — eye level

Evitar:
- Fotos com muito texto sobreposto
- Imagens stock ou geradas por IA na hero
- Fundo branco em qualquer produto
```

---

## 3. Estrutura da nova LP

### Visão geral do fluxo

```
[Hero] → [Prova social rápida] → [Identificação] →
[Produto em ação — fotos grandes] → [Como funciona] →
[CTA intermediário] → [Depoimentos] → [Guilda — benefícios] →
[CTA final] → [FAQ]
```

**Princípio central:** foto grande primeiro, texto depois. O visitante precisa SENTIR o produto antes de ler sobre ele.

---

## 4. Copy por seção

### Seção 1 — Hero

**Objetivo:** parar o scroll, criar identificação, empurrar para o CTA em menos de 5 segundos.

**Remover completamente:**
- "Lançamento em breve"
- "Vagas de fundador"
- Qualquer referência a pré-lançamento

---

**Headline principal**
```
SUA DUNGEON
NUNCA MAIS
VAI PARECER AMADORA.
```
*(manter — está funcionando)*

**Sub-headline** *(atualizar)*
```
A primeira assinatura mensal de cenários 3D modulares do Brasil.
Todo mês um kit novo na sua porta — tiles, paredes, props.
Sua dungeon cresce a cada caixa. Para sempre.
```

**Social proof badge** *(novo — logo abaixo do sub-headline)*
```
✦  90 mestres já na Guilda  ✦  D&D · Tormenta · Pathfinder  ✦  Sistema OpenLOCK
```

**CTA principal**
```
[ ENTRAR NA GUILDA — É GRATUITO ]
```
*Sublinhado abaixo do botão:*
```
Grupo exclusivo no WhatsApp · Bastidores da produção · Sem compromisso
```

---

### Seção 2 — Prova social rápida (nova seção)

**Objetivo:** logo abaixo do hero, antes de qualquer explicação, mostrar que o produto é real e pessoas reais amam.

**Formato:** 1 depoimento em destaque + 2 menores ao lado

**Depoimento principal (Rafael M. — o mais forte)**
```
"Quando vi o sistema OpenLOCK encaixando as peças do mês 1 com as do
mês 2, entendi que isso é diferente de tudo que já comprei para mesa.
Não é só um produto — é uma dungeon que cresce junto com a campanha."

— Rafael M.  |  São Paulo  |  Mestre de D&D há 7 anos
```

**Depoimentos secundários (compactos)**
```
"Joguei Tormenta por 4 anos sem cenário físico. O kit do Mês 1 já monta
3 a 4 salas. Finalmente é possível ter imersão visual."

— Lucas T., Rio de Janeiro

---

"Cada sala nova sempre custava R$ 200 avulso. A assinatura resolve isso:
a dungeon cresce todo mês, no ritmo da campanha."

— Ana P., Belo Horizonte
```

---

### Seção 3 — Identificação

**Objetivo:** ativar a dor do mestre. Manter o texto atual com pequenos ajustes.

**Headline**
```
VOCÊ CONHECE ESSA CENA.
```

**Body**
```
A mesa está montada. Os dados estão prontos. Mas o cenário é um mapa
de papel amassado, duas caixas de papelão fazendo de parede e um
punhado de improviso.

Você imaginou a dungeon perfeita. O que chegou na mesa não tem nem
metade da atmosfera.

Seus jogadores merecem mais. Sua campanha merece mais.

É exatamente isso que a DungeonBox resolve.
```

---

### Seção 4 — Produto em ação (NOVA — fotos grandes)

**Objetivo:** mostrar o produto de forma impactante. Imagens grandes, pouco texto. O visitante precisa querer isso na mesa dele.

**Headline**
```
VER PARA CRER.
```

**Sub-headline**
```
Cenários reais. Na mesa de mestres reais.
```

**Layout:** grade de 3 fotos grandes (desktop) / 1 foto por vez (mobile)

**Foto 1 — Dungeon completa**
```
[FOTO GRANDE — dungeon montada ângulo isométrico]
Caption: "Mês 1 + Mês 2 montados juntos. 8 salas, corredor central, área de boss."
```

**Foto 2 — Close no encaixe**
```
[FOTO GRANDE — close nas peças encaixando]
Caption: "Sistema OpenLOCK. Cada peça de qualquer mês encaixa em qualquer outra. Para sempre."
```

**Foto 3 — Mesa completa**
```
[FOTO GRANDE — mesa com dungeon, dados, miniaturas]
Caption: "É isso que seus jogadores veem quando entram na sala."
```

---

### Seção 5 — Como funciona

**Objetivo:** explicar o modelo de assinatura de forma simples. Sem jargão, sem lista de peças.

**Headline**
```
SIMPLES ASSIM.
```

**4 steps horizontais (desktop) / vertical (mobile)**

```
① TODO MÊS
Um kit temático sai da nossa produção e vai direto para a sua porta.
Tiles, paredes, props. Tudo impresso em PLA premium.

② ENCAIXA SEMPRE
Sistema OpenLOCK — o padrão mais usado do mundo. Peças do Mês 1
encaixam no Mês 12. Sua dungeon nunca para de crescer.

③ SUA ESCOLHA
Três planos. Você começa com o que cabe no bolso e evolui quando
quiser. Sem carência. Cancele a qualquer momento.

④ SUA DUNGEON
Mês a mês, sessão a sessão, sua mesa vira o cenário que você sempre
imaginou. Seu grupo nunca mais vai jogar no papel.
```

---

### Seção 6 — CTA intermediário

**Objetivo:** capturar visitantes que já foram convencidos antes de chegarem ao final da página.

**Headline**
```
PRONTO PARA ENTRAR?
```

**Sub-headline**
```
A Guilda é gratuita. É lá que acontece tudo antes do público geral.
```

**CTA**
```
[ ENTRAR NA GUILDA ]
```

**Linha abaixo**
```
Abre o WhatsApp direto · Sem cadastro · Saia quando quiser
```

---

### Seção 7 — Benefícios da Guilda

**Objetivo:** explicar por que entrar na Guilda é o próximo passo certo — não comprar agora.

**Headline**
```
O QUE ACONTECE
QUANDO VOCÊ ENTRA.
```

**4 benefícios em cards**

```
🎲 BASTIDORES AO VIVO
Você acompanha cada kit saindo da impressora antes de todo mundo.
Vídeos, fotos e o processo completo em tempo real.

🗳️ VOTE NO PRÓXIMO TEMA
Membros da Guilda votam nos temas dos próximos kits.
Sua dungeon, sua escolha.

⚡ ACESSO ANTECIPADO
O link de assinatura chega na Guilda antes de abrir para o público.
Quem está aqui garante primeiro.

🎁 CONDIÇÕES EXCLUSIVAS
Códigos de desconto e ofertas especiais só para membros.
Nunca disponíveis fora do grupo.
```

**Linha final abaixo dos cards**
```
Gratuito · Sem spam · Saia quando quiser
```

---

### Seção 8 — Plano simplificado (substituir a seção atual)

**Objetivo:** mostrar preço sem criar barreira. Uma linha por plano, sem lista de peças.

**Headline**
```
A PARTIR DE R$ 89/MÊS.
```

**Sub-headline**
```
Três planos. Você escolhe dentro da Guilda,
com ajuda de quem já assina.
```

**3 cards simplificados**

```
AVENTUREIRO
R$ 89/mês
Sua primeira dungeon. Funcional no dia 1.
~60 peças · 3–4 salas

HERÓI
R$ 139/mês
A dungeon do mestre. Com atmosfera desde o kit 1.
~93 peças · 5–7 salas

LENDÁRIO ← mais popular
R$ 199/mês
A experiência épica completa.
~132 peças + 3 miniaturas exclusivas
```

**Nota abaixo**
```
+ frete calculado por CEP · Sem carência · Cancele quando quiser
```

---

### Seção 9 — CTA final

**Objetivo:** última chance de conversão antes do FAQ.

**Headline**
```
SEUS JOGADORES MERECEM
UMA DUNGEON À ALTURA
DA HISTÓRIA QUE VOCÊ CRIOU.
```

**CTA**
```
[ ENTRAR NA GUILDA — AGORA ]
```

**Linha abaixo**
```
Grupo no WhatsApp · Gratuito · 90 mestres já dentro
```

---

### Seção 10 — FAQ

**Manter as perguntas atuais. Adicionar:**

```
P: A Guilda é realmente gratuita?
R: Sim. A Guilda é o grupo de WhatsApp da DungeonBox — gratuito, sem
compromisso de assinatura. Você entra, acompanha a produção, e assina
quando quiser. Ninguém vai te pressionar.

P: Quantas pessoas já estão na Guilda?
R: Mais de 90 mestres já fazem parte da comunidade e recebem kits
mensalmente.
```

---

## 5. Diretrizes de UX e performance

### Mobile first — regras obrigatórias

```
- Botão CTA: width 100%, height mínimo 52px, font-size 17px
- Texto body: mínimo 16px — nunca menor em mobile
- Espaçamento entre seções: mínimo 60px em mobile
- Imagens: lazy loading em tudo exceto hero
- Hero image: srcset com versão 800px para mobile
- Nenhum elemento com scroll horizontal
- Tap targets: mínimo 44×44px
```

### Performance (LCP < 2.5s)

```
- Hero image: formato webp, max 200kb para mobile
- Lazy load: todas as imagens abaixo do hero
- Fontes: preload da heading font (Cinzel)
- Remover o meta noindex se quiser tráfego orgânico
- Evitar scripts de terceiros no critical path
```

### Hierarquia visual — regra de ouro

```
1. Foto grande (produto em ação)
2. Headline curta e direta
3. Sub-headline explicativa
4. CTA em destaque
5. Prova social

Nunca inverter essa ordem. Foto sempre antes de texto.
```

### O que remover completamente

```
✗ "Lançamento em breve" — em qualquer lugar da página
✗ "Vagas de fundador" — produto já ativo
✗ "Pré-lançamento" — em qualquer lugar
✗ "Quando abrirmos para o público geral" — urgência falsa
✗ "Opiniões coletadas durante o período de desenvolvimento"
✗ "Votação no tema do Mês 1" — Mês 1 já passou
✗ Contador "20" sem contexto
✗ Lista detalhada de peças por plano nessa LP
```

### O que adicionar

```
✓ "90 mestres já na Guilda" — próximo ao hero e ao CTA final
✓ Depoimento acima da dobra — imediatamente após o hero
✓ Número de membros atualizado em tempo real (se possível)
✓ Fotos do produto reais e grandes — mínimo 3 na página
✓ FAQ atualizado com pergunta sobre gratuidade da Guilda
```

---

## 6. Checklist de implementação

### Fase 1 — Correções urgentes (hoje)
- [ ] Remover toda linguagem de pré-lançamento
- [ ] Remover contador "20" ou trocar por "90 mestres"
- [ ] Subir depoimento do Rafael M. logo abaixo do hero
- [ ] Testar velocidade no PageSpeed Insights — meta LCP < 2.5s

### Fase 2 — Redesign (esta semana)
- [ ] Substituir seção de planos detalhados por versão simplificada
- [ ] Adicionar seção "Produto em ação" com fotos grandes
- [ ] Implementar nova seção de benefícios da Guilda
- [ ] Adicionar CTA intermediário após "Como funciona"
- [ ] Otimizar imagem do hero para mobile (srcset 800px / 1600px)

### Fase 3 — Otimização (próxima semana)
- [ ] Teste A/B headline hero vs alternativa
- [ ] Implementar lazy loading em todas as imagens
- [ ] Avaliar remoção do noindex para capturar tráfego orgânico
- [ ] Adicionar FAQ com pergunta sobre gratuidade
- [ ] Integrar contador dinâmico de membros da Guilda

---

## 7. Métricas de sucesso

| Métrica | Atual | Meta 30 dias |
|---|---|---|
| Conv. clique→lead | 11,2% | ≥ 20% |
| Leads/dia | 4,3 | ≥ 10 |
| CPL | R$ 4,48 | ≤ R$ 2,50 |
| LCP mobile | não medido | < 2,5s |
| Bounce rate | não medido | < 60% |

---

*DungeonBox — Documento de redesign LP /entre-para-guilda · Agosto 2026*
