# Entregabilidade de e-mail (Resend + DNS)

## Diagnóstico rápido

Se o Resend mostra **Delivered** e o usuário não vê o e-mail:

1. Pedir para checar **Spam / Promoções / Lixeira** e marcar como “Não é spam”.
2. Confirmar se o endereço de Reply-To (`mestre@…`) **recebe** resposta (MX do domínio).
3. Evitar campanhas em massa sem `List-Unsubscribe` (já implementado no app).

`Delivered` = o servidor do destinatário aceitou a mensagem. Depois disso, Gmail/Outlook podem filtrar para spam sem avisar o Resend.

## DNS atual (problema)

| Registro | Situação |
|----------|----------|
| `dungeonbox.com.br` TXT SPF | `v=spf1 -all` |
| `_dmarc.dungeonbox.com.br` | `v=DMARC1; p=reject;` **sem** `rua=` |
| MX raiz | `0 .` (null MX — **não recebe** e-mail) |
| `send.dungeonbox.com.br` | SPF/MX Resend/SES ok |
| `resend._domainkey` | DKIM presente |

O null MX na raiz faz com que `mestre@`, `guilda@`, `privacidade@` etc. **não recebam** correio. Reply-To quebrado prejudica reputação.

## Correção recomendada de DNS

### 1) Recebimento de e-mail (obrigatório)

Configure MX reais (Google Workspace, Microsoft 365 ou outro). Exemplo Google:

```
MX 1  ASPMX.L.GOOGLE.COM.
MX 5  ALT1.ASPMX.L.GOOGLE.COM.
MX 5  ALT2.ASPMX.L.GOOGLE.COM.
MX 10 ALT3.ASPMX.L.GOOGLE.COM.
MX 10 ALT4.ASPMX.L.GOOGLE.COM.
```

Remova o null MX (`0 .`) ao ativar o provedor de caixa de entrada.

Crie caixas (ou aliases) para: `mestre@`, `tesouro@`, `privacidade@`, `taverna@`.

### 2) DMARC com relatório

Substitua `_dmarc.dungeonbox.com.br` por algo como:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@dungeonbox.com.br; ruf=mailto:dmarc@dungeonbox.com.br; fo=1; pct=100; adkim=r; aspf=r
```

Depois que os relatórios estiverem limpos por algumas semanas, pode voltar a `p=reject`.

### 3) SPF na raiz

Mantenha o envio Resend no subdomínio `send.` (já ok). Se o provedor de caixa de entrada exigir SPF na raiz, combine com cuidado, por exemplo:

```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

(ajuste `include:` conforme o provedor de recebimento).

## Configuração no app / Resend

1. Rode a migration `20260807_email_suppressions.sql`.
2. No Resend → Webhooks, aponte para:
   - `https://dungeonbox.com.br/api/webhooks/resend`
   - Eventos: `email.bounced`, `email.complained` (opcional: `email.delivered`)
3. Copie o signing secret para `RESEND_WEBHOOK_SECRET` (Vercel env).
4. Opcional: `EMAIL_UNSUBSCRIBE_SECRET` (se omitido, deriva de `RESEND_API_KEY`).

## O que o código faz agora

- `List-Unsubscribe` + one-click em e-mails de marketing
- Link “Descadastrar” no rodapé
- Audiências de marketing ignoram `newsletter=false` e e-mails em `email_suppressions`
- Webhook grava complaint/hard bounce na tabela de suppressão
