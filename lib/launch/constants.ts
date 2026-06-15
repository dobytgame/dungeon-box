export const WHATSAPP_GUILD_URL =
  'https://chat.whatsapp.com/CLXuy5KQo7qDp7o8BbEbJe';

/** Exibe contador de lista de espera só a partir deste número (prova social). */
export const WAITLIST_DISPLAY_MIN = 50;

export const launchCopy = {
  positioningBadge:
    'A primeira assinatura de cenários 3D modulares do Brasil',
  ctaPrimary: 'Entrar na Guilda — Grupo de Fundadores',
  ctaSupport:
    'Grupo exclusivo · Bastidores da produção ao vivo · Desconto de fundador antes do lançamento',
  founderUrgency:
    'O preço de fundador só existe durante o pré-lançamento. Quando abrirmos para o público geral, o valor sobe. Quem entrar agora trava o desconto para sempre.',
  founderUrgencyShort:
    'Preço de fundador só durante o pré-lançamento · Gratuito entrar',
  valueAnchor:
    'Uma miniatura avulsa custa R$ 40. Um kit completo de cenário físico passa de R$ 800. A partir de R$ 89/mês, sua dungeon cresce todo mês — para sempre.',
  testimonialsDisclaimer:
    'Opiniões coletadas de mestres durante o período de desenvolvimento. Produto em pré-lançamento.',
} as const;

export function formatFounderWaitlistCopy(count: number): string {
  return `${count} ${count === 1 ? 'mestre já garantiu' : 'mestres já garantiram'} acesso de fundador`;
}
