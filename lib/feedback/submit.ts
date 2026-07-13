import type { SupabaseClient } from '@supabase/supabase-js';
import { userOwnsDeliveredCycle } from '@/lib/feedback/queries';

const MAX_IMAGES = 3;
const MAX_MESSAGE_LENGTH = 2000;

export async function submitUserFeedback(
  admin: SupabaseClient,
  input: {
    userId: string;
    cycleId: string;
    rating: number;
    message?: string | null;
    imagePaths?: string[];
  }
): Promise<{ feedbackId: string } | { error: string }> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { error: 'Selecione uma nota de 1 a 5 estrelas.' };
  }

  const message = input.message?.trim() ?? '';
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { error: 'Mensagem muito longa. Máximo 2.000 caracteres.' };
  }

  const imagePaths = (input.imagePaths ?? []).filter(Boolean);
  if (imagePaths.length > MAX_IMAGES) {
    return { error: `Envie no máximo ${MAX_IMAGES} fotos.` };
  }

  for (const path of imagePaths) {
    if (!path.startsWith(`${input.userId}/`)) {
      return { error: 'Imagem inválida.' };
    }
  }

  const ownsCycle = await userOwnsDeliveredCycle(admin, input.userId, input.cycleId);
  if (!ownsCycle) {
    return { error: 'Ciclo inválido ou ainda não entregue.' };
  }

  const { data: existing } = await admin
    .from('user_feedback')
    .select('id')
    .eq('user_id', input.userId)
    .eq('subscription_cycle_id', input.cycleId)
    .maybeSingle();

  if (existing) {
    return { error: 'Você já enviou feedback para este ciclo.' };
  }

  const { data, error } = await admin
    .from('user_feedback')
    .insert({
      user_id: input.userId,
      subscription_cycle_id: input.cycleId,
      rating: input.rating,
      message: message || null,
      image_paths: imagePaths,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'Você já enviou feedback para este ciclo.' };
    }
    console.error('[feedback] submitUserFeedback:', error.message);
    return { error: 'Não foi possível salvar seu feedback.' };
  }

  return { feedbackId: data.id as string };
}
