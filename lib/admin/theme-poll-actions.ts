'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { logAdminAction } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/auth';
import {
  brazilDateToEndIso,
  brazilDateToStartIso,
  toBrazilDateKey,
} from '@/lib/datetime/brazil';
import { THEME_VOTE_MIN_CYCLE } from '@/lib/theme-votes/types';

function revalidateThemePolls() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

function parseCycleNumber(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed) || parsed < THEME_VOTE_MIN_CYCLE) {
    return {
      error: `O ciclo deve ser um número a partir de ${THEME_VOTE_MIN_CYCLE}.`,
    } as const;
  }
  return { value: parsed } as const;
}

function parseDateKey(value: FormDataEntryValue | null, label: string) {
  const raw = String(value ?? '').trim();
  if (!raw) return { error: `${label} é obrigatória.` } as const;
  const key = toBrazilDateKey(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return { error: `${label} inválida.` } as const;
  }
  return { value: key } as const;
}

function parseOption(formData: FormData, slot: 1 | 2) {
  const name = (formData.get(`option_${slot}_name`) as string)?.trim();
  if (!name) {
    return { error: `Informe o nome do tema ${slot}.` } as const;
  }

  const imageUrl = (formData.get(`option_${slot}_image_url`) as string)?.trim();
  const id = (formData.get(`option_${slot}_id`) as string)?.trim() || null;

  return {
    value: {
      id,
      name,
      image_url: imageUrl || null,
      sort_order: slot,
    },
  } as const;
}

export async function saveThemePollAction(
  pollId: string | null,
  formData: FormData
) {
  const { user, admin } = await requireAdmin();

  const cycleNumber = parseCycleNumber(formData.get('cycle_number'));
  if ('error' in cycleNumber) return cycleNumber;

  const startsOn = parseDateKey(formData.get('starts_on'), 'Data de liberação');
  if ('error' in startsOn) return startsOn;

  const endsOn = parseDateKey(formData.get('ends_on'), 'Data de fim');
  if ('error' in endsOn) return endsOn;

  if (endsOn.value < startsOn.value) {
    return { error: 'A data de fim deve ser posterior à data de liberação.' };
  }

  const option1 = parseOption(formData, 1);
  if ('error' in option1) return option1;
  const option2 = parseOption(formData, 2);
  if ('error' in option2) return option2;

  if (option1.value.name.toLowerCase() === option2.value.name.toLowerCase()) {
    return { error: 'Os dois temas precisam ter nomes diferentes.' };
  }

  const payload = {
    cycle_number: cycleNumber.value,
    starts_at: brazilDateToStartIso(startsOn.value),
    ends_at: brazilDateToEndIso(endsOn.value),
    updated_at: new Date().toISOString(),
  };

  let savedPollId = pollId;

  if (pollId) {
    const { error } = await admin
      .from('theme_polls')
      .update(payload)
      .eq('id', pollId);

    if (error) {
      if (error.code === '23505') {
        return { error: `Já existe uma votação para o ciclo ${cycleNumber.value}.` };
      }
      return { error: error.message };
    }
  } else {
    const { data, error } = await admin
      .from('theme_polls')
      .insert({
        cycle_number: payload.cycle_number,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: `Já existe uma votação para o ciclo ${cycleNumber.value}.` };
      }
      return { error: error.message };
    }

    savedPollId = data.id as string;
  }

  if (!savedPollId) {
    return { error: 'Não foi possível salvar a votação.' };
  }

  for (const option of [option1.value, option2.value]) {
    const optionPayload = {
      poll_id: savedPollId,
      name: option.name,
      image_url: option.image_url,
      sort_order: option.sort_order,
    };

    if (option.id) {
      const { error } = await admin
        .from('theme_options')
        .update({
          name: optionPayload.name,
          image_url: optionPayload.image_url,
        })
        .eq('id', option.id)
        .eq('poll_id', savedPollId);

      if (error) return { error: error.message };
      continue;
    }

    const { error } = await admin.from('theme_options').upsert(optionPayload, {
      onConflict: 'poll_id,sort_order',
    });

    if (error) return { error: error.message };
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: pollId ? 'theme_poll.update' : 'theme_poll.create',
    entityType: 'theme_poll',
    entityId: savedPollId,
    metadata: { cycleNumber: cycleNumber.value },
    ipAddress: await clientIp(),
  });

  revalidateThemePolls();
  return { success: true as const, id: savedPollId };
}
