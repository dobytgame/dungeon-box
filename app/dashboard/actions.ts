'use server';

import { revalidatePath } from 'next/cache';
import type { PlanSlug } from '@/lib/checkout/plans';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { applySubscriptionStatusChange } from '@/lib/subscriptions/apply-status-change';
import {
  cancelPendingSubscriptionUpgrade,
  scheduleSubscriptionUpgrade,
} from '@/lib/subscriptions/upgrade';
import { createClient } from '@/lib/supabase/server';

function revalidateDashboard() {
  revalidatePath('/dashboard', 'layout');
  revalidatePath('/checkout');
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireDashboardUser();

  const full_name = (formData.get('full_name') as string)?.trim() || null;
  const display_name = (formData.get('display_name') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.replace(/\D/g, '') || null;
  const cpf = (formData.get('cpf') as string)?.replace(/\D/g, '') || null;
  const birth_date = (formData.get('birth_date') as string) || null;
  const newsletter = formData.get('newsletter') === 'on';

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      display_name,
      phone,
      cpf,
      birth_date: birth_date || null,
      newsletter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true };
}

export async function saveAddress(formData: FormData) {
  const { supabase, user } = await requireDashboardUser();
  const id = (formData.get('id') as string) || null;

  const payload = {
    user_id: user.id,
    label: (formData.get('label') as string)?.trim() || 'Principal',
    recipient: (formData.get('recipient') as string)?.trim(),
    zip_code: (formData.get('zip_code') as string)?.replace(/\D/g, ''),
    street: (formData.get('street') as string)?.trim(),
    number: (formData.get('number') as string)?.trim(),
    complement: (formData.get('complement') as string)?.trim() || null,
    neighborhood: (formData.get('neighborhood') as string)?.trim(),
    city: (formData.get('city') as string)?.trim(),
    state: ((formData.get('state') as string) || '').toUpperCase().slice(0, 2),
    is_default: formData.get('is_default') === 'on',
  };

  if (payload.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  if (id) {
    const { error } = await supabase
      .from('addresses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return { error: error.message };
    revalidateDashboard();
    return { success: true, id };
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true, id: data.id };
}

export async function deleteAddress(formData: FormData) {
  const { supabase, user } = await requireDashboardUser();
  const id = formData.get('id') as string;
  if (!id) return { error: 'Endereço inválido' };

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true };
}

export async function updateSubscriptionStatus(formData: FormData) {
  const { supabase, user } = await requireDashboardUser();
  const id = formData.get('id') as string;
  const action = formData.get('action') as 'pause' | 'cancel' | 'resume';
  const reason = (formData.get('reason') as string)?.trim() || null;

  if (!id || !action) return { error: 'Dados inválidos' };

  const result = await applySubscriptionStatusChange(supabase, id, action, {
    reason,
    userId: user.id,
  });

  if (result.error) return result;
  revalidateDashboard();
  return { success: true as const };
}

export async function scheduleSubscriptionUpgradeAction(
  subscriptionId: string,
  targetPlanSlug: PlanSlug
) {
  const { supabase, user } = await requireDashboardUser();

  const result = await scheduleSubscriptionUpgrade(
    supabase,
    user.id,
    subscriptionId,
    targetPlanSlug
  );

  if ('error' in result) return result;
  revalidateDashboard();
  return { success: true as const };
}

export async function cancelPendingUpgradeAction(subscriptionId: string) {
  const { supabase, user } = await requireDashboardUser();

  const result = await cancelPendingSubscriptionUpgrade(
    supabase,
    user.id,
    subscriptionId
  );

  if ('error' in result) return result;
  revalidateDashboard();
  return { success: true as const };
}
