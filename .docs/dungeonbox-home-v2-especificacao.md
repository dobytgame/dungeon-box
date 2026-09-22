# DungeonBox — Home V2

**Documento de direção para Design, Conteúdo e Desenvolvimento**  
**Versão:** 1.0 · **Objetivo:** aumentar a conversão para assinatura, sem perder a Loja como caminho de entrada e recompra.

---

## 1. Visão do projeto

### A ideia central

**Sua dungeon cresce com a sua campanha.**

A nova Home deve vender uma transformação: o mestre deixa de improvisar uma mesa vazia e começa a construir, mês a mês, uma campanha visualmente memorável. A assinatura é o produto principal. A Loja é a alternativa para quem quer jogar agora, testar o universo DungeonBox ou completar a própria coleção.

### Princípios de experiência

1. **Mostrar antes de explicar.** Foto, vídeo ou cena 3D da mesa montada vêm antes de especificações.
2. **Uma decisão por tela.** Cada seção conduz a uma ação: entender, escolher, assinar ou explorar a Loja.
3. **Texto curto, informação decisiva.** Nada de parágrafos longos acima da dobra; detalhes ficam em expansão, modal ou página do plano.
4. **Imersão a serviço da compra.** Animação deve revelar o produto, dar feedback ou reforçar evolução — nunca atrasar a página.
5. **Mobile é a referência.** O site precisa parecer nativo no toque; desktop amplia a cena, não muda a jornada.

### Meta de negócio

| Prioridade | Resultado esperado |
|---|---|
| Primária | Clique qualificado em `Escolher meu plano` e início do checkout de assinatura |
| Secundária | Visita à Loja e clique em produto avulso |
| Terciária | Redução de dúvidas sobre encaixe, prazo, cancelamento e valor |

---

## 2. Nova identidade visual

### Nome da direção: **A Mesa Desperta**

O visual deixa de ser “dashboard técnico de dungeon” e passa a ser uma mesa de jogo cinematográfica: pedra escura, pergaminho, luz quente, dados e cenários reais em foco. A tecnologia fica invisível; o produto e a imaginação ocupam a frente.

### Paleta de cor

| Token | Valor | Uso |
|---|---:|---|
| `--ink` | `#0A0B0D` | fundo principal, header e footer |
| `--stone` | `#17191C` | superfícies, cards escuros e overlays |
| `--parchment` | `#F3EFE7` | texto principal e blocos claros |
| `--ember` | `#FF642D` | CTA primário, preço em destaque e ação ativa |
| `--jade` | `#9DE3D6` | compatibilidade, progresso e informação auxiliar |
| `--ash` | `#B8B8B2` | texto secundário |

**Regra:** `--ember` é reservado para conversão e estados críticos. Não usar laranja para decoração, tags aleatórias ou todos os links.

### Tipografia

- **Display:** uma fonte condensada, forte e legível em caixa alta para títulos de impacto. Sugestão: *Barlow Condensed* ou equivalente licenciada.
- **Interface e conteúdo:** uma sans serif contemporânea, com ótima leitura em português. Sugestão: *Manrope* ou equivalente.
- Não usar mais de duas famílias tipográficas.
- Títulos em `clamp()`; nunca depender de quebra manual para funcionar em telas pequenas.

### Direção de imagem

- Prioridade absoluta: cenários em uso numa mesa, miniaturas em ação, mãos posicionando peças, detalhe de textura e escala real.
- A caixa fechada é apoio; não é a imagem principal do hero.
- Iluminação quente de sessão de RPG, com fundo escuro e textura real. Evitar mockups excessivamente limpos ou banco de imagens genérico.
- Todo material deve ter versão desktop, mobile e thumbnail; prever também *poster frame* para cada vídeo.

---

## 3. Arquitetura da Home e copy aprovada

### Mapa da jornada

```text
Hero → Entender a evolução → Escolher plano → Ver a dungeon do mês
     → Conhecer a Loja → Prova social → Resolver dúvidas → Assinar
```

### 3.1 Header fixo

**Desktop:** logo à esquerda · `Como funciona` · `Planos` · `Loja` · `FAQ` · CTA à direita.  
**Mobile:** logo + menu; CTA fixo no rodapé depois que o hero sai de tela.

**CTA de header:** `COMEÇAR ASSINATURA`

**Comportamento:**

- Fundo transparente sobre o hero; ao rolar, vira superfície `--ink` com leve blur e borda inferior sutil.
- Não exibir mais de quatro itens de navegação.
- A âncora `Loja` sempre abre a seção da Loja na Home; o link “Ver tudo” leva ao catálogo.

### 3.2 Hero — a decisão principal

**Objetivo:** fazer o usuário entender em menos de 5 segundos que a assinatura entrega cenários 3D modulares todos os meses.

**Eyebrow:** `ASSINATURA MENSAL · CENÁRIOS 3D MODULARES`

**H1:**

> Sua próxima sessão começa aqui.

**Texto de apoio:**

> Receba novos cenários 3D todos os meses e transforme cada campanha em uma mesa que seus jogadores vão lembrar.

**CTA primário:** `ESCOLHER MEU PLANO` → `#planos`  
**Linha de confiança:** `A partir de R$89/mês · Cancele quando quiser`

**Mídia obrigatória:**

- Slot `hero-video`: vídeo de 8–12 s em loop silencioso, mostrando uma mesa vazia recebendo tiles, paredes e miniaturas até virar uma cena completa.
- Fallback: imagem estática da cena final, com composição já aprovada para mobile.
- Opcional desktop: modelo 3D de uma sala, com rotação lenta e controlada; nunca bloquear o texto ou o CTA.

**Regra de layout:** CTA, linha de confiança e pelo menos 60% da mídia devem estar visíveis na primeira dobra em 360×800 e 1440×900.

### 3.3 Faixa de evidências

Quatro itens curtos, com ícones simples:

`PEÇAS MODULARES` · `SISTEMA OPENLOCK` · `ESCALA 28 MM` · `CANCELE QUANDO QUISER`

Sem marquee automático. No mobile, usar rolagem horizontal com *snap* e indicador de progresso acessível.

### 3.4 Seção “Veja sua dungeon crescer”

**Eyebrow:** `A JORNADA DA ASSINATURA`

**H2:**

> Uma caixa começa a aventura. Todas as outras expandem o mundo.

**Estrutura:** três painéis visuais interativos — não três blocos de texto.

| Painel | Copy | Mídia |
|---|---|---|
| 01 | `Mês 1` / `Sua primeira sala.` | kit inicial montado |
| 02 | `Mês 3` / `Sua dungeon ganha vida.` | expansão com corredores e decoração |
| 03 | `Mês 12` / `Uma campanha inteira na mesa.` | cenário amplo em sessão real |

**Legenda única:** `Todas as peças se conectam. Nada fica para trás.`

**Interação:** no desktop, o scroll alterna os três momentos; no mobile, os painéis são um carrossel por toque. A cena deve trocar em até 250 ms e nunca depender de hover.

### 3.5 Planos — escolha sem sobrecarga

**ID:** `#planos`  
**Eyebrow:** `ENCONTRE O SEU COMEÇO`  
**H2:**

> Escolha o tamanho da sua aventura.

Exibir três cards equivalentes em estrutura. O plano Herói pode receber a etiqueta `MAIS ESCOLHIDO`, mas não pode esconder os demais nem ser selecionado automaticamente.

| Plano | Copy | Preço | CTA |
|---|---|---:|---|
| Aventureiro | `Sua primeira dungeon, pronta para começar.` | `R$89/mês` | `ESCOLHER AVENTUREIRO` |
| Herói | `Uma cena completa desde a primeira caixa.` | `R$139/mês` | `ESCOLHER HERÓI` |
| Lendário | `Mais escala, mais detalhes, mais história.` | `R$199/mês` | `ESCOLHER LENDÁRIO` |

Em cada card, deixar visível apenas: foto, frase, preço, 2–3 métricas e CTA. Conteúdo detalhado abre em *bottom sheet* no mobile ou modal no desktop:

- quantidades estimadas;
- lista de peças;
- comparação com plano anterior;
- combos e condições;
- prazo de produção e frete.

**Rodapé da seção:** `Não sabe qual escolher? Comece pelo Aventureiro. Você pode fazer upgrade depois.`

### 3.6 Dungeon do mês

**Eyebrow:** `CHEGANDO À SUA MESA`  
**H2:**

> A próxima aventura já está tomando forma.

**Conteúdo dinâmico do CMS:** tema, uma frase de lore, foto hero do cenário, foto de detalhe, vídeo curto e lista máxima de três destaques.

**CTA:** `VER O QUE VEM NA PRÓXIMA CAIXA`

Não prometer disponibilidade, prazo ou tema definitivo sem que a operação confirme no CMS.

### 3.7 Loja — rota de entrada e expansão

**ID:** `#loja`  
**Eyebrow:** `JÁ QUER JOGAR?`  
**H2:**

> Comece a aventura do seu jeito.

**Texto:**

> Explore cenários avulsos e expansões para levar mais possibilidades à sua mesa hoje.

**Estrutura:** grade de 4 produtos reais do catálogo, definida por merchandising no CMS. Cada card contém imagem, categoria opcional, nome, preço e CTA `VER PRODUTO`.

**Selo opcional de compatibilidade:** `COMPATÍVEL COM DUNGEONBOX` — usar somente quando verdadeiro para o SKU.

**CTA final:** `EXPLORAR A LOJA`

**Regra de posicionamento:** a Loja entra depois dos planos. Assim ela serve como alternativa para indecisos, sem desviar o foco de assinatura na primeira metade da página.

### 3.8 Prova social

**Eyebrow:** `MESAS REAIS. HISTÓRIAS REAIS.`  
**H2:**

> A campanha já começou por aqui.

Usar uma grade assimétrica de fotos reais de assinantes, sessões e peças pintadas. Cada item pode ter uma citação de até 120 caracteres, primeiro nome e cidade (com autorização).

Não usar carrossel automático. Em telas pequenas, usar duas colunas ou rolagem manual.

### 3.9 FAQ e fechamento

**H2:** `Dúvidas antes de começar?`

Perguntas iniciais, nesta ordem:

1. As peças de meses diferentes encaixam?
2. Quando recebo a primeira caixa?
3. Posso cancelar ou mudar de plano?
4. Como funciona o frete?
5. As peças vêm pintadas?

**CTA final:** `COMEÇAR MINHA ASSINATURA`  
**Apoio:** `A partir de R$89/mês · Sem carência · Sem multa`

---

## 4. Diretrizes de animação e imersão

### Matriz de movimento

| Elemento | Movimento | Limite | Objetivo |
|---|---|---:|---|
| Hero | vídeo curto ou cena 3D lenta | 12 s; sem som | mostrar o resultado do produto |
| Cards de plano | elevação e borda no hover/focus | 180–220 ms | reforçar escolha sem distração |
| Jornada mês 1–12 | transição de cena por scroll/touch | 200–350 ms | comunicar progressão |
| Produtos da Loja | zoom discreto na imagem | até 4% | sinalizar exploração |
| CTA | mudança de cor, sombra e leve escala | até 150 ms | feedback imediato |

### Regras obrigatórias

- Respeitar `prefers-reduced-motion`: sem parallax, autoplay, rotação 3D ou transições de câmera; manter conteúdo e CTA idênticos.
- Não animar propriedades que provocam *layout shift* (`top`, `left`, altura). Priorizar `opacity` e `transform`.
- Nenhum conteúdo essencial pode aparecer somente após animação, hover ou scroll.
- Vídeo sempre sem áudio por padrão, com `poster`, `playsInline`, controles de pausa disponíveis e fonte de mídia otimizada.
- Não carregar WebGL no hero como requisito. A página deve se tornar interativa antes da cena 3D.

### Uso de 3D

O 3D é recomendado apenas em um destes dois momentos:

1. **Hero desktop:** uma sala modular em GLB, com rotação muito lenta e fallback em imagem.
2. **Jornada da assinatura:** modelo de dungeon que adiciona peças ao avançar de Mês 1 para Mês 12.

Não utilizar objetos 3D decorativos flutuando em toda a página. Eles não explicam o produto e prejudicam carregamento, bateria e foco.

---

## 5. Especificação técnica

### Stack recomendada

| Camada | Recomendação | Diretriz |
|---|---|---|
| Aplicação | Next.js com App Router + React + TypeScript | renderização no servidor por padrão; componentes de cliente somente para interação |
| Estilo | CSS tokens + Tailwind CSS ou CSS Modules | tokens da marca centralizados; sem valores de cor soltos |
| Movimento UI | Motion for React | usar carregamento sob demanda para seções animadas |
| 3D | React Three Fiber + Drei | importar dinamicamente; fallback de imagem obrigatório |
| Imagens | `next/image` + CDN | AVIF/WebP, dimensões declaradas e recorte editorial |
| Vídeo | `<video>` nativo com MP4/H.264 e WebM quando disponível | poster e versões responsivas; sem dependência de player pesado no hero |
| Conteúdo | CMS headless ou API administrativa existente | conteúdo de planos, produtos, temas e mídias não deve ficar hardcoded |
| Qualidade | Playwright + Lighthouse CI + testes unitários | bloquear regressão visual, funcional e de performance |

O App Router é adequado por oferecer roteamento baseado em arquivos e recursos modernos do React, como Server Components e Suspense. Motion for React cobre transições, gestos e animações por scroll sem exigir soluções diferentes para cada efeito. Ver referências no fim do documento.

### Estrutura sugerida

```text
app/
  page.tsx
  layout.tsx
  sitemap.ts
  robots.ts
components/
  home/
    Hero.tsx
    EvidenceStrip.tsx
    GrowthJourney.tsx
    PlanSelector.tsx
    MonthlyDungeon.tsx
    StoreShelf.tsx
    SocialProof.tsx
    Faq.tsx
    StickyMobileCta.tsx
  ui/
    Button.tsx
    MediaFrame.tsx
    SectionHeading.tsx
    ProductCard.tsx
    Dialog.tsx
lib/
  cms.ts
  analytics.ts
  plans.ts
  schema.ts
public/
  media/
```

### Contratos de conteúdo mínimos

```ts
type Plan = {
  slug: 'aventureiro' | 'heroi' | 'lendario'
  name: string
  tagline: string
  monthlyPriceCents: number
  badge?: string
  metrics: Array<{ label: string; value: string }>
  heroImage: Media
  checkoutUrl: string
  details: RichContent
}

type StoreProduct = {
  sku: string
  name: string
  category?: string
  priceCents: number
  image: Media
  productUrl: string
  compatibleWithSubscription?: boolean
}

type MonthlyDungeon = {
  title: string
  lore: string
  status: 'revealed' | 'coming_soon'
  heroMedia: Media
  detailMedia: Media
  highlights: string[]
}
```

Validar os dados com schema em runtime antes de renderizar. Valores de preço, disponibilidade, desconto e prazo devem vir da fonte oficial de comércio; nunca duplicar regras comerciais em texto fixo.

### Mídia: briefing e orçamento de peso

| Slot | Formato | Proporção | Limite inicial | Alt/caption |
|---|---|---:|---:|---|
| Hero vídeo | MP4/WebM + poster | 16:9 desktop / 4:5 mobile | até 2 MB por versão | descrever a transformação visível |
| Hero fallback | AVIF/WebP | 16:9 / 4:5 | até 250 KB | cena de dungeon finalizada |
| Jornada | 3 imagens ou GLB | 4:5 | até 220 KB cada; GLB até 5 MB | estágio da dungeon e mês |
| Plano | imagem editorial | 4:5 | até 180 KB | plano e peças que representa |
| Loja | imagem de produto | 1:1 | até 140 KB | nome completo do produto |
| Social proof | foto real | 4:5 ou 1:1 | até 180 KB | contexto da mesa, sem informação pessoal sensível |

Para GLB: reduzir polígonos, combinar materiais, comprimir geometria/texturas e testar em dispositivos reais. A cena 3D deve ser carregada depois do conteúdo crítico e abandonada quando o aparelho indicar pouca capacidade gráfica ou economia de dados.

### Performance: critérios não negociáveis

- LCP até **2,5 s**, INP até **200 ms** e CLS até **0,1** no percentil 75, segmentados por mobile e desktop.
- Hero textual deve renderizar no HTML inicial.
- Reservar espaço com `width`/`height` ou `aspect-ratio` para toda mídia.
- Carregar apenas a mídia do hero em prioridade; o restante deve usar lazy loading.
- Adiar scripts de mapa de calor, chat, pixels não essenciais e 3D até consentimento/interação quando aplicável.
- Definir *performance budget* em CI: JavaScript inicial até 220 KB gzip, CSS crítico até 35 KB gzip e sem fontes bloqueando a renderização.
- Usar RUM com `web-vitals`; Lighthouse é validação de laboratório, não substituto da medição real.

### Acessibilidade

- Atender WCAG 2.2 AA: contraste, foco visível, semântica e operação por teclado.
- Um único H1; títulos seguem ordem lógica.
- CTAs usam verbos claros e não dependem de cor ou ícone.
- Carrosséis têm botões nomeados, pausam quando necessário e não avançam sozinhos.
- Modais e *bottom sheets* prendem foco, possuem `Esc` e devolvem foco ao gatilho.
- Vídeos decorativos não exigem áudio; vídeos explicativos precisam de legenda e transcrição.
- Imagens de produto recebem alt descritivo; elementos puramente decorativos recebem alt vazio.
- A preferência de redução de movimento deve desativar todos os efeitos não essenciais.

### SEO e compartilhamento

- Manter `lang="pt-BR"`, canonical, `sitemap.xml`, `robots.txt` e metadados por rota.
- Usar dados estruturados apropriados: `Organization`, `Product`, `Offer`, `FAQPage` e `VideoObject` somente quando o conteúdo cumprir os requisitos.
- Título sugerido: `Assinatura de Cenários 3D para RPG | DungeonBox`.
- Description sugerida: `Receba cenários 3D modulares para RPG todos os meses. Monte uma dungeon que cresce com sua campanha. Planos a partir de R$89.`
- Gerar imagem Open Graph própria: mesa montada + marca + mensagem “Sua dungeon cresce com a sua campanha”.

---

## 6. Medição, testes e otimização

### Eventos de analytics

| Evento | Quando dispara | Propriedades mínimas |
|---|---|---|
| `home_view` | home visível | origem, dispositivo, variante |
| `hero_cta_click` | clique em escolher plano | posição, origem, variante |
| `plan_viewed` | card/modal de plano aberto | plano |
| `plan_selected` | CTA de plano | plano, preço, combo |
| `checkout_started` | redirecionamento ao checkout | plano, origem |
| `store_section_viewed` | 50% da seção visível | origem |
| `store_product_clicked` | clique em produto | SKU, posição |
| `faq_opened` | item expandido | pergunta |
| `media_played` | vídeo iniciado manualmente | slot, duração assistida |

Não enviar nome, e-mail, telefone, CEP ou qualquer dado de pagamento para ferramentas de analytics.

### Hipóteses de experimento

1. Hero com mesa montada versus hero com transformação da mesa.
2. CTA `ESCOLHER MEU PLANO` versus `COMEÇAR MINHA ASSINATURA`.
3. Loja após planos versus Loja após a seção “Veja sua dungeon crescer”.
4. Card Herói com selo “Mais escolhido” versus sem selo.

Mudar uma variável por teste, preservar a mesma oferta e medir `checkout_started` como conversão principal.

### Critérios de aceite

- O usuário encontra preço inicial, compatibilidade e política de cancelamento sem rolar mais que uma tela no mobile.
- Todos os três planos podem ser comparados e escolhidos sem leitura de texto extenso.
- A Loja exibe quatro produtos gerenciáveis por CMS e leva corretamente ao SKU.
- Home funciona sem JavaScript para conteúdo essencial, links e navegação básica.
- Conteúdo, imagens e CTAs aparecem corretamente em 360 px, 768 px, 1024 px e 1440 px.
- Nenhuma animação essencial roda para quem seleciona redução de movimento.
- Lighthouse e testes end-to-end passam no pull request; Web Vitals reais são monitorados após publicação.

---

## 7. Fora de escopo desta primeira entrega

- Configurador 3D completo de dungeon.
- AR, login, comunidade ou painel de assinante.
- Rebuild do checkout.
- Novas regras comerciais, preços, descontos ou política de frete.

Esses itens podem virar fases futuras depois que a nova Home tiver dados de conversão suficientes.

---

## Referências técnicas

- [Next.js — App Router](https://nextjs.org/docs/app)
- [Motion for React](https://motion.dev/docs/react)
- [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [Web Vitals — métricas e metas](https://web.dev/articles/vitals)
