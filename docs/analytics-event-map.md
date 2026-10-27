# DungeonBox — mapa de eventos (analytics)

**Atualizado:** 26/10/2026  
**Escopo:** camada interna (`dataLayer`) e integrações Meta documentadas no código.  
**Regra:** não alterar o significado do evento Meta `Lead` sem alinhar campanhas.

## Meta Pixel (browser)

| Evento Meta | Gatilho no código | Arquivo |
|---|---|---|
| `Lead` | Envio do formulário do widget flutuante de WhatsApp (após captura de e-mail) | `lib/analytics/whatsapp-lead.ts` |
| `Purchase` | Confirmação de compra de assinatura (valor e planos validados) | `lib/analytics/meta-pixel.ts` + chamadas pós-pagamento |

**Nota:** clique no convite da Guilda (`chat.whatsapp.com`) **não** dispara `Lead`. Atendimento via `wa.me` com mensagem pré-preenchida (CTAs da LP Guilda) também **não** dispara `Lead` — apenas o widget com formulário.

## Data layer — nomenclatura interna

| Evento | Quando dispara | Duplicação / observação |
|---|---|---|
| `landing_view` | LP Guilda montada (`/entre-para-guilda`) | Uma vez por carga |
| `home_view` | Home v2 montada | `lib/home-v2/analytics.ts` |
| `plans_view` | Seção `#planos` visível (Guilda) | IntersectionObserver, uma vez |
| `plan_selected` / `plan_viewed` | Home v2 — interação com planos | Guilda: use `checkout_click` |
| `checkout_click` | Clique em “Escolher {plano}” na Guilda | Antes do login |
| `begin_checkout` | Clique em plano (home/guild) **ou** entrada no `/checkout` | `sessionStorage` evita duplicar clique + página em 30s |
| `checkout_started` | Home v2 — alias interno no clique do plano | Paralelo a `begin_checkout` |
| `shipping_quote_success` | Cotação pública OK (`/api/shipping/estimate`) | Sem CEP nos parâmetros |
| `whatsapp_support_click` | CTAs “Tirar dúvidas” (wa.me suporte) | Separado de convite |
| `guild_invite_click` | “Entrar na Guilda gratuita” (link do grupo) | Não implica membro |
| `whatsapp_widget_open` | Abrir painel do widget flutuante | |
| `generate_lead` / `whatsapp_lead_submit` | Formulário do widget enviado | Alimenta GTM; Meta `Lead` no submit |
| `purchase` | Pagamento aprovado (e-commerce dataLayer) | Idempotência no backend/webhook |
| `add_shipping_info` / `add_payment_info` | Checkout — etapas | `lib/analytics/data-layer.ts` |

## Checkout autenticado

| Endpoint / componente | Função |
|---|---|
| `POST /api/shipping/quote` | Frete real no checkout (exige login + `addressId`) |
| `CheckoutPageAnalytics` | `begin_checkout` na entrada direta no checkout |
| `StepAddress` | Chama `/api/shipping/quote` |

## Cotação pública (LP)

| Endpoint | Função |
|---|---|
| `POST /api/shipping/estimate` | CEP + plano → mesma tabela `quoteShipping` do checkout; **sem** auth |

## Pendências (P0 spec)

1. Confirmar no GTM quais eventos viram `InitiateCheckout` / `Purchase` no Meta.
2. Validar em produção se compras aparecem no Events Manager e se havia duplicação pixel + CAPI.
3. Documentar valor enviado em `Purchase` vs. total aprovado no backend (frete, desconto, combo).

## Variantes de página

| Rota | `page_variant` |
|---|---|
| `/` (home v2) | `HOME_V2_VARIANT` em `lib/home-v2/content.ts` |
| `/entre-para-guilda` | `purchase_path_v1` (`lib/guild-lp/analytics.ts`) |
