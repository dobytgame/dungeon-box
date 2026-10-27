# DungeonBox — Ajustes do site para melhorar a conversão

**Versão:** 1.0  
**Data:** 26/10/2026  
**Uso:** especificação funcional e técnica para implementação no projeto existente  
**Prioridade principal:** `/entre-para-guilda`  
**Páginas relacionadas:** `/`, seleção de planos, autenticação, checkout e cartões de kits avulsos.

## 1. Resultado esperado

Facilitar a contratação para quem já decidiu comprar e manter o WhatsApp como caminho de ajuda e comunidade. Apresentar claramente a primeira caixa, o conteúdo dos planos, o frete e o prazo. Medir o caminho até o primeiro pagamento confirmado.

**Métrica principal:** novos assinantes únicos com primeiro pagamento aprovado, por origem e por variante da página.

**Métricas auxiliares:** seleção de plano, consulta de frete, início real de checkout, clique no WhatsApp, cadastro concluído, falha de pagamento e tempo até a primeira compra.

Uma redução de entradas no grupo não deve ser tratada como piora se houver aumento de assinaturas com contribuição positiva. Clique no WhatsApp, entrada no grupo, cadastro e pagamento são ações diferentes.

### 1.1. Evidências que orientam o trabalho

- Na campanha de leads, entre os dias 1 e 25, o gasto passou de R$ 522,15 em setembro para R$ 503,46 em outubro. Os leads registrados caíram de 106 para 54 e o CPL passou de R$ 4,93 para R$ 9,32.
- A rota de captação dos anúncios é `/entre-para-guilda`, que direciona os visitantes ao grupo e não oferece contratação direta nos cartões dos planos.
- A página da Guilda e os anúncios mantêm mensagens de fundador e acesso antecipado cuja vigência precisa ser conferida.
- Foram consultadas 117 compras atribuídas e zero eventos de início de checkout no intervalo de 09/06 a 25/10. Isso exige auditoria de eventos; não comprova ausência de checkouts reais.
- Na home, a seção da próxima caixa contém texto interno, e o CTA promete um conteúdo diferente do destino.

Essas observações são de 26/10/2026. Não presumir que versões históricas da página eram iguais à atual nem que todos os problemas causaram a queda comercial.

## 2. Instruções para quem vai implementar

1. Inspecionar o repositório, as instruções do projeto, o framework, as rotas, os componentes e as integrações existentes antes de editar.
2. Localizar as fontes atuais de preços, conteúdo dos kits, temas, fotos, frete, autenticação e pagamentos.
3. Reutilizar componentes, serviços e padrões existentes. Os nomes de componentes e eventos deste documento são sugestões de contrato, não arquivos ou funções já confirmados no projeto.
4. Preservar a identidade DungeonBox: logotipo, estética de RPG, fundo escuro, destaque laranja e fotografias reais.
5. Aplicar conteúdo e comportamento funcionais. Nenhum bloco pode depender de texto ilustrativo, preço fictício ou botão sem destino.
6. Separar implementações independentes: apresentação, navegação, frete e eventos. Uma integração indisponível não deve impedir a página de apresentar os planos e os canais de ajuda.
7. Não trocar provedor de pagamento, stack, preços ou regras comerciais para executar esta especificação.
8. Registrar os arquivos alterados, as verificações executadas e qualquer dado comercial que permaneça sem confirmação.

**Escopo autorizado por este documento:** orientar a implementação do site. Alterações em campanhas, públicos, orçamento de anúncios e envio de mensagens a clientes ficam fora deste escopo.

## 3. Ordem de implementação

| Prioridade | Entrega | Condição de conclusão |
|---|---|---|
| P0 | Auditar eventos atuais | Identificar onde e quando Lead, checkout e compra disparam, sem duplicação e sem mudar silenciosamente os sinais existentes. |
| P0 | Revisar a página da Guilda | Produto, primeira caixa e contratação acessíveis sem obrigar entrada no grupo. |
| P0 | Corrigir mensagens e destinos | Remover texto interno, conferir promessas e fazer cada CTA cumprir seu rótulo. |
| P0 | Explicar o conteúdo dos planos | Diferenciais principais visíveis; miniaturas e clipes tratados corretamente. |
| P1 | Antecipar frete e prazo | Cliente consegue estimar total e entrega antes de concluir cadastro/compra. |
| P1 | Melhorar continuidade da autenticação | Plano e contexto da compra preservados no acesso e no cadastro. |
| P1 | Padronizar rastreamento de origem | Origem vinculada à jornada e ao pagamento quando tecnicamente disponível e permitido. |
| P1 | Validar versão móvel | Sem sobreposições, controles inacessíveis ou comparação de planos confusa. |
| P2 | Testar a nova rota de compra | Comparação por coorte e primeiro pagamento, com condições do teste registradas. |

P0 e P1 podem ser entregues em etapas pequenas. Não condicionar correções de texto ou acessibilidade à existência de uma plataforma de experimentação.

## 4. Fluxo de navegação desejado

### 4.1. Para quem quer comprar

1. Ver o produto e entender que é uma assinatura de cenários físicos.
2. Conferir qual caixa receberá primeiro.
3. Comparar os planos e selecionar um.
4. Consultar o frete e o prazo ou acessar essa informação com o mínimo de etapas.
5. Entrar/criar conta, se exigido pelo sistema, com o plano preservado.
6. Revisar pedido, modalidade e cobrança.
7. Informar pagamento e receber confirmação real do resultado.

### 4.2. Para quem precisa de orientação

1. Acessar a mesma apresentação do produto e dos planos.
2. Acionar `Tirar dúvidas no WhatsApp`.
3. Abrir o atendimento individual com contexto do plano, quando houver seleção.

### 4.3. Para quem quer acompanhar a comunidade

1. Encontrar o bloco específico da Guilda.
2. Acionar `Entrar na Guilda gratuita`.
3. Abrir o convite do grupo configurado no sistema.

**Regra:** atendimento individual e convite de grupo devem ser botões diferentes, com destinos, rótulos e eventos próprios.

## 5. Página `/entre-para-guilda`

Manter a URL existente para preservar links dos anúncios. A proposta é tornar a página útil tanto para contratar quanto para conhecer a comunidade.

### 5.1. Ordem das seções

1. Cabeçalho e apresentação principal.
2. Fotografias reais e demonstração de encaixe.
3. Primeira caixa.
4. Como funciona.
5. Comparação de planos.
6. Frete e prazo, integrado à seleção de plano quando possível.
7. Depoimentos de clientes.
8. Guilda e atendimento.
9. Perguntas frequentes.
10. Chamada final e rodapé.

Em telas pequenas, o botão da apresentação principal deve permitir ir diretamente aos planos, sem percorrer todas as seções intermediárias.

### 5.2. Cabeçalho

- Logo com link para a página inicial.
- Navegação: `O kit`, `Como funciona`, `Planos`, `Dúvidas`.
- Botão de maior destaque: `Escolher meu plano`, com destino para `#planos` desta página.
- Acesso à conta como ação secundária.
- No celular, menu simples, operável por teclado e com rótulo acessível.

### 5.3. Apresentação principal: texto proposto

**Identificação curta:**

> Assinatura mensal de cenários 3D para RPG

**Título:**

> Dê vida à sua próxima sessão de RPG.

**Descrição:**

> Receba cenários físicos com pisos, paredes e acessórios para montar sua dungeon. As peças usam encaixes OpenLOCK e permitem combinar os kits da sua coleção.

**Preço de entrada:**

> Planos a partir de R$ 89/mês + frete.

O preço deve vir do catálogo, não de uma segunda constante exclusiva do texto. Se o preço mudar, a frase precisa acompanhar a mesma fonte.

**Botões:**

- Principal: `Escolher meu plano` → `#planos`.
- Secundário: `Tirar dúvidas no WhatsApp` → atendimento individual.

**Informações de apoio:**

- Produto físico entregue em casa.
- Peças modulares com encaixe OpenLOCK.
- Produção sob demanda; prazo informado antes da compra.

Se a modalidade exibida for mensal, pode aparecer `Cobrança mensal. Cancele conforme as condições do plano.` Usar a regra comercial já aprovada e evitar aplicar a mesma promessa automaticamente a combos.

**Imagem/vídeo:**

- Mostrar o kit real montado em tamanho suficiente para entender os detalhes.
- Preferir a imagem do conteúdo que será vendido, com dados ou miniatura para escala.
- A imagem principal deve continuar funcionando sem reprodução de vídeo.
- Se houver vídeo, oferecer pausa e respeitar preferências de redução de movimento.
- Evitar que mãos ou miniaturas escondam a maior parte do cenário no recorte móvel.

**Critérios de aceite:**

- Um visitante entende que recebe peças físicas e que a compra é recorrente.
- O botão principal está visível e funcional no celular.
- Não há promessa de entrega imediata ou de recebimento antes da próxima sessão.
- Não há obrigatoriedade de entrar no grupo para acessar os planos.

### 5.4. Prova visual do produto

Exibir inicialmente três informações, sem depender de abrir seis abas:

1. Conteúdo da caixa com as peças separadas.
2. O mesmo kit montado na mesa.
3. Close ou vídeo curto mostrando o encaixe.

**Título proposto:**

> Veja o que chega e o que você pode montar.

**Regras das imagens:**

- Identificar tema e plano de cada fotografia.
- Quando a montagem usar mais de um kit, informar isso junto à imagem.
- Quando miniaturas, dados ou pintura forem apenas ilustrativos, informar junto da foto.
- Não usar fotografia de kit pintado como se representasse o acabamento enviado sem explicar a diferença.
- Manter ampliação com botão de fechar, suporte a teclado e retorno de foco ao elemento de origem.

**Aceite:** o cliente consegue distinguir conteúdo incluído, elementos ilustrativos e montagem com múltiplas caixas.

### 5.5. Primeira caixa

Criar um bloco antes dos planos para responder `O que recebo se assinar hoje?`.

**Título:**

> Sua primeira caixa

**Conteúdo obrigatório:**

- Tema inicial efetivamente aplicado a novas assinaturas.
- Foto desse tema.
- O que ele permite montar.
- Como o conteúdo muda por plano.
- Informação sobre acabamento/pintura.
- Prazo de produção e consulta de frete.

**Texto-base, condicionado ao cadastro real:**

> Sua assinatura começa pelo kit [nome do kit inicial]. Escolha o plano e confira o conteúdo da sua primeira caixa antes de concluir a compra.

`[nome do kit inicial]` representa um campo dinâmico, não um texto para publicar. Na auditoria, o FAQ informava início no kit 1, mas a implementação deve conferir essa regra no serviço que cria a assinatura. Não presumir que o tema mensal corrente será a primeira caixa.

Se houver escolha de tema na contratação, refletir essa escolha na foto e no resumo do pedido. Se a troca só for permitida pelo painel antes da produção, explicar exatamente esse fluxo.

**Aceite:** página, criação da assinatura e resumo do pedido apresentam o mesmo tema inicial.

### 5.6. Como funciona

Apresentar três passos curtos:

1. **Escolha seu plano.** Compare o conteúdo e consulte o frete para seu CEP.
2. **Receba sua caixa.** Produzimos o kit após a confirmação do pagamento e informamos o acompanhamento do envio.
3. **Monte e expanda.** Combine as peças para criar encontros e ampliar sua coleção nos próximos ciclos.

Usar os prazos e o acompanhamento realmente suportados pelo sistema. Não prometer postagem automática imediata se a produção é sob demanda.

### 5.7. Planos

Usar uma fonte compartilhada para os cartões da Guilda, home e checkout.

**Valores observados na auditoria, sujeitos ao catálogo:**

| Plano | Preço mensal observado | Quantidade anunciada | Destaque a explicar |
|---|---:|---:|---|
| Aventureiro | R$ 89 | Aproximadamente 60 peças | Conteúdo para começar a montar. |
| Herói | R$ 139 | Aproximadamente 93 peças | Expansão do conteúdo e das possibilidades de montagem. |
| Lendário | R$ 199 | Aproximadamente 132 peças | Conteúdo maior e 3 miniaturas, conforme o kit/plano vigente. |

Confirmar no catálogo se as quantidades incluem clipes e se as miniaturas estão dentro ou fora do total. Exibir essa convenção de maneira consistente. Não somar itens duas vezes para aumentar o número anunciado.

**Cada cartão deve mostrar, sem abrir modal:**

- Nome e preço da modalidade selecionada.
- Foto identificada do plano.
- Principais tipos de peça.
- Quantidade aproximada, com explicação sobre clipes quando aplicável.
- Miniaturas incluídas, quando aplicável.
- Acabamento enviado.
- `+ frete calculado pelo CEP` ou cotação já obtida.
- Botão `Escolher Aventureiro`, `Escolher Herói` ou `Escolher Lendário`.
- Ação secundária `Ver conteúdo completo`.

**Retirar:** comparações baseadas em `1–2 h`, `3–4 h` ou `Campanha` como se a quantidade de peças determinasse a duração da sessão.

Substituir por características verificáveis: conteúdo, área da montagem fotografada e exemplos de configuração. Se a área variar pela montagem, rotular como exemplo, não como limite do kit.

**Destaque do Lendário:**

> Inclui 3 miniaturas

Exibir somente quando confirmado no plano vigente. Usar uma imagem que permita perceber esse diferencial. Manter `Mais comprado` apenas se sustentado pelos dados e com regra de atualização definida.

**Conteúdo completo:**

- Listar itens e quantidades do tema/plano, quando cadastrados.
- Se o conteúdo variar por tema, apresentar o tema correspondente e a indicação de estimativa.
- Não apresentar decorações de um kit específico como benefícios garantidos em todos os meses.
- Descrever a personalização das miniaturas por tema quando não houver personagens fixos garantidos.

**Contratação direta:**

Reutilizar as rotas existentes:

- `/checkout?plan=aventureiro`
- `/checkout?plan=heroi`
- `/checkout?plan=lendario`

Confirmar os identificadores reais no projeto. Caso a aplicação use outro fluxo canônico, reutilizá-lo. Os botões não devem abrir o grupo nem cadastrar uma assinatura automaticamente.

### 5.8. Comparação no celular

- Manter um seletor de planos visível e com o plano ativo claramente indicado.
- Permitir comparar conteúdo e preço em uma tabela compacta ou painel acessível.
- Não depender de swipe sem indicação visual.
- Não selecionar um plano diferente silenciosamente ao alternar assinatura/combo.
- Não esconder diferenciais fundamentais apenas em modais.
- O botão flutuante de WhatsApp não pode cobrir preços, seletores, detalhes ou contratação.

### 5.9. Frete e prazo

**Comportamento desejado:**

1. Informar o CEP.
2. Selecionar ou reaproveitar o plano/tema atual.
3. Consultar o serviço de frete existente.
4. Mostrar custo, produção, transporte e total estimado.

**Estados obrigatórios:** inicial, CEP inválido, carregando, sucesso, sem cobertura e erro temporário.

**Exibição:**

- Plano/modalidade consultados.
- Preço do produto.
- Frete calculado.
- Prazo de produção após pagamento aprovado.
- Estimativa de transporte.
- Total da primeira cobrança, discriminando adicionais quando existirem.

Se o prazo de produção for em dias úteis e o transporte em dias corridos, manter os rótulos separados. Não somar os intervalos como se fossem da mesma unidade.

Recalcular quando o usuário mudar plano, modalidade, tema ou CEP e esses fatores afetarem a cotação. Ignorar respostas antigas que chegarem depois da seleção mais recente.

**Erro de cotação:**

> Não conseguimos calcular o frete agora. Tente novamente ou fale com a equipe.

Não converter erro em frete zero. Não apresentar uma cotação anterior como se valesse para uma nova seleção.

**Se a cotação pública exigir trabalho adicional no backend:** entregar primeiro a informação clara de que o frete é adicional e disponibilizar a consulta no início do checkout, antes de exigir dados desnecessários. Registrar a limitação e evoluir o endpoint com validação de entrada e proteção contra abuso; não inventar valor estimado.

### 5.10. Depoimentos

- Reutilizar avaliações e fotos reais já cadastradas na plataforma.
- Verificar autorização de exibição e consistência com a avaliação original.
- Mostrar nome de exibição permitido, conteúdo e foto quando disponível.
- Atualizar contagem e nota a partir da mesma fonte usada na home.
- Não criar depoimentos, cidades, avaliações ou números para preencher o layout.
- Manter uma boa apresentação mesmo sem foto ou sem quantidade mínima de avaliações.

Se o cadastro de depoimentos não estiver disponível, ocultar o bloco sem dados até integrar a fonte. Não publicar texto de exemplo.

### 5.11. Bloco da Guilda

**Título:**

> Quer acompanhar os próximos kits?

**Texto proposto:**

> Entre na Guilda DungeonBox para acompanhar bastidores, conversar sobre os cenários e receber novidades da coleção. A participação no grupo é gratuita e não exige assinatura.

**Botão:** `Entrar na Guilda gratuita`.

Reutilizar o convite vigente configurado no projeto. Não copiar o link em múltiplos componentes ou em código de analytics.

Remover promessas de acesso antecipado, códigos exclusivos, votação ou condições de fundador que não estiverem ativas. Benefícios vigentes podem continuar, descritos com precisão.

Contadores como `90 mestres` devem ter fonte e rotina de atualização. Se não houver número verificável e atual, remover o contador.

**Atendimento individual:**

- Rótulo: `Tirar dúvidas no WhatsApp`.
- Usar o canal de atendimento já configurado, separado do convite de grupo.
- Texto inicial sugerido: `Olá! Quero conhecer os cenários da DungeonBox.`
- Se o plano estiver selecionado, acrescentar somente o nome do plano.
- Não preencher automaticamente nome, e-mail, endereço ou outros dados pessoais na URL de atendimento.

### 5.12. FAQ

Colocar primeiro as dúvidas que impedem uma compra:

1. Qual caixa eu recebo primeiro?
2. O que vem em cada plano?
3. As peças e miniaturas vêm pintadas?
4. Quanto custa o frete e qual o prazo?
5. Como funciona a cobrança mensal?
6. Como funciona cancelamento, pausa e troca de plano?
7. Preciso entrar no grupo para assinar?
8. As peças de meses diferentes se conectam?
9. Quais miniaturas e sistemas são compatíveis?

**Resposta proposta para o grupo:**

> Não. Você pode escolher seu plano e contratar pelo site. A Guilda é opcional, para quem quer acompanhar novidades e conversar com a comunidade.

Usar essa resposta depois que a contratação direta estiver funcional. As demais respostas devem vir das regras reais e compartilhadas, evitando divergência entre home, Guilda, checkout e termos.

### 5.13. Chamada final

**Título:**

> Escolha o próximo cenário da sua mesa.

**Botões:**

- Principal: `Comparar os planos` → `#planos`.
- Secundário: `Tirar dúvidas no WhatsApp` → atendimento.

Mostrar preço inicial atualizado e indicação de frete. Evitar mais de duas ações concorrentes nesse bloco.

## 6. Ajustes da página inicial `/`

### 6.1. Corrigir a seção da caixa mensal

Remover textos como `revelado pela operação`, `quando a operação confirmar` e qualquer instrução interna.

**Quando o tema estiver confirmado:** mostrar nome, foto, características e conteúdo publicado. O botão `Conhecer o kit` deve levar ao conteúdo desse kit.

**Quando não houver tema confirmado:** ocultar a seção ou mostrar um bloco útil sobre o kit inicial já disponível. Não preencher o espaço com promessa de conteúdo inexistente.

Nunca usar `Ver o que vem na próxima caixa` com destino apenas para os planos. O rótulo precisa corresponder ao conteúdo de destino.

### 6.2. Compartilhar informações com a Guilda

- Mesmo catálogo de planos, preços e quantidades.
- Mesma regra de primeira caixa.
- Mesmo acabamento informado.
- Mesmo prazo de produção.
- Mesmas regras comerciais e de compatibilidade.
- Mesma fonte de avaliações.

Incluir a primeira caixa perto da apresentação dos planos e destacar as miniaturas do Lendário no cartão principal.

### 6.3. Simplificar a comparação

- Remover duração de sessão como benefício do plano.
- Mostrar conteúdo principal sem exigir abertura de modal.
- Manter detalhes adicionais para consulta.
- Explicar quantidade aproximada e variação por tema.
- Aproximar uma prova real de satisfação da região dos planos, sem repetir todas as avaliações.

## 7. Assinatura mensal e combos

Não alterar as condições comerciais. Alterar a clareza da apresentação.

### 7.1. Modalidade mensal

Mostrar preço por mês, cobrança recorrente, frete e regras de cancelamento já aprovadas.

### 7.2. Combos

Mostrar juntos:

- Duração contratada e número de caixas/ciclos incluídos.
- Valor total do pacote.
- Valor equivalente mensal, identificado como equivalência.
- Parcelas efetivamente disponíveis e valor de cada parcela, quando aplicável.
- Condição de frete e sua abrangência.
- Existência de renovação automática e periodicidade do novo pacote.
- Link para as condições específicas do combo.

Não apresentar o equivalente mensal como se fosse o valor cobrado mensalmente. Não trocar seleção de plano ou duração ao navegar entre as modalidades.

Se uma condição comercial não estiver configurada ou confirmada, não inventar a regra. Manter o fluxo atual válido e registrar o ponto para confirmação, sem publicar afirmação nova.

## 8. Autenticação e checkout

### 8.1. Continuidade de contexto

- Preservar plano, modalidade, tema e campanha/origem permitida ao passar por login/cadastro.
- Preservar a cotação ainda válida ou refazê-la com os parâmetros corretos.
- Redirecionar o usuário ao checkout escolhido depois de autenticar.
- Manter um resumo visível do que será contratado quando tecnicamente possível.
- Validar destinos de retorno no servidor para aceitar apenas rotas internas permitidas.
- Nunca confiar em preço recebido por query string; obter o preço autorizado do catálogo no backend.

### 8.2. Entrada para novos compradores

A tela atual prioriza entrar em uma conta existente. Ajustar o texto de contexto:

> Continue para contratar seu plano.

Exibir `Criar conta` e `Já tenho conta` com clareza. Manter os provedores de acesso existentes. Não criar uma segunda implementação de autenticação só para esta página.

Checkout sem conta é uma possibilidade futura, não requisito desta entrega. Não remover a autenticação sem mapear dependências de assinatura, produção e atendimento.

### 8.3. Resumo antes de pagar

Mostrar:

- Plano e modalidade.
- Primeira caixa/tema selecionado.
- Conteúdo principal e acabamento.
- Produto, desconto, frete e adicionais separados.
- Total da cobrança atual.
- Condição e periodicidade da próxima cobrança.
- Prazo de produção e estimativa de transporte.
- Regras aplicáveis e canais de suporte.

### 8.4. Estados de pagamento

Tratar aprovado, aguardando confirmação, recusado e erro técnico de maneira distinta. A tela de retorno não pode afirmar compra aprovada apenas porque o usuário acessou uma URL de sucesso.

## 9. Loja: correção complementar de coerência

### 9.1. Kits avulsos

A mensagem de envio conjunto sem frete adicional só deve aparecer quando o contexto do pedido realmente permitir essa condição.

- Visitante ou comprador avulso: informar frete calculado pelo CEP.
- Assinante com elegibilidade confirmada para envio conjunto: mostrar a condição válida.
- Sem elegibilidade confirmada: não prometer frete zero.

Substituir descrições genéricas repetidas por conteúdo do tema/plano selecionado. O preço de assinante só deve ser aplicado no backend depois de verificar elegibilidade.

### 9.2. Campos por categoria

Não aplicar automaticamente escala de miniatura e encaixe OpenLOCK a todo produto. Em torre de dados, por exemplo, priorizar dimensões, material, acabamento e dados compatíveis, conforme o cadastro real.

## 10. Fonte única de conteúdo e componentes

### 10.1. Contrato conceitual de dados

Adaptar este modelo aos tipos e serviços do projeto. Não criar um segundo catálogo estático desconectado da produção.

```text
Plan
  id
  name
  availableModalities
  priceByModality
  pieceEstimate
  pieceCountConvention
  includedMiniatures
  highlightsByTheme
  realImageByTheme
  finishDescription

InitialKitRule
  defaultThemeId
  selectableThemes
  changePolicy

Theme
  id
  name
  publicationStatus
  images
  contentByPlan

CommercialConditions
  productionLeadTime
  shippingRules
  renewalRulesByModality
  cancellationRulesByModality

ContactChannels
  supportWhatsApp
  guildInvite
```

O modelo acima não pressupõe que já exista um CMS. Reutilizar a origem atual e acrescentar apenas os campos necessários.

### 10.2. Componentes sugeridos

`ProductHero`, `RealKitGallery`, `InitialKitSection`, `HowItWorks`, `PlanComparison`, `ShippingEstimate`, `VerifiedReviews`, `GuildSection`, `PurchaseFAQ`, `PurchaseSummary` e um adaptador único de analytics.

Reutilizar os componentes existentes equivalentes. Evitar refazer toda a home se a correção puder ocorrer em componentes compartilhados.

## 11. Eventos e atribuição

### 11.1. Auditoria antes de mudar eventos

Mapear código da aplicação, gerenciador de tags, integrações do pagamento e envio por servidor. Verificar se há eventos duplicados por múltiplas instalações do pixel.

Identificar o gatilho atual de `Lead` antes de alterar seu significado. A campanha de captação ativa depende desse sinal; esta entrega não autoriza alterar a otimização dos anúncios.

### 11.2. Taxonomia interna proposta

Os nomes abaixo são internos. Adaptar à convenção do projeto e manter um mapa único para ferramentas externas.

| Evento interno | Gatilho real | Observação |
|---|---|---|
| `landing_view` | Página comercial carregada em contexto válido. | Incluir rota e variante. |
| `plans_view` | Seção dos planos efetivamente visível. | Evitar disparos repetidos sem mudança de contexto. |
| `plan_select` | Usuário escolhe plano/modalidade. | Não significa assinatura criada. |
| `shipping_quote_success` | Cotação válida retornada. | Não enviar CEP completo em analytics. |
| `checkout_click` | Clique para abrir o fluxo de contratação. | Pode ocorrer antes do login; não equivale a checkout iniciado. |
| `checkout_started` | Checkout real pronto, com seleção válida. | Mapear para `InitiateCheckout` depois de auditar o contrato. |
| `registration_completed` | Conta efetivamente criada. | Login de usuário existente não é novo cadastro. |
| `whatsapp_support_click` | Usuário aciona atendimento. | Não comprova conversa iniciada. |
| `guild_invite_click` | Usuário aciona convite do grupo. | Não comprova entrada no grupo. |
| `subscription_first_payment_approved` | Sistema confirma primeiro pagamento positivo da assinatura. | Resultado principal de aquisição. |
| `subscription_renewal_approved` | Sistema confirma renovação. | Separar da aquisição. |
| `store_payment_approved` | Sistema confirma compra avulsa. | Separar de assinatura. |

Reativações e mudanças de plano precisam de classificação própria se o sistema as suportar. Não classificar automaticamente toda cobrança do tipo aquisição como pessoa nova.

### 11.3. Tratamento do evento Lead

- Documentar a definição e o gatilho atuais.
- Acrescentar eventos específicos de clique de atendimento e convite de grupo.
- Não registrar uma entrada confirmada no grupo a partir de um clique no convite.
- Se houver formulário, só registrar o contato captado depois de recebimento válido, conforme a definição adotada.
- Caso a semântica de Lead precise mudar, preparar migração com comparação e alinhamento da mensuração de mídia. Não interromper ou redefinir silenciosamente o sinal existente.

### 11.4. Checkout iniciado

Disparar ao entrar no checkout real com contexto válido. Não disparar na simples visualização dos planos, no clique de WhatsApp ou na tela de login.

Usar um identificador de tentativa de checkout para controlar duplicação e recarregamento. Diferenciar nova tentativa legítima de repetição causada por renderização, navegação interna ou refresh.

### 11.5. Compra confirmada e deduplicação

- Usar a confirmação confiável do provedor/backend, com validação de autenticidade do evento recebido.
- Não disparar compra em cadastro, seleção de plano, criação de cobrança pendente ou acesso direto à página de sucesso.
- Tornar o processamento idempotente: o mesmo pagamento não pode gerar novas compras ao repetir webhook ou atualizar a tela.
- Quando navegador e servidor enviarem o mesmo evento, compartilhar o identificador estável da transação e o nome correspondente de evento para deduplicação.
- A deduplicação da plataforma não substitui o controle de idempotência do próprio sistema.
- Registrar primeira assinatura, renovação, reativação e loja separadamente no negócio, mesmo quando houver eventos de compra externos já existentes.
- Preservar compatibilidade com a integração atual e documentar mudanças de valor ou de significado.

**Valor:** obter o total aprovado da transação no backend, em BRL, com regra documentada para frete, desconto e adicionais. Não usar o preço exibido na interface como fonte de verdade. Manter também o valor do produto separado para análise de receita de assinatura.

**Combos:** uma compra do pacote não pode gerar novas aquisições por cada parcela ou por cada caixa enviada. Respeitar a regra real de pagamento e o registro canônico do pedido.

Não inventar versão da API, segredo, pixel novo ou endpoint. Reutilizar as integrações existentes e verificar a documentação oficial aplicável antes de ajustar o envio externo.

### 11.6. Parâmetros comuns

```json
{
  "page_path": "/entre-para-guilda",
  "page_variant": "purchase_path_v1",
  "plan_id": "lendario",
  "modality": "monthly",
  "theme_id": "ID_REAL_DO_CATALOGO",
  "cta_position": "plan_card",
  "contact_destination": "support",
  "utm_source": "facebook",
  "utm_medium": "paid_social",
  "utm_campaign": "VALOR_RECEBIDO_NA_ORIGEM"
}
```

Exemplo de esquema, não valores para copiar em produção. Enviar apenas campos aplicáveis e realmente conhecidos. Origem ausente deve continuar desconhecida; não preencher Facebook por padrão.

### 11.7. Origem e jornada

- Capturar UTMs e identificadores de campanha/anúncio que realmente cheguem à página.
- Validar tamanho e formato dos parâmetros e tratar a entrada como dado não confiável.
- Preservar primeira origem conhecida e último contato identificado em campos distintos.
- Preservar origem durante login e retorno ao checkout, respeitando o mecanismo de consentimento vigente.
- Registrar variante da página no checkout/pedido, sem depender só de parâmetro visível na URL.
- Não substituir uma origem conhecida por acesso direto sem parâmetros.
- Não usar dados de URL para autorizar preço, benefício ou acesso a conta.
- Manter assistência do WhatsApp separada da origem de aquisição.

Quando não houver vínculo técnico entre participante do grupo e pedido, manter essa limitação explícita. Não forçar atribuição automática de todas as vendas ao Meta.

### 11.8. Proteção de dados e resiliência

- Não enviar nome, e-mail, telefone, CPF ou endereço em parâmetros de analytics, data layer genérico ou query strings.
- Manter segredos e credenciais de integrações exclusivamente no backend.
- Reutilizar as escolhas de consentimento e os controles existentes; não contorná-los para aumentar contagem.
- Falha de analytics não pode impedir clique, navegação, cotação ou compra.
- Não atrasar a abertura do WhatsApp esperando uma resposta de rastreamento.
- Usar IDs internos opacos para correlação quando permitido, com acesso restrito aos dados operacionais.

## 12. Responsividade, acessibilidade e desempenho

### 12.1. Verificação visual

Validar pelo menos em larguras de 360, 390, 768 e 1440 px. Esses tamanhos são cobertura de teste proposta, não uma obrigação de criar breakpoints adicionais.

- Sem rolagem horizontal involuntária.
- Sem preço, texto ou botão cortados.
- Fonte de leitura confortável e contraste suficiente em fundo escuro.
- Alvos principais de toque com pelo menos 44 px de altura como meta de interface.
- Navegação e modais operáveis por teclado, com foco visível.
- Rótulos de formulário e mensagens de erro associados aos controles.
- Cabeçalho fixo não encobre títulos ao navegar por âncoras.
- Botão de WhatsApp e barra de planos não cobrem conteúdo nem ações.
- Respeitar área segura do celular e a abertura do teclado virtual.

### 12.2. Imagens e vídeo

- Usar formatos e tamanhos responsivos suportados pelo projeto.
- Informar dimensões para reservar espaço e evitar deslocamentos.
- Priorizar a imagem principal e carregar imagens inferiores sob demanda.
- Não carregar todos os arquivos de um carrossel em resolução máxima na abertura.
- Ter imagem de capa leve para vídeo e não depender de autoplay para entender a oferta.
- Evitar bibliotecas pesadas novas para efeitos simples.
- Não esconder texto ou CTA essencial atrás de animação de entrada.

### 12.3. Metas propostas de experiência

Buscar LCP até 2,5 s, INP até 200 ms e CLS até 0,1 no percentil 75 de dados reais, quando houver volume suficiente. Essas são metas de qualidade, não medições já realizadas no site.

Registrar uma linha de base antes/depois. Testes de laboratório ajudam a detectar regressões, mas não comprovam sozinhos o atendimento das metas em uso real. Conferir especialmente a navegação pelo navegador interno do Instagram.

## 13. Plano de validação

### 13.1. Conteúdo e navegação

- [ ] Primeira caixa exibida é a mesma aplicada à assinatura.
- [ ] Tema ainda não publicado não aparece como oferta confirmada.
- [ ] Nenhum texto interno ou placeholder está visível.
- [ ] Todos os botões cumprem o rótulo.
- [ ] Contratação não exige entrada no grupo.
- [ ] Grupo e atendimento individual têm destinos diferentes e corretos.
- [ ] Preços, conteúdo e regras são iguais em Guilda, home e checkout.
- [ ] Miniaturas e clipes não são contados duas vezes.
- [ ] Fotografias identificam elementos ilustrativos e montagens com mais de um kit.
- [ ] Conteúdo de combos não confunde total, parcela e equivalente mensal.

### 13.2. Jornadas funcionais

| Caso | Resultado esperado |
|---|---|
| Visitante escolhe um plano | Segue ao fluxo correto sem abrir WhatsApp. |
| Visitante precisa criar conta | Retorna ao mesmo plano/modalidade/tema. |
| Usuário já autenticado | Continua sem repetir cadastro desnecessariamente. |
| Troca de plano após cotação | Cotação e total refletem a nova seleção. |
| CEP inválido | Mensagem clara; nenhum valor fictício é exibido. |
| Serviço de frete indisponível | Erro recuperável; não há promessa de frete grátis. |
| Pagamento pendente ou recusado | Estado correto; não gera aquisição aprovada. |
| Webhook aprovado repetido | Um único pagamento e evento de negócio. |
| Página de sucesso recarregada | Nenhuma compra adicional. |
| Navegador com analytics bloqueado | Compra e canais de contato continuam funcionando. |
| Rejeição de consentimento | Respeitada, sem contorno pelo servidor. |
| Navegação móvel pelo Instagram | CTAs, autenticação e retorno funcionam. |

### 13.3. Eventos

- [ ] Clique de checkout não é confundido com checkout iniciado.
- [ ] Início real de checkout aparece no diagnóstico da integração e no registro interno apropriado.
- [ ] Compra só é enviada após aprovação verificada.
- [ ] Mesmo pagamento não duplica por frontend, servidor ou retry.
- [ ] Lead tem definição registrada e gatilho auditado.
- [ ] Clique no convite não aparece como membro confirmado do grupo.
- [ ] Renovações, parcelas de combo e loja não aumentam o contador de novos assinantes.
- [ ] Origem conhecida sobrevive à autenticação.
- [ ] Origem desconhecida não é preenchida artificialmente.
- [ ] Valores enviados coincidem com a regra da transação aprovada.
- [ ] Nenhum dado pessoal sensível aparece em URL ou evento genérico.

Para validar pagamentos, usar os mecanismos de teste/sandbox disponíveis no projeto. Não criar cobrança real de cliente só para testar rastreamento.

## 14. Medição depois da publicação

### 14.1. Painel mínimo

| Métrica | Definição |
|---|---|
| Visitantes por rota/variante | Pessoas/sessões segundo uma definição consistente e documentada. |
| Seleção de plano | Interações válidas por plano e modalidade. |
| Checkout iniciado | Tentativas reais, com deduplicação definida. |
| Primeiro pagamento de assinatura | Pessoa única com primeiro pagamento aprovado. |
| Cliques de atendimento | Separados dos cliques de convite da Guilda. |
| Receita de aquisição | Separada de renovação, loja e recebimentos de combos. |
| Conversão D7/D14 | Pagamentos vinculados aos visitantes/leads daquela mesma coorte e janela. |

### 14.2. Teste proposto

Se houver capacidade para experimento controlado, comparar a página atual com a variante que apresenta contratação direta. Manter o visitante na mesma variante ao longo da jornada e registrar a variante no pedido.

O desfecho principal é primeiro pagamento aprovado. Acompanhar falhas de pagamento, pedidos de suporte, carga de atendimento, margem e cancelamentos iniciais como proteções contra uma melhoria apenas aparente.

Sem alocação aleatória, apresentar o resultado como comparação observacional, não como prova causal. Registrar mudanças de campanha, orçamento, preço, kit ou entrega durante o período.

Revisar em 7 e 14 dias, respeitando o atraso de fechamento pelo WhatsApp. Volume baixo pode exigir mais tempo; não declarar uma variante vencedora por uma ou duas compras.

## 15. Entregáveis da implementação

1. Código das alterações nas rotas e componentes afetados.
2. Conteúdo final aplicado a partir do catálogo e regras reais.
3. Mapa de eventos com gatilhos, responsáveis e controle de duplicação.
4. Registro das verificações funcionais e visuais, com screenshots de desktop e celular no fluxo do projeto.
5. Comparação de desempenho antes/depois, quando disponível.
6. Relação de pendências comerciais ou técnicas específicas, sem substituí-las por suposições.
7. Resumo do que mudou e como acompanhar o resultado.

Não considerar a entrega concluída apenas porque os componentes foram criados: a jornada de escolha de plano até o resultado do pagamento precisa estar integrada e verificada no ambiente adequado.

## 16. Confirmações de conteúdo para preencher durante o trabalho

| Informação | Fonte a consultar | Tratamento se faltar |
|---|---|---|
| Tema inicial de novas assinaturas | Serviço de assinatura/catálogo | Não prometer tema atual automaticamente. |
| Composição de cada kit | Catálogo/produção | Usar apenas conteúdo confirmado. |
| Inclusão de clipes e miniaturas no total | Cadastro técnico do kit | Não somar novamente; esclarecer convenção. |
| Acabamento e pintura | Produção/catálogo | Não prometer pintura ou primer sem confirmação. |
| Benefícios atuais de fundador/Guilda | Configuração comercial vigente | Remover promessa não confirmada. |
| Número de membros e avaliações | Fonte atualizada | Omitir contagem sem fonte. |
| Frete de combos e envio conjunto | Serviço de frete/regras do pedido | Não exibir frete zero por padrão. |
| Renovação e cancelamento de combos | Condições comerciais existentes | Não escrever condição nova. |

Esta tabela organiza o preenchimento de dados. Não exige interromper tarefas independentes nem pedir confirmação para cada ajuste de interface.

## 17. Referências

- Auditoria visual de `/` e `/entre-para-guilda`, realizada nesta conversa em 26/10/2026.
- Consulta da conta DungeonBox no Meta Ads pelo Windsor.ai em 26/10/2026, com desempenho até 25/10 e histórico de status até 26/10.
- Relatórios produzidos: `DungeonBox_Diagnostico_e_Plano_90_Dias_2026-10-26.pdf` e `DungeonBox_Analise_Meta_Ads_2026-10-26.pdf`.
- Google Search Central, Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals?hl=pt-br — consultado em 26/10/2026.
- Meta Pixel, referência oficial: https://developers.facebook.com/documentation/meta-pixel/reference
- Meta Conversions API, deduplicação: https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events

As referências da Meta orientam a verificação técnica da integração existente. Confirmar os detalhes na documentação aplicável ao projeto antes de implementar chamadas específicas; parte do conteúdo restringiu a leitura automatizada durante a pesquisa.
