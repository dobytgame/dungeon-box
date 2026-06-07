'use server';

import { revalidatePath } from 'next/cache';
import {
  MP_CONFIGURED,
  updateMpPreapprovalStatus,
  type MpPreapprovalStatus,
} from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';
import { requireDashboardUser } from '@/lib/dashboard/queries';

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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('mp_subscription_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription) return { error: 'Assinatura não encontrada' };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let mpStatus: MpPreapprovalStatus | null = null;

  if (action === 'pause') {
    updates.status = 'paused';
    mpStatus = 'paused';
  } else if (action === 'resume') {
    updates.status = 'active';
    updates.cancelled_at = null;
    updates.cancel_reason = null;
    mpStatus = 'authorized';
  } else if (action === 'cancel') {
    updates.status = 'cancelled';
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = reason;
    mpStatus = 'cancelled';
  }

  if (mpStatus && subscription.mp_subscription_id && MP_CONFIGURED) {
    try {
      await updateMpPreapprovalStatus(
        subscription.mp_subscription_id,
        mpStatus
      );
    } catch (error) {
      console.error('MP preapproval update:', error);
      return {
        error:
          'Não foi possível atualizar a assinatura no Mercado Pago. Tente novamente.',
      };
    }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true };
}
