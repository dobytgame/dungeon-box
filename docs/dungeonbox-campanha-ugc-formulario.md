# DungeonBox — Campanha “Mostre sua Aventura”

## 1. Objetivo

Criar uma campanha contínua de conteúdo gerado pelos assinantes (UGC — User Generated Content), incentivando o envio de fotos e vídeos de mesas utilizando os kits DungeonBox.

Os conteúdos poderão ser utilizados pela DungeonBox em:

- Instagram e demais redes sociais;
- Site;
- Anúncios e campanhas de tráfego pago;
- E-mail marketing;
- WhatsApp;
- Materiais promocionais;
- Conteúdos da comunidade/Guilda;
- Depoimentos e provas sociais;
- Campanhas futuras.

### Recompensa

Todo conteúdo enviado e **aprovado pela equipe DungeonBox** poderá receber um brinde especial junto com o próximo kit.

> Importante: o envio do conteúdo não significa aprovação automática nem garante o brinde. A equipe deve analisar o material antes de aprovar.

---

# 2. Conceito da campanha

## “A DungeonBox ganha vida na sua mesa.”

A comunicação deve incentivar o assinante a mostrar situações reais de jogo:

- Mesa montada;
- Batalhas;
- Exploração;
- Encontros com chefes;
- Miniaturas utilizando o cenário;
- Jogadores interagindo com a mesa;
- Momentos espontâneos;
- Reações dos jogadores;
- Detalhes dos kits;
- Momentos marcantes da aventura.

A prioridade é gerar conteúdo que tenha potencial de uso comercial e editorial, e não apenas registros aleatórios dos produtos.

---

# 3. Fluxo do formulário

Fluxo recomendado:

1. Assinante acessa o formulário.
2. Preenche seus dados.
3. Informa detalhes da sessão.
4. Faz upload das fotos e/ou vídeos.
5. Conta o contexto da cena.
6. Concede as autorizações necessárias.
7. Envia.
8. Sistema registra o conteúdo como `PENDENTE`.
9. Equipe DungeonBox analisa.
10. Conteúdo é aprovado ou recusado.
11. Se aprovado, o assinante recebe o brinde no próximo kit.
12. Conteúdos com potencial podem receber classificações adicionais para marketing.

---

# 4. Estrutura do formulário

## Seção 1 — Sobre você

### 4.1 Nome

**Campo:** `nome`  
**Tipo:** texto curto  
**Obrigatório:** Sim

Label:

> Qual é o seu nome?

---

### 4.2 Instagram

**Campo:** `instagram`  
**Tipo:** texto curto  
**Obrigatório:** Não

Label:

> Qual é o seu @ no Instagram?

Placeholder:

```text
@seuinstagram
```

Descrição:

> Se você autorizar, poderemos marcar seu perfil quando compartilharmos seu conteúdo.

---

### 4.3 E-mail

**Campo:** `email`  
**Tipo:** e-mail  
**Obrigatório:** Sim

Label:

> Qual e-mail podemos utilizar para entrar em contato com você?

---

# 5. Seção 2 — Sobre sua mesa

## 5.1 Sistema utilizado

**Campo:** `sistema_rpg`  
**Tipo:** seleção única  
**Obrigatório:** Sim

Opções:

- D&D
- Pathfinder
- Tormenta
- Ordem Paranormal
- Old Dragon
- Outro RPG
- Não era RPG / outro tipo de jogo

Se selecionar `Outro RPG`, exibir:

**Campo:** `sistema_rpg_outro`  
**Tipo:** texto curto  
**Obrigatório:** Condicional

---

## 5.2 Número de jogadores

**Campo:** `quantidade_jogadores`  
**Tipo:** seleção única  
**Obrigatório:** Sim

Opções:

- 1–2
- 3–4
- 5–6
- 7–8
- Mais de 8

---

## 5.3 Kit utilizado

**Campo:** `kits_utilizados`  
**Tipo:** seleção múltipla  
**Obrigatório:** Sim

Opções iniciais:

- Kit 1 — Ruínas
- Kit 2 — Caverna
- Kit 3 — Tumbas
- Mais de um kit
- Outro

> Esta lista deve ser administrável pelo painel para permitir novos kits no futuro sem alteração de código.

---

## 5.4 Tipo de sessão

**Campo:** `tipo_sessao`  
**Tipo:** seleção única  
**Obrigatório:** Sim

Opções:

- Sessão normal da campanha
- Batalha especial
- Encontro com chefe
- Exploração
- One-shot
- Sessão especial
- Outro

---

# 6. Seção 3 — Upload de conteúdo

## 6.1 Fotos e vídeos

**Campo:** `midias`  
**Tipo:** upload múltiplo  
**Obrigatório:** Sim

Descrição exibida ao usuário:

> Você pode enviar fotos e vídeos da sua mesa utilizando a DungeonBox.
>
> 📸 Fotos: prefira imagens bem iluminadas e com a mesa completa ou os detalhes do cenário em destaque.
>
> 🎥 Vídeos: vídeos curtos, preferencialmente verticais, mostrando a mesa, os jogadores, miniaturas ou algum momento da aventura.
>
> 💡 Não precisa editar o vídeo. Nós cuidamos disso!

### Requisitos recomendados

- Máximo de 10 arquivos por envio;
- JPG;
- PNG;
- WEBP;
- MP4;
- MOV;
- Limite de tamanho configurável pelo backend;
- Permitir múltiplos arquivos;
- Armazenar metadados dos arquivos;
- Gerar thumbnails/previews quando possível.

### Recomendação de UX

Após o upload, exibir uma prévia dos arquivos selecionados.

Para imagens:

- Thumbnail;
- Nome;
- Tamanho;
- Remover arquivo.

Para vídeos:

- Thumbnail;
- Nome;
- Duração, se disponível;
- Tamanho;
- Remover arquivo.

---

# 7. Seção 4 — História da aventura

## 7.1 Contexto da cena

**Campo:** `contexto_cena`  
**Tipo:** texto longo  
**Obrigatório:** Sim

Label:

> O que estava acontecendo nessa cena?

Placeholder:

```text
Exemplo: O grupo acabou de entrar nas tumbas procurando o artefato perdido, mas acabou encontrando um grupo de mortos-vivos...
```

Objetivo interno:

Esse campo deve ser utilizado para fornecer contexto à equipe de marketing e facilitar a criação de legendas e conteúdos.

---

## 7.2 Momento mais legal

**Campo:** `momento_marcante`  
**Tipo:** texto longo  
**Obrigatório:** Não

Label:

> Qual foi o momento mais legal dessa sessão?

Descrição:

> Pode ser uma batalha, uma decisão inesperada, uma falha crítica, uma reação da mesa ou qualquer coisa que tenha marcado a sessão.

---

## 7.3 Reação da mesa

**Campo:** `reacao_mesa`  
**Tipo:** texto longo  
**Obrigatório:** Não

Label:

> Como foi a reação da sua mesa ao jogar com a DungeonBox?

Exemplo:

```text
Todo mundo ficou impressionado quando montamos a dungeon...
```

Objetivo:

Coletar depoimentos espontâneos que possam ser utilizados como prova social, desde que estejam autorizados.

---

## 7.4 O que mais gostaram

**Campo:** `o_que_mais_gostou`  
**Tipo:** seleção múltipla  
**Obrigatório:** Não

Opções:

- A possibilidade de montar a dungeon
- Usar o cenário durante o combate
- O visual das peças
- A modularidade
- A interação com as miniaturas
- Criar mapas diferentes
- O tema do kit
- Outro

Se selecionar `Outro`, exibir:

`o_que_mais_gostou_outro`

---

# 8. Seção 5 — Perfil da mesa

## 8.1 Experiência com RPG

**Campo:** `tempo_jogando_rpg`  
**Tipo:** seleção única  
**Obrigatório:** Não

Opções:

- Estou começando agora
- Menos de 1 ano
- 1–3 anos
- 3–5 anos
- Mais de 5 anos

---

## 8.2 Primeiro cenário 3D

**Campo:** `primeiro_cenario_3d`  
**Tipo:** seleção única  
**Obrigatório:** Não

Label:

> Essa é a primeira vez que vocês utilizam um cenário 3D na mesa?

Opções:

- Sim!
- Não, já utilizávamos
- Já tínhamos utilizado algumas vezes

---

# 9. Seção 6 — Autorizações

Esta seção deve ser apresentada de forma clara e separada das perguntas de marketing.

## 9.1 Autorização de uso do conteúdo

**Campo:** `autorizacao_uso_conteudo`  
**Tipo:** seleção única / checkbox obrigatório  
**Obrigatório:** Sim

Texto:

> **Autorização de uso de conteúdo**
>
> Ao enviar este conteúdo, autorizo a DungeonBox a utilizar as fotos e vídeos enviados em seus canais de comunicação e divulgação, incluindo redes sociais, site, anúncios, campanhas publicitárias, materiais promocionais, e-mail, WhatsApp e outros meios de divulgação da marca.

Opções:

- Sim, autorizo
- Não autorizo

### Regra

Se `Não autorizo`:

- Não utilizar o conteúdo em canais públicos/comerciais;
- Permitir que a equipe defina se o envio ainda poderá ser considerado para a recompensa;
- Recomenda-se revisar essa regra com o responsável jurídico antes do lançamento.

---

## 9.2 Autorização de imagem das pessoas

**Campo:** `autorizacao_imagem_pessoas`  
**Tipo:** checkbox  
**Obrigatório:** Sim quando houver pessoas identificáveis

Texto:

> Declaro que tenho autorização das pessoas que aparecem nas fotos e vídeos para que suas imagens sejam utilizadas pela DungeonBox para fins de divulgação e marketing.

Texto complementar:

> Caso apareçam crianças ou adolescentes identificáveis no conteúdo, o envio deverá ser feito somente com autorização de seu responsável legal.

---

## 9.3 Forma de identificação

**Campo:** `forma_identificacao`  
**Tipo:** seleção única  
**Obrigatório:** Não

Label:

> Caso seu conteúdo seja publicado, como você gostaria de ser identificado?

Opções:

- Meu nome
- Meu @ do Instagram
- Nome + Instagram
- Prefiro não ser identificado

---

## 9.4 Destaque da Guilda

**Campo:** `autorizacao_destaque_guilda`  
**Tipo:** seleção única  
**Obrigatório:** Sim

Label:

> Você autoriza a DungeonBox a destacar sua mesa como parte da “Guilda DungeonBox”?

Descrição:

> Podemos utilizar seu conteúdo em publicações como “Mesa da Semana”, destaques da Guilda, reposts e conteúdos especiais da comunidade DungeonBox.

Opções:

- Sim, autorizo
- Não autorizo

---

# 10. Seção 7 — Recompensa

## 10.1 Ciência sobre a recompensa

**Campo:** `ciencia_recompensa`  
**Tipo:** checkbox obrigatório  
**Obrigatório:** Sim

Texto:

> Estou ciente de que o brinde é enviado para conteúdos aprovados pela equipe DungeonBox e será incluído junto com o próximo kit disponível para envio.

---

# 11. Seção 8 — Pergunta final

## 11.1 Frase da aventura

**Campo:** `frase_aventura`  
**Tipo:** texto curto  
**Obrigatório:** Não

Label:

> Se pudesse resumir sua aventura em uma frase, qual seria?

Exemplo:

```text
A pior ideia do grupo foi abrir aquela porta. 😂
```

Objetivo:

Possível utilização em posts, Stories, Reels e campanhas da comunidade.

---

# 12. Tela de conclusão

Após o envio:

```text
⚔️ AVENTURA REGISTRADA!

Sua aventura acaba de entrar para os registros da Guilda DungeonBox. 🏰🎲

Obrigado por compartilhar esse momento com a gente!

Nossa equipe vai analisar o conteúdo enviado e, sendo aprovado, seu brinde será enviado junto com o próximo kit. 🎁

E fique de olho...

👀 Sua mesa pode aparecer nas redes da DungeonBox!

Agora é só voltar para a mesa, rolar os dados e continuar a aventura.

A DungeonBox ganha vida quando chega na sua mesa. ⚔️
```

---

# 13. Regras de aprovação interna

O formulário deve criar o envio inicialmente com status:

```text
PENDENTE
```

A equipe deverá conseguir alterar para:

```text
APROVADO
RECUSADO
```

## Motivos de recusa

Sugestões:

- Qualidade insuficiente;
- Conteúdo não relacionado à DungeonBox;
- Conteúdo inadequado;
- Conteúdo sem autorização necessária;
- Problema com direitos de terceiros;
- Arquivo corrompido;
- Material duplicado;
- Outro.

Campo adicional:

`motivo_recusa`

---

# 14. Classificação interna de marketing

Após a aprovação, o time poderá classificar o conteúdo.

## Tags

### Recompensa

- `BRINDE_PENDENTE`
- `BRINDE_APROVADO`
- `BRINDE_ENVIADO`

### Uso

- `INSTAGRAM`
- `SITE`
- `ANUNCIO`
- `WHATSAPP`
- `EMAIL`
- `MESA_DA_SEMANA`

### Potencial

- `UGC_NORMAL`
- `DESTAQUE`
- `ALTO_POTENCIAL_MARKETING`

### Tipo

- `FOTO`
- `VIDEO`
- `FOTO_E_VIDEO`
- `DEPOIMENTO`

---

# 15. Dashboard administrativo

O painel interno deve permitir visualizar os envios em formato de lista/kanban.

## Colunas sugeridas

```text
┌──────────────┐
│   PENDENTE   │
└──────────────┘
        ↓
┌──────────────┐
│   APROVADO   │
└──────────────┘
        ↓
┌──────────────┐
│ BRINDE ENVIADO│
└──────────────┘
```

Também deve existir o status:

```text
RECUSADO
```

---

# 16. Informações exibidas no painel

Cada envio deve apresentar:

- Nome;
- Instagram;
- E-mail;
- Data do envio;
- Kit utilizado;
- Sistema;
- Quantidade de jogadores;
- Tipo de sessão;
- Miniaturas das mídias;
- Contexto da cena;
- Depoimento;
- Autorizações;
- Status;
- Tags;
- Observações internas.

---

# 17. Critérios para considerar um conteúdo “bom”

A equipe deve priorizar conteúdos que tenham:

### Foto

- Boa iluminação;
- Cenário claramente visível;
- DungeonBox identificável;
- Mesa organizada;
- Boa composição;
- Miniaturas em contexto;
- Pessoas interagindo, quando autorizado.

### Vídeo

- Preferencialmente vertical;
- Imagem estável;
- Boa iluminação;
- 10–30 segundos é uma duração desejável;
- Mostra a mesa em uso;
- Mostra movimento/interação;
- Possui algum momento narrativo ou visual interessante.

### Conteúdo de alto potencial

Priorizar:

- Batalhas;
- Chefes;
- Reações dos jogadores;
- Mesas grandes;
- Cenários muito bem montados;
- Combinações de vários kits;
- Antes/depois da montagem;
- Momentos engraçados;
- Depoimentos espontâneos.

---

# 18. UX — Mensagem antes do upload

Recomenda-se inserir uma pequena dica visual imediatamente antes do campo de upload:

> ### 📸 Quer aumentar as chances de aparecer nas redes?
>
> Grave na vertical, use boa iluminação e mostre a DungeonBox em ação.
>
> Não precisa produzir um vídeo profissional. Queremos ver **a sua aventura de verdade**. 🎲

---

# 19. Dados e estrutura sugerida

Exemplo conceitual:

```json
{
  "id": "uuid",
  "status": "PENDENTE",

  "usuario": {
    "nome": "",
    "email": "",
    "instagram": ""
  },

  "sessao": {
    "sistemas": [],
    "quantidade_jogadores": "",
    "kits_utilizados": [],
    "tipo_sessao": ""
  },

  "conteudo": {
    "arquivos": [],
    "contexto_cena": "",
    "momento_marcante": "",
    "reacao_mesa": "",
    "o_que_mais_gostou": [],
    "o_que_mais_gostou_outro": "",
    "frase_aventura": ""
  },

  "perfil": {
    "tempo_jogando_rpg": "",
    "primeiro_cenario_3d": ""
  },

  "autorizacoes": {
    "uso_conteudo": false,
    "uso_imagem_pessoas": false,
    "destaque_guilda": false,
    "forma_identificacao": ""
  },

  "recompensa": {
    "elegivel": false,
    "status": "PENDENTE",
    "enviado": false
  },

  "marketing": {
    "tags": [],
    "potencial": "",
    "observacoes": ""
  },

  "created_at": "",
  "updated_at": ""
}
```

---

# 20. Regras importantes para desenvolvimento

## Upload

- Validar extensão e MIME type;
- Definir limite de tamanho;
- Permitir múltiplos arquivos;
- Gerar thumbnails;
- Manter arquivos originais;
- Evitar exposição pública direta dos arquivos sem controle de acesso;
- Registrar data/hora do envio.

## Segurança

- Validar uploads no backend;
- Não confiar somente na extensão do arquivo;
- Sanitizar nomes de arquivos;
- Gerar nomes internos únicos;
- Impedir execução de arquivos enviados;
- Aplicar limite de requisições;
- Proteger o formulário contra spam/bots.

## Privacidade

Registrar separadamente:

- Aceite da autorização;
- Data/hora do aceite;
- Versão do texto da autorização;
- Identificação do envio relacionado ao aceite.

Isso permite comprovar qual versão do termo foi aceita pelo usuário.

> Recomenda-se validação jurídica dos textos de autorização antes da publicação da campanha.

---

# 21. Regras de negócio da recompensa

### Ao enviar

```text
status = PENDENTE
recompensa.status = PENDENTE
```

### Ao aprovar

```text
status = APROVADO
recompensa.elegivel = true
recompensa.status = APROVADO
```

### Ao recusar

```text
status = RECUSADO
recompensa.elegivel = false
recompensa.status = RECUSADO
```

### Após inclusão do brinde no pedido

```text
recompensa.status = ENVIADO
recompensa.enviado = true
```

---

# 22. Possível evolução futura

A estrutura deve permitir evoluir a campanha sem precisar refazer o formulário.

Possibilidades:

- “Mesa da Semana”;
- Ranking de participação;
- Destaque dos assinantes;
- Galeria de mesas no site;
- Página pública da Guilda;
- Campanhas temáticas;
- Concursos de montagem;
- Votação da comunidade;
- Recompensas diferentes por tipo de conteúdo;
- Cupom adicional;
- Programa de embaixadores;
- Integração com Instagram;
- Biblioteca interna de UGC para marketing.

---

# 23. Resumo para o time

O objetivo não é simplesmente criar um formulário de upload.

O objetivo é construir uma **base de conteúdo gerado pelos próprios clientes da DungeonBox**, com:

1. Conteúdo visual;
2. Contexto da aventura;
3. Informações sobre a mesa;
4. Depoimentos;
5. Autorizações de uso;
6. Controle de aprovação;
7. Controle da recompensa;
8. Classificação para marketing.

O fluxo deve ser simples para o assinante e completo para a equipe.

### Experiência desejada

```text
ASSINANTE
    ↓
Preenche formulário
    ↓
Envia foto/vídeo
    ↓
Conta a história
    ↓
Autoriza uso
    ↓
━━━━━━━━━━━━━━━━
     DUNGEONBOX
━━━━━━━━━━━━━━━━
    ↓
Equipe analisa
    ↓
Aprova
    ↓
Brinde no próximo kit
    ↓
Conteúdo classificado
    ↓
Instagram / Site / Ads / WhatsApp / E-mail
    ↓
Mais pessoas conhecem a DungeonBox
    ↓
Mais mesas entram para a Guilda
```

## Frase central da campanha

> **A DungeonBox ganha vida quando chega na sua mesa.** ⚔️🏰
