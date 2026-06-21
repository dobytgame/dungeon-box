import { sendEmail } from '@/lib/email/send';
import { buildEmailHtml, escapeHtml, greetingName } from '@/lib/email/layout';
import { getSiteUrl } from '@/lib/email/config';

export async function sendPointsExpiringEmail(input: {
  to: string;
  name?: string | null;
  points: number;
  expiresAt: string;
}): Promise<void> {
  const name = greetingName(input.name);
  const expiresLabel = new Date(input.expiresAt).toLocaleDateString('pt-BR');
  const siteUrl = getSiteUrl();

  const html = buildEmailHtml({
    subject: 'Seus pontos DungeonBox expiram em breve',
    preheader: 'Seus pontos de indicação expiram em breve',
    eyebrow: 'Indique e Ganhe',
    headline: 'Pontos expirando em breve',
    paragraphs: [
      `${name}, você tem <strong style="color:#fff;">${input.points} pontos</strong> no programa Indique e Ganhe que expiram em <strong style="color:#fff;">${expiresLabel}</strong>.`,
      'Acesse sua área logada e resgate uma recompensa antes que eles expirem.',
    ],
    cta: { label: 'Ver meus pontos', href: `${siteUrl}/dashboard/indique` },
  });

  await sendEmail({
    role: 'guild',
    to: input.to,
    subject: 'Seus pontos DungeonBox expiram em breve',
    html,
    text: `Olá! Você tem ${input.points} pontos expirando em ${expiresLabel}. Resgate em ${siteUrl}/dashboard/indique`,
    tags: [{ name: 'type', value: 'referral-points-expiring' }],
  });
}

export async function notifyReferralRedemption(input: {
  userEmail: string;
  userName: string;
  rewardLabel: string;
  pointsSpent: number;
  notes?: string | null;
}): Promise<void> {
  const opsEmail = process.env.REFERRAL_OPS_EMAIL ?? process.env.SUPPORT_EMAIL;
  if (!opsEmail) return;

  const html = buildEmailHtml({
    subject: `[Indique e Ganhe] Resgate: ${input.rewardLabel}`,
    preheader: 'Nova solicitação de resgate Indique e Ganhe',
    eyebrow: 'Operações',
    headline: 'Novo resgate de pontos',
    paragraphs: [
      `<strong>Cliente:</strong> ${escapeHtml(input.userName)} (${escapeHtml(input.userEmail)})`,
      `<strong>Recompensa:</strong> ${escapeHtml(input.rewardLabel)}`,
      `<strong>Pontos:</strong> ${input.pointsSpent}`,
      ...(input.notes
        ? [`<strong>Observações:</strong> ${escapeHtml(input.notes)}`]
        : []),
    ],
  });

  await sendEmail({
    role: 'support',
    to: opsEmail,
    subject: `[Indique e Ganhe] Resgate: ${input.rewardLabel}`,
    html,
    text: `Resgate de ${input.userName}: ${input.rewardLabel} (${input.pointsSpent} pts)`,
    tags: [{ name: 'type', value: 'referral-redemption' }],
  });
}
