'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { syncAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import {
  normalizePromoCode,
} from '@/lib/checkout/promo-codes';
import { notifyCycleStatusFromRecord } from '@/lib/email/cycle-status-notify';
import { logAdminAction } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/auth';
import type { MarketingAudience } from '@/lib/admin/types';
import { getAdminCycleDetail } from '@/lib/admin/queries';
import { relOne } from '@/lib/dashboard/format';
import type { CycleStatus } from '@/lib/dashboard/types';
import {
  applySubscriptionStatusChange,
  type SubscriptionStatusAction,
} from '@/lib/subscriptions/apply-status-change';
import { backfillActiveSubscriptionCycles } from '@/lib/subscriptions/cycles';
import { canTransitionCycle } from '@/lib/subscriptions/cycle-production';
import {
  activatePartnerSubscription,
  clearSubscriptionPartnerFlag,
} from '@/lib/subscriptions/partner';

function revalidateAdmin() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

export async function shipSubscriptionCycleAction(
  cycleId: string,
  formData: FormData
) {
  const { user, admin } = await requireAdmin();

  const trackingCode = (formData.get('tracking_code') as string)?.trim();
  const carrier =
    (formData.get('carrier') as string)?.trim() || 'Correios';

  if (!trackingCode) {
    return { error: 'Informe o código de rastreio.' };
  }

  const cycle = await getAdminCycleDetail(admin, cycleId);
  if (!cycle) {
    return { error: 'Ciclo não encontrado.' };
  }

  if (!canTransitionCycle(cycle.status, 'shipped')) {
    return {
      error: 'Só é possível enviar ciclos em preparo.',
    };
  }

  const subscription = relOne(
    cycle.subscriptions as
      | { user_id?: string; profiles?: unknown }
      | { user_id?: string; profiles?: unknown }[]
      | null
      | undefined
  );
  const now = new Date().toISOString();

  const { error } = await admin
    .from('subscription_cycles')
    .update({
      status: 'shipped',
      tracking_code: trackingCode,
      carrier,
      shipped_at: now,
      updated_at: now,
    })
    .eq('id', cycleId);

  if (error) {
    return { error: error.message };
  }

  if (subscription?.user_id) {
    const notify = await notifyCycleStatusFromRecord(
      admin,
      {
        cycle_number: cycle.cycle_number,
        status: 'shipped',
        tracking_code: trackingCode,
        carrier,
        estimated_delivery: cycle.estimated_delivery,
        themes: cycle.themes,
        subscriptions: cycle.subscriptions,
      },
      { status: 'shipped' }
    );
    if (!notify.sent) {
      console.warn('[admin] ship email not sent:', notify.reason);
    }
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'cycle.ship',
    entityType: 'subscription_cycle',
    entityId: cycleId,
    metadata: { tracking_code: trackingCode, carrier },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}

export async function syncAsaasSubscriptionAction(subscriptionId: string) {
  const { user, admin } = await requireAdmin();

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, asaas_subscription_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription?.asaas_subscription_id) {
    return { error: 'Assinatura sem ID Asaas para sincronizar.' };
  }

  try {
    const synced = await syncAsaasSubscriptionPayments(
      subscription.asaas_subscription_id
    );

    await logAdminAction(admin, {
      actorId: user.id,
      action: 'subscription.sync_asaas',
      entityType: 'subscription',
      entityId: subscriptionId,
      metadata: { synced },
      ipAddress: await clientIp(),
    });

    revalidateAdmin();
    return {
      success: true as const,
      synced,
    };
  } catch (error) {
    console.error('[admin] sync asaas:', error);
    return { error: 'Falha ao sincronizar com o Asaas.' };
  }
}

export async function syncSubscriptionCyclesAction() {
  const { user, admin } = await requireAdmin();

  const result = await backfillActiveSubscriptionCycles(admin);

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'cycles.backfill',
    entityType: 'subscription_cycles',
    entityId: null,
    metadata: result,
    ipAddress: await clientIp(),
  });

  revalidateAdmin();

  return {
    success: true as const,
    ...result,
  };
}

export async function advanceCycleProductionAction(
  cycleId: string,
  targetStatus: CycleStatus,
  formData?: FormData
) {
  const { user, admin } = await requireAdmin();

  const cycle = await getAdminCycleDetail(admin, cycleId);
  if (!cycle) {
    return { error: 'Ciclo não encontrado.' };
  }

  if (!canTransitionCycle(cycle.status, targetStatus)) {
    return { error: 'Transição de status não permitida.' };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: targetStatus,
    updated_at: now,
  };

  if (targetStatus === 'delivered') {
    updates.delivered_at = now;
  }

  if (targetStatus === 'cancelled') {
    const reason = (formData?.get('cancel_reason') as string)?.trim();
    if (!reason) {
      return { error: 'Informe o motivo do cancelamento.' };
    }
    updates.cancelled_at = now;
    updates.cancel_reason = reason;
  }

  if (targetStatus === 'preparing') {
    const notes = (formData?.get('production_notes') as string)?.trim();
    if (notes) {
      updates.production_notes = notes;
    }
  }

  const { error } = await admin
    .from('subscription_cycles')
    .update(updates)
    .eq('id', cycleId);

  if (error) {
    return { error: error.message };
  }

  const { data: refreshed } = await admin
    .from('subscription_cycles')
    .select(
      `
      cycle_number,
      status,
      tracking_code,
      carrier,
      estimated_delivery,
      cancel_reason,
      themes(name),
      subscriptions(user_id, plans!plan_id(name))
    `
    )
    .eq('id', cycleId)
    .maybeSingle();

  if (refreshed) {
    const notify = await notifyCycleStatusFromRecord(admin, refreshed, {
      status: targetStatus,
    });
    if (!notify.sent) {
      console.warn('[admin] cycle status email not sent:', targetStatus, notify.reason);
    }
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: `cycle.${targetStatus}`,
    entityType: 'subscription_cycle',
    entityId: cycleId,
    metadata: {
      from: cycle.status,
      to: targetStatus,
      cancel_reason:
        targetStatus === 'cancelled'
          ? (formData?.get('cancel_reason') as string)?.trim()
          : undefined,
    },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}

/** @deprecated Use advanceCycleProductionAction */
export async function updateCycleStatusAction(
  cycleId: string,
  status: 'delivered' | 'failed'
) {
  if (status === 'delivered') {
    return advanceCycleProductionAction(cycleId, 'delivered');
  }

  const { user, admin } = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('subscription_cycles')
    .update({ status: 'failed', updated_at: now })
    .eq('id', cycleId);

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'cycle.failed',
    entityType: 'subscription_cycle',
    entityId: cycleId,
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}

function parseIntField(value: FormDataEntryValue | null, label: string) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed)) {
    return { error: `${label} inválido.` } as const;
  }
  return { value: parsed } as const;
}

function parsePlanSlugs(raw: string | null): string[] | null {
  if (!raw?.trim()) return null;
  const slugs = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const invalid = slugs.find(
    (slug) => !PLAN_SLUGS.includes(slug as PlanSlug)
  );
  if (invalid) {
    return null;
  }
  return slugs;
}

export async function adminUpdateSubscriptionStatusAction(
  subscriptionId: string,
  action: SubscriptionStatusAction,
  reason?: string | null
) {
  const { user, admin } = await requireAdmin();

  const result = await applySubscriptionStatusChange(
    admin,
    subscriptionId,
    action,
    { reason }
  );

  if (result.error) {
    return result;
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: `subscription.${action}`,
    entityType: 'subscription',
    entityId: subscriptionId,
    metadata: reason ? { reason } : {},
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}

export async function setSubscriptionPartnerAction(
  subscriptionId: string,
  isPartner: boolean
) {
  const { user, admin } = await requireAdmin();

  const result = isPartner
    ? await activatePartnerSubscription(admin, subscriptionId)
    : await clearSubscriptionPartnerFlag(admin, subscriptionId);

  if (!result.success) {
    return { error: result.error ?? 'Não foi possível atualizar o parceiro.' };
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: isPartner ? 'subscription.partner_enable' : 'subscription.partner_disable',
    entityType: 'subscription',
    entityId: subscriptionId,
    metadata: { is_partner: isPartner },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}

export async function saveThemeAction(themeId: string | null, formData: FormData) {
  const { user, admin } = await requireAdmin();

  const monthNumber = parseIntField(formData.get('month_number'), 'Mês');
  if ('error' in monthNumber) return monthNumber;
  const year = parseIntField(formData.get('year'), 'Ano');
  if ('error' in year) return year;

  const slug = (formData.get('slug') as string)?.trim().toLowerCase();
  const name = (formData.get('name') as string)?.trim();
  if (!slug || !name) {
    return { error: 'Slug e nome são obrigatórios.' };
  }

  const payload = {
    month_number: monthNumber.value,
    year: year.value,
    slug,
    name,
    lore: (formData.get('lore') as string)?.trim() || null,
    emoji: (formData.get('emoji') as string)?.trim() || null,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    is_active: formData.get('is_active') === 'on',
    is_revealed: formData.get('is_revealed') === 'on',
  };

  if (themeId) {
    const { error } = await admin
      .from('themes')
      .update(payload)
      .eq('id', themeId);

    if (error) return { error: error.message };

    await logAdminAction(admin, {
      actorId: user.id,
      action: 'theme.update',
      entityType: 'theme',
      entityId: themeId,
      metadata: { slug },
      ipAddress: await clientIp(),
    });

    revalidateAdmin();
    return { success: true as const, id: themeId };
  }

  const { data, error } = await admin
    .from('themes')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'theme.create',
    entityType: 'theme',
    entityId: data.id,
    metadata: { slug },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const, id: data.id as string };
}

export async function savePromoCodeAction(
  promoId: string | null,
  formData: FormData
) {
  const { user, admin } = await requireAdmin();

  const code = normalizePromoCode((formData.get('code') as string) ?? '');
  if (!code) {
    return { error: 'Informe o código do cupom.' };
  }

  const discountType = formData.get('discount_type') as
    | 'percent'
    | 'fixed'
    | 'free_shipping';
  if (
    discountType !== 'percent' &&
    discountType !== 'fixed' &&
    discountType !== 'free_shipping'
  ) {
    return { error: 'Tipo de desconto inválido.' };
  }

  let discountValue: { value: number };
  if (discountType === 'free_shipping') {
    discountValue = { value: 0 };
  } else {
    const parsed = parseIntField(formData.get('discount_value'), 'Desconto');
    if ('error' in parsed) return parsed;
    discountValue = parsed;

    if (
      discountType === 'percent' &&
      (discountValue.value <= 0 || discountValue.value > 100)
    ) {
      return { error: 'Desconto percentual deve ser entre 1 e 100.' };
    }
  }

  const maxRaw = (formData.get('max_redemptions') as string)?.trim();
  const maxRedemptions = maxRaw ? Number.parseInt(maxRaw, 10) : null;
  if (maxRaw && Number.isNaN(maxRedemptions)) {
    return { error: 'Limite de resgates inválido.' };
  }

  const expiresRaw = (formData.get('expires_at') as string)?.trim();
  const expiresAt = expiresRaw ? new Date(expiresRaw).toISOString() : null;
  if (expiresRaw && Number.isNaN(new Date(expiresRaw).getTime())) {
    return { error: 'Data de expiração inválida.' };
  }

  const planSlugsRaw = (formData.get('plan_slugs') as string)?.trim();
  const planSlugs = planSlugsRaw ? parsePlanSlugs(planSlugsRaw) : null;
  if (planSlugsRaw && !planSlugs) {
    return {
      error: `Planos inválidos. Use: ${PLAN_SLUGS.join(', ')}`,
    };
  }

  const payload = {
    code,
    discount_type: discountType,
    discount_value: discountValue.value,
    includes_free_shipping:
      discountType !== 'free_shipping' &&
      formData.get('includes_free_shipping') === 'on',
    max_redemptions: maxRedemptions,
    expires_at: expiresAt,
    active: formData.get('active') === 'on',
    plan_slugs: planSlugs,
  };

  if (promoId) {
    const { error } = await admin
      .from('promo_codes')
      .update(payload)
      .eq('id', promoId);

    if (error) return { error: error.message };

    await logAdminAction(admin, {
      actorId: user.id,
      action: 'promo.update',
      entityType: 'promo_code',
      entityId: promoId,
      metadata: { code },
      ipAddress: await clientIp(),
    });

    revalidateAdmin();
    return { success: true as const, id: promoId };
  }

  const { data, error } = await admin
    .from('promo_codes')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'promo.create',
    entityType: 'promo_code',
    entityId: data.id,
    metadata: { code },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const, id: data.id as string };
}

export async function duplicatePromoCodeAction(promoId: string) {
  const { user, admin } = await requireAdmin();

  const { data: source } = await admin
    .from('promo_codes')
    .select('*')
    .eq('id', promoId)
    .maybeSingle();

  if (!source) {
    return { error: 'Cupom não encontrado.' };
  }

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `${source.code}-${suffix}`.slice(0, 32);

  const { data, error } = await admin
    .from('promo_codes')
    .insert({
      code,
      discount_type: source.discount_type,
      discount_value: source.discount_value,
      includes_free_shipping: source.includes_free_shipping ?? false,
      max_redemptions: source.max_redemptions,
      expires_at: source.expires_at,
      active: false,
      plan_slugs: source.plan_slugs,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'promo.duplicate',
    entityType: 'promo_code',
    entityId: data.id,
    metadata: { from: source.code, code },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const, id: data.id as string };
}

export async function updatePlanCommercialAction(planId: string, formData: FormData) {
  const { user, admin } = await requireAdmin();

  const priceCents = parseIntField(formData.get('price_cents'), 'Preço');
  if ('error' in priceCents) return priceCents;
  const piecesMin = parseIntField(formData.get('pieces_min'), 'Peças mín.');
  if ('error' in piecesMin) return piecesMin;
  const piecesMax = parseIntField(formData.get('pieces_max'), 'Peças máx.');
  if ('error' in piecesMax) return piecesMax;
  const colorChoices = parseIntField(formData.get('color_choices'), 'Cores');
  if ('error' in colorChoices) return colorChoices;
  const storeDiscount = parseIntField(formData.get('store_discount'), 'Desconto loja');
  if ('error' in storeDiscount) return storeDiscount;
  const sortOrder = parseIntField(formData.get('sort_order'), 'Ordem');
  if ('error' in sortOrder) return sortOrder;

  const freightRegionsRaw = (formData.get('freight_regions') as string)?.trim();
  const freightRegions = freightRegionsRaw
    ? freightRegionsRaw.split(',').map((part) => part.trim()).filter(Boolean)
    : null;

  const payload = {
    name: (formData.get('name') as string)?.trim(),
    description: (formData.get('description') as string)?.trim() || null,
    price_cents: priceCents.value,
    pieces_min: piecesMin.value,
    pieces_max: piecesMax.value,
    color_choices: colorChoices.value,
    store_discount: storeDiscount.value,
    sort_order: sortOrder.value,
    freight_free: formData.get('freight_free') === 'on',
    freight_regions: freightRegions,
    has_vip_group: formData.get('has_vip_group') === 'on',
    has_vote: formData.get('has_vote') === 'on',
    is_active: formData.get('is_active') === 'on',
    accent_color: (formData.get('accent_color') as string)?.trim() || null,
  };

  if (!payload.name) {
    return { error: 'Nome do plano é obrigatório.' };
  }

  const { error } = await admin.from('plans').update(payload).eq('id', planId);

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'plan.update',
    entityType: 'plan',
    entityId: planId,
    metadata: {
      price_cents: payload.price_cents,
      is_active: payload.is_active,
    },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  revalidatePath('/checkout');
  return { success: true as const };
}

export async function previewMarketingCampaignAction(input: {
  subject: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  await requireAdmin();

  const subject = input.subject.trim();
  const title = input.title.trim();
  const body = input.body.trim();

  if (!subject || !title || !body) {
    return { error: 'Preencha assunto, título e conteúdo.' };
  }

  const { marketingBroadcastHtml } = await import(
    '@/lib/email/templates/marketing-broadcast'
  );

  return {
    html: marketingBroadcastHtml({
      subject,
      title,
      body,
      ctaLabel: input.ctaLabel?.trim() || undefined,
      ctaHref: input.ctaHref?.trim() || undefined,
    }),
  };
}

export async function getMarketingAudienceCountAction(audience: MarketingAudience) {
  const { user, admin, profile } = await requireAdmin();
  const { resolveMarketingAudienceEmails } = await import(
    '@/lib/admin/marketing-audience'
  );

  const emails = await resolveMarketingAudienceEmails(
    admin,
    audience,
    profile.email
  );

  return { count: emails.length };
}

export async function sendMarketingCampaignAction(input: {
  subject: string;
  title: string;
  body: string;
  audience: MarketingAudience;
  ctaLabel?: string;
  ctaHref?: string;
  confirm: boolean;
}) {
  const { user, admin, profile } = await requireAdmin();

  if (!input.confirm) {
    return { error: 'Confirme o envio antes de disparar a campanha.' };
  }

  const subject = input.subject.trim();
  const title = input.title.trim();
  const body = input.body.trim();

  if (!subject || !title || !body) {
    return { error: 'Preencha assunto, título e conteúdo.' };
  }

  const { resolveMarketingAudienceEmails } = await import(
    '@/lib/admin/marketing-audience'
  );
  const { sendMarketingBroadcast } = await import(
    '@/lib/email/send-marketing-broadcast'
  );

  const emails = await resolveMarketingAudienceEmails(
    admin,
    input.audience,
    profile.email
  );

  if (!emails.length) {
    return { error: 'Nenhum destinatário encontrado para este público.' };
  }

  const result = await sendMarketingBroadcast(emails, {
    subject,
    title,
    body,
    ctaLabel: input.ctaLabel?.trim() || undefined,
    ctaHref: input.ctaHref?.trim() || undefined,
  });

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'marketing.send',
    entityType: 'marketing_campaign',
    metadata: {
      audience: input.audience,
      subject,
      title,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
    },
    ipAddress: await clientIp(),
  });

  if (result.sent === 0) {
    return {
      error:
        result.errors[0] ??
        'Nenhum e-mail foi enviado. Verifique RESEND_API_KEY e remetente marketing.',
    };
  }

  return {
    success: true as const,
    total: result.total,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors,
  };
}
