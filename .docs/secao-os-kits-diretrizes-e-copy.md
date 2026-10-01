# Seção "Os Kits" — Diretrizes de desenvolvimento e copy

**Objetivo da seção:** derrubar as objeções de quem está na dúvida de assinar, mostrando (com prova visual, não só texto) que o kit chega pronto para jogar, encaixa nas peças que a pessoa já tem e pode ser cancelado sem custo.

**Métrica de sucesso:** aumento do clique em "Escolher meu plano" a partir desta seção e queda nas perguntas repetidas no WhatsApp/DM sobre as objeções abaixo.

> Itens marcados com **[CONFIRMAR]** dependem de informação do negócio. Não publicar sem validar.

---

## 1. Problemas da versão atual (o que corrigir)

| Problema | Correção |
|---|---|
| Texto de apoio cinza pequeno sobre fundo escuro, baixo contraste | Texto de apoio em cor clara, mínimo 16px, contraste AA (4.5:1) |
| Os 3 blocos têm o mesmo peso, e a maior objeção ("sem multa") está em 3º e sem destaque | Ordem por objeção mais forte + selo de garantia perto do CTA |
| Foto poluída (logo duas vezes, selo "HERÓI", adesivo "Mais peça, a mesma mesa") | Fotos limpas, sem elementos sobrepostos dentro da imagem |
| Peça cinza sobre fundo escuro perde contraste e escala | Fotos com luz melhor, fundo mais claro ou rim light; sempre um objeto de escala (mão/miniatura) |
| Galeria em carrossel com 6 fotos parecidas e miniaturas escuras | Grid com tipos diferentes de imagem + vídeo como item principal |
| Título promete "pronta", foto mostra peça crua | Alinhar título com o que a foto mostra (ver seção 4) |
| Copy usa jargão (OpenLOCK, kit menor) | Linguagem simples no texto principal; termo técnico só em detalhe/tooltip |

---

## 2. Estrutura da seção

Ordem de cima para baixo (desktop):

1. **Eyebrow:** `OS KITS`
2. **Título (H2) + subtítulo**
3. **Vídeo principal** (encaixe das peças), largura total do container
4. **3 blocos de objeção**, cada um com sua prova visual ao lado (foto ou vídeo curto), alternando esquerda/direita
5. **Galeria em grid** (5 imagens)
6. **Faixa de garantia + CTA**

Mobile: tudo em coluna única, vídeo logo após o subtítulo, blocos com a mídia acima do texto.

---

## 3. Diretrizes de desenvolvimento

### 3.1 Layout e tipografia

- Container máximo de 1200px, texto dos blocos com largura máxima de ~60 caracteres por linha.
- Hierarquia de tamanho (desktop / mobile):
  - H2: 56px / 36px, caixa alta, peso alto (manter a fonte condensada atual)
  - Título do bloco (H3): 28px / 22px
  - Texto de apoio: 18px / 16px, altura de linha 1.5
  - Rótulo (eyebrow dos blocos): 13px mínimo, letter-spacing leve. Não usar menos que isso.
- Contraste: texto principal `#FFFFFF`, texto de apoio no mínimo `#D6D6D6` sobre fundo escuro. Nunca cinza médio.
- Cor de destaque (laranja atual) reservada para: número do bloco, CTA e selo de garantia. Não usar em mais nada.
- Espaçamento vertical entre blocos: 64px desktop / 40px mobile. Sem divisórias finas quase invisíveis; usar espaço em branco.

### 3.2 Vídeo principal

- Formato: MP4 (H.264) + WebM, com poster obrigatório.
- Comportamento: `autoplay muted loop playsinline`, sem controles, sem som.
- Duração: 8 a 15 segundos. Peso máximo: 2 MB desktop / 1 MB mobile (entregar duas versões).
- Só iniciar o carregamento quando entrar na viewport (`loading="lazy"` / IntersectionObserver).
- Respeitar `prefers-reduced-motion`: mostrar só o poster, sem autoplay.
- Acessibilidade: `aria-label` descrevendo o conteúdo ("Mão encaixando duas paredes do kit sem cola").

### 3.3 Vídeos curtos dos blocos

- Mesmas regras do vídeo principal, 4 a 8 segundos, sem áudio.
- Se algum bloco não tiver vídeo, usar foto no mesmo tamanho (proporção 4:3).

### 3.4 Galeria

- Substituir o carrossel por **grid**: 1 imagem grande (2×2) + 4 pequenas (1×1) no desktop; 2 colunas no mobile.
- Clicar abre lightbox com navegação por setas e teclado (`←` `→` `Esc`), foco preso dentro do modal.
- Remover o botão "Ampliar" isolado: a imagem inteira é clicável.
- Cada imagem tem legenda curta visível (ver seção 6) e `alt` descritivo.
- Miniaturas nunca escurecidas por overlay. Se precisar de estado inativo, usar borda, não opacidade.
- Formatos: WebP com fallback JPG, `srcset` em 3 larguras (480, 960, 1600), `width`/`height` definidos para evitar layout shift.

### 3.5 Selo de garantia e CTA

- Selo "Cancele quando quiser, sem multa" visível **ao lado do botão**, não só no bloco 3.
- Botão: texto `ESCOLHER MEU PLANO`, altura mínima 52px, área de toque 48px no mobile.
- Microcopy abaixo do botão: "Sem carência. Cancele quando quiser."
- CTA repetido de forma sticky no mobile enquanto a seção estiver na tela (opcional, testar).

### 3.6 Performance e acessibilidade

- LCP da seção: o poster do vídeo principal deve ser preload; demais mídias lazy.
- Meta: Lighthouse mobile ≥ 90 em Performance e Acessibilidade.
- Todos os elementos interativos com foco visível e navegação por teclado.
- Não colocar texto importante dentro de imagens.

### 3.7 Eventos de analytics (para medir o que funciona)

| Evento | Quando dispara |
|---|---|
| `kits_secao_visualizada` | Seção entra 50% na viewport |
| `kits_video_play` | Vídeo principal começa a tocar |
| `kits_galeria_abrir` | Abriu lightbox (enviar índice da imagem) |
| `kits_bloco_visualizado` | Cada bloco de objeção entra na viewport (enviar `bloco_id`) |
| `kits_cta_click` | Clique em "Escolher meu plano" (enviar posição: topo/faixa/sticky) |

---

## 4. Copy

### 4.1 Cabeçalho

**Eyebrow:** OS KITS

**Título (escolher 1 para teste A/B):**
- A: **Sua primeira sessão já sai da caixa.**
- B: **Abriu a caixa, montou a sala, jogou.**

**Subtítulo:**
> Nada de esperar meses por uma amostra. No primeiro envio você já monta uma sala completa e joga na mesma noite.

**[CONFIRMAR]** Se o kit chega montado/pintado ou cru. Enquanto isso não for confirmado, **não usar a palavra "pronta"**. Se chega para montar, o texto acima já é fiel: "monta uma sala" e "joga".

### 4.2 Blocos de objeção

**Bloco 01 — "Vou receber só uma amostra?"**
- Rótulo: `PRIMEIRA SESSÃO`
- Título: **Vem pra jogar, não pra esperar.**
- Texto: Já no primeiro envio você monta uma sala completa: piso, paredes e corredor. Dá para jogar na primeira entrega, sem depender da próxima caixa.
- Mídia sugerida: foto da sala montada com miniaturas e dados na mesa

**Bloco 02 — "E se eu quiser mudar de plano? As peças encaixam?"**
- Rótulo: `MESMO ENCAIXE`
- Título: **Suas peças nunca ficam obsoletas.**
- Texto: Todos os planos usam o mesmo encaixe, sem cola. Trocou de plano? Tudo o que você já montou continua valendo e se junta às peças novas.
- Detalhe/tooltip (termo técnico): *Sistema de encaixe OpenLOCK.*
- Mídia sugerida: vídeo curto de duas peças de kits diferentes se encaixando

**Bloco 03 — "E se eu quiser cancelar?"**
- Rótulo: `SEM TRAVA`
- Título: **Cancele quando quiser. Sem multa.**
- Texto: Sem carência e sem multa. A assinatura acompanha a sua campanha: comece no tamanho da sua mesa e pare quando quiser.
- Mídia sugerida: foto da mesa com jogadores (contexto de campanha em andamento)

> Ordem alternativa recomendada para teste: **03 → 01 → 02**, já que a garantia costuma ser a maior barreira de quem assina.

### 4.3 Faixa de garantia + CTA

- Selo: **Sem carência · Sem multa**
- Botão: **ESCOLHER MEU PLANO**
- Microcopy: Cancele quando quiser.

### 4.4 Mini FAQ (opcional, abaixo do CTA)

Incluir só as perguntas que realmente aparecem no atendimento. Sugestão inicial:

| Pergunta | Resposta |
|---|---|
| As peças precisam de cola? | Não. Todas encaixam sem cola. |
| Preciso pintar? | **[CONFIRMAR]** |
| Cabe na minha mesa? | **[CONFIRMAR]** medidas da sala montada em cada plano. |
| Posso trocar de plano depois? | Sim. O que você já montou continua encaixando nas peças novas. |
| Como cancelo? | **[CONFIRMAR]** processo (site, WhatsApp, e-mail). |

---

## 5. Lista de mídia para produção (fotos e vídeos)

**Vídeos**

| # | Conteúdo | Duração | Uso |
|---|---|---|---|
| V1 | Mão encaixando 2 a 3 peças, câmera fixa, luz boa | 8 a 15 s | Vídeo principal |
| V2 | Peças de planos diferentes se encaixando | 4 a 8 s | Bloco 02 |
| V3 | Time-lapse da sala sendo montada do zero | 8 a 12 s | Bloco 01 (opcional) |

**Fotos**

| # | Conteúdo | Por que existe |
|---|---|---|
| F1 | Sala montada com miniaturas, dados e mão para escala | Mostra tamanho real e uso |
| F2 | Mesa com jogadores em sessão | Contexto de campanha (bloco 03) |
| F3 | Close da textura e da linha de encaixe | Qualidade da impressão |
| F4 | Unboxing: o que vem na caixa do plano menor | Responde "é só amostra?" |
| F5 | Peça crua vs. pintada (se aplicável) | Mostra potencial de personalização |

**Regras de produção**
- Fundo com contraste em relação às peças (as peças cinza somem em fundo escuro).
- Luz lateral suave para revelar textura; evitar sombra dura.
- Sempre um objeto de escala (mão ou miniatura).
- **Sem logo, selo ou adesivo dentro da imagem.** Marca e textos ficam no HTML.
- Resolução mínima: 2400px no lado maior (fotos), 1080p (vídeos).

---

## 6. Legendas da galeria

| Imagem | Legenda |
|---|---|
| F1 | A sala completa do primeiro envio |
| F2 | Uma campanha de verdade, na mesa de verdade |
| F3 | Textura de pedra, encaixe sem cola |
| F4 | O que chega na primeira caixa |
| F5 | Do cinza ao pintado, do seu jeito |

---

## 7. Checklist de entrega

- [ ] Ordem e estrutura da seção conforme item 2
- [ ] Tipografia, contraste e espaçamentos conforme item 3.1
- [ ] Vídeo principal com poster, lazy load e `prefers-reduced-motion`
- [ ] Galeria em grid com lightbox acessível
- [ ] Selo de garantia ao lado do CTA
- [ ] Eventos de analytics disparando (3.7)
- [ ] Nenhum item **[CONFIRMAR]** publicado sem validação
- [ ] Lighthouse mobile ≥ 90 (Performance e Acessibilidade)
- [ ] Teste A/B do título (A vs. B) e da ordem dos blocos configurado
