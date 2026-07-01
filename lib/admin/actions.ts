'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { importAsaasPaymentsForSubscription } from '@/lib/asaas/import-payments';
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
import { consolidateSubscriptionCycles } from '@/lib/subscriptions/cycles';
import {
  canTransitionCycle,
  cycleRollbackFieldClears,
  cycleTransitionErrorMessage,
  isCycleReopenTransition,
  isCycleRollbackTransition,
  parseCycleStatus,
} from '@/lib/subscriptions/cycle-production';
import {
  activatePartnerSubscription,
  clearSubscriptionPartnerFlag,
  grantPartnerPlanForUser,
} from '@/lib/subscriptions/partner';

function revalidateAdmin() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
}

function revalidateCycleBoard() {
  revalidatePath('/admin/ciclos');
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

  const currentStatus = parseCycleStatus(cycle.status);
  if (!currentStatus || !canTransitionCycle(currentStatus, 'shipped')) {
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

  const postSave: Promise<unknown>[] = [
    logAdminAction(admin, {
      actorId: user.id,
      action: 'cycle.ship',
      entityType: 'subscription_cycle',
      entityId: cycleId,
      metadata: { tracking_code: trackingCode, carrier },
      ipAddress: await clientIp(),
    }),
  ];

  if (subscription?.user_id) {
    postSave.push(
      notifyCycleStatusFromRecord(
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
      ).then((notify) => {
        if (!notify.sent) {
          console.warn('[admin] ship email not sent:', notify.reason);
        }
      })
    );
  }

  await Promise.all(postSave);

  revalidateCycleBoard();
  return { success: true as const };
}

export async function syncAsaasSubscriptionAction(subscriptionId: string) {
  const { user, admin } = await requireAdmin();

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      'id, user_id, status, asaas_subscription_id, asaas_customer_id, billing_term, combo_total_cents, combo_installments'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!subscription.asaas_subscription_id && !subscription.asaas_customer_id) {
    return { error: 'Assinatura sem vínculo Asaas para sincronizar.' };
  }

  try {
    const result = await importAsaasPaymentsForSubscription(admin, subscription);

    await logAdminAction(admin, {
      actorId: user.id,
      action: 'subscription.sync_asaas',
      entityType: 'subscription',
      entityId: subscriptionId,
      metadata: {
        mode: 'import_only',
        subscriptionStatus: subscription.status,
        ...result,
      },
      ipAddress: await clientIp(),
    });

    revalidateAdmin();

    if (result.remoteCount === 0) {
      return { error: 'Nenhuma cobrança encontrada no Asaas para esta assinatura.' };
    }

    return {
      success: true as const,
      ...result,
    };
  } catch (error) {
    console.error('[admin] sync asaas:', error);
    return { error: 'Falha ao sincronizar com o Asaas.' };
  }
}

export async function syncSubscriptionCyclesAction() {
  const { user, admin } = await requireAdmin();

  const result = await consolidateSubscriptionCycles(admin);

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'cycles.consolidate',
    entityType: 'subscription_cycles',
    entityId: null,
    metadata: { ...result, mode: 'consolidate_only' },
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

  const parsedTarget = parseCycleStatus(targetStatus);
  if (!parsedTarget) {
    return { error: 'Status de destino inválido.' };
  }

  const { data: cycleRow, error: fetchError } = await admin
    .from('subscription_cycles')
    .select('id, status')
    .eq('id', cycleId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!cycleRow) {
    return { error: 'Ciclo não encontrado.' };
  }

  const currentStatus = parseCycleStatus(cycleRow.status);
  if (!currentStatus) {
    return {
      error: `Status atual do ciclo é inválido (${String(cycleRow.status)}).`,
    };
  }

  if (!canTransitionCycle(currentStatus, parsedTarget)) {
    return {
      error: cycleTransitionErrorMessage(currentStatus, parsedTarget),
    };
  }

  const now = new Date().toISOString();
  const isRollback = isCycleRollbackTransition(currentStatus, parsedTarget);
  const isReopen = isCycleReopenTransition(currentStatus, parsedTarget);
  const updates: Record<string, unknown> = {
    status: parsedTarget,
    updated_at: now,
  };

  if (isRollback || isReopen) {
    Object.assign(updates, cycleRollbackFieldClears(parsedTarget));
  }

  if (parsedTarget === 'delivered') {
    updates.delivered_at = now;
  }

  if (parsedTarget === 'cancelled') {
    const reason = (formData?.get('cancel_reason') as string)?.trim();
    if (!reason) {
      return { error: 'Informe o motivo do cancelamento.' };
    }
    updates.cancelled_at = now;
    updates.cancel_reason = reason;
  }

  if (parsedTarget === 'preparing') {
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

  const postSave: Promise<unknown>[] = [
    logAdminAction(admin, {
      actorId: user.id,
      action: isRollback || isReopen ? 'cycle.rollback' : `cycle.${parsedTarget}`,
      entityType: 'subscription_cycle',
      entityId: cycleId,
      metadata: {
        from: currentStatus,
        to: parsedTarget,
        rollback: isRollback || isReopen,
        cancel_reason:
          parsedTarget === 'cancelled'
            ? (formData?.get('cancel_reason') as string)?.trim()
            : undefined,
      },
      ipAddress: await clientIp(),
    }),
  ];

  if (refreshed && !isRollback && !isReopen) {
    postSave.push(
      notifyCycleStatusFromRecord(admin, refreshed, {
        status: parsedTarget,
      }).then((notify) => {
        if (!notify.sent) {
          console.warn(
            '[admin] cycle status email not sent:',
            parsedTarget,
            notify.reason
          );
        }
      })
    );
  }

  await Promise.all(postSave);

  revalidateCycleBoard();
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

export async function grantPartnerPlanAction(
  userId: string,
  planSlug: PlanSlug
) {
  const { user, admin } = await requireAdmin();

  const result = await grantPartnerPlanForUser(admin, userId, planSlug);
  if (!result.success) {
    return { error: result.error ?? 'Não foi possível conceder o plano parceiro.' };
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'subscription.partner_grant',
    entityType: 'subscription',
    entityId: result.subscriptionId ?? userId,
    metadata: { user_id: userId, plan_slug: planSlug },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const, subscriptionId: result.subscriptionId };
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

export async function previewUnconvertedLeadCampaignAction() {
  await requireAdmin();

  const { unconvertedLeadHtml } = await import(
    '@/lib/email/templates/unconverted-lead'
  );

  return {
    html: unconvertedLeadHtml({ name: 'Mestre' }),
  };
}

export async function getMarketingAudienceCountAction(audience: MarketingAudience) {
  const { user, admin, profile } = await requireAdmin();
  const { resolveMarketingAudienceEmails } = await import(
    '@/lib/admin/marketing-audience'
  );

  const emails = await resolveMarketingAudienceEmails(admin, audience, profile);

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
    profile
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

export async function sendUnconvertedLeadCampaignAction(input: {
  audience: MarketingAudience;
  confirm: boolean;
}) {
  const { user, admin, profile } = await requireAdmin();

  if (!input.confirm) {
    return { error: 'Confirme o envio antes de disparar a campanha.' };
  }

  const { resolveMarketingAudienceRecipients } = await import(
    '@/lib/admin/marketing-audience'
  );
  const { sendUnconvertedLeadCampaign } = await import(
    '@/lib/email/send-unconverted-lead'
  );
  const { UNCONVERTED_LEAD_SUBJECT } = await import(
    '@/lib/email/templates/unconverted-lead'
  );

  const recipients = await resolveMarketingAudienceRecipients(
    admin,
    input.audience,
    profile
  );

  if (!recipients.length) {
    return { error: 'Nenhum destinatário encontrado para este público.' };
  }

  const result = await sendUnconvertedLeadCampaign(recipients);

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'marketing.send',
    entityType: 'marketing_campaign',
    metadata: {
      template: 'unconverted_lead',
      audience: input.audience,
      subject: UNCONVERTED_LEAD_SUBJECT,
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

export async function sendPendingPaymentLinkEmailAction(input: {
  subscriptionId?: string;
  paymentId?: string;
}) {
  const { user, admin } = await requireAdmin();

  if (!input.subscriptionId && !input.paymentId) {
    return { error: 'Informe a assinatura ou o pagamento.' };
  }

  const {
    resolvePendingPaymentLinkForPayment,
    resolvePendingPaymentLinkForSubscription,
  } = await import('@/lib/payments/pending-payment-link');
  const { notifyPendingPaymentLink } = await import(
    '@/lib/email/pending-payment-notify'
  );
  const { relOne } = await import('@/lib/dashboard/format');

  let userId: string | null = null;
  let planName: string | null = null;

  const linkResult = input.paymentId
    ? await resolvePendingPaymentLinkForPayment(admin, input.paymentId)
    : await resolvePendingPaymentLinkForSubscription(
        admin,
        input.subscriptionId!
      );

  if (!linkResult.ok) {
    return { error: linkResult.error.message };
  }

  if (input.paymentId) {
    const { data: payment } = await admin
      .from('payments')
      .select(
        'user_id, subscription_id, subscriptions(plans!plan_id(name))'
      )
      .eq('id', input.paymentId)
      .maybeSingle();

    userId = (payment?.user_id as string | null) ?? null;
    const subscription = relOne(
      payment?.subscriptions as
        | { plans?: { name?: string } | { name?: string }[] | null }
        | null
    );
    const plan = relOne(subscription?.plans as { name?: string } | { name?: string }[] | null);
    planName = plan?.name ?? null;
  } else {
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('user_id, plans!plan_id(name)')
      .eq('id', input.subscriptionId!)
      .maybeSingle();

    userId = (subscription?.user_id as string | null) ?? null;
    const plan = relOne(
      subscription?.plans as { name?: string } | { name?: string }[] | null
    );
    planName = plan?.name ?? null;
  }

  if (!userId) {
    return { error: 'Cliente não encontrado para este pagamento.' };
  }

  const notify = await notifyPendingPaymentLink(admin, {
    userId,
    planName,
    link: linkResult.link,
  });

  if (!notify.sent) {
    return {
      error:
        notify.reason === 'missing_email'
          ? 'Cliente sem e-mail cadastrado.'
          : 'Não foi possível enviar o e-mail. Verifique a configuração do Resend.',
    };
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'payment.send_link',
    entityType: input.paymentId ? 'payment' : 'subscription',
    entityId: input.paymentId ?? input.subscriptionId ?? null,
    metadata: {
      url: linkResult.link.url,
      source: linkResult.link.source,
      amount_cents: linkResult.link.amountCents,
    },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}

function parseMoneyField(value: FormDataEntryValue | null, label: string) {
  const raw = String(value ?? '').trim().replace(',', '.');
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return { error: `${label} inválido.` } as const;
  }
  return { cents: Math.round(parsed * 100) } as const;
}

function parseDateField(value: FormDataEntryValue | null, label: string) {
  const raw = String(value ?? '').trim();
  if (!raw) return { error: `${label} é obrigatória.` } as const;
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { error: `${label} inválida.` } as const;
  }
  return { value: raw } as const;
}

export async function saveFinancialExpenseAction(
  expenseId: string | null,
  formData: FormData
) {
  const { user, admin } = await requireAdmin();

  const categoryId = (formData.get('category_id') as string)?.trim();
  if (!categoryId) {
    return { error: 'Selecione uma categoria.' };
  }

  const description = (formData.get('description') as string)?.trim();
  if (!description) {
    return { error: 'Informe a descrição.' };
  }

  const amount = parseMoneyField(formData.get('amount'), 'Valor');
  if ('error' in amount) return amount;

  const expenseDate = parseDateField(formData.get('expense_date'), 'Data do gasto');
  if ('error' in expenseDate) return expenseDate;

  const status = formData.get('status') as 'pending' | 'paid' | 'cancelled';
  if (status !== 'pending' && status !== 'paid' && status !== 'cancelled') {
    return { error: 'Status inválido.' };
  }

  const paidAtRaw = (formData.get('paid_at') as string)?.trim();
  let paidAt: string | null = null;
  if (status === 'paid') {
    if (paidAtRaw) {
      const parsed = parseDateField(paidAtRaw, 'Data do pagamento');
      if ('error' in parsed) return parsed;
      paidAt = parsed.value;
    } else {
      paidAt = expenseDate.value;
    }
  }

  const vendor = (formData.get('vendor') as string)?.trim() || null;
  const notes = (formData.get('notes') as string)?.trim() || null;

  const payload = {
    category_id: categoryId,
    description,
    amount_cents: amount.cents,
    expense_date: expenseDate.value,
    paid_at: paidAt,
    status,
    vendor,
    notes,
    updated_at: new Date().toISOString(),
  };

  if (expenseId) {
    const { error } = await admin
      .from('financial_expenses')
      .update(payload)
      .eq('id', expenseId);

    if (error) return { error: error.message };

    await logAdminAction(admin, {
      actorId: user.id,
      action: 'finance.expense.update',
      entityType: 'financial_expense',
      entityId: expenseId,
      metadata: { description, amount_cents: amount.cents, category_id: categoryId },
      ipAddress: await clientIp(),
    });

    revalidateAdmin();
    return { success: true as const, id: expenseId };
  }

  const { data, error } = await admin
    .from('financial_expenses')
    .insert({ ...payload, created_by: user.id })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'finance.expense.create',
    entityType: 'financial_expense',
    entityId: data.id,
    metadata: { description, amount_cents: amount.cents, category_id: categoryId },
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const, id: data.id as string };
}

export async function cancelFinancialExpenseAction(expenseId: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('financial_expenses')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId);

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'finance.expense.cancel',
    entityType: 'financial_expense',
    entityId: expenseId,
    ipAddress: await clientIp(),
  });

  revalidateAdmin();
  return { success: true as const };
}
