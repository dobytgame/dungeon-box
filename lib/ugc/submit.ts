import type { SupabaseClient } from '@supabase/supabase-js';
import {
  UGC_CONSENT_CONTENT_VERSION,
  UGC_CONSENT_GUILDA_VERSION,
  UGC_CONSENT_LIKENESS_VERSION,
  UGC_CONSENT_REWARD_VERSION,
} from '@/lib/ugc/consent';
import { UGC_MAX_FILES } from '@/lib/ugc/constants';
import { normalizeInstagramHandle } from '@/lib/ugc/instagram';
import {
  UGC_FIRST_3D,
  UGC_LIKED_MOST,
  UGC_PLAYER_COUNTS,
  UGC_RPG_EXPERIENCE,
  UGC_RPG_SYSTEMS,
  UGC_SESSION_TYPES,
  type UgcFirst3d,
  type UgcLikedMost,
  type UgcPlayerCount,
  type UgcRpgExperience,
  type UgcRpgSystem,
  type UgcSessionType,
} from '@/lib/ugc/options';
import { userCanSubmitUgc } from '@/lib/ugc/access';
import type {
  UgcCreditPreference,
  UgcMediaInput,
  UgcPeopleVisibility,
} from '@/lib/ugc/types';

const MIN_CONTEXT = 20;
const MAX_CONTEXT = 2000;
const MAX_LONG = 2000;
const MAX_SHORT = 400;

const RPG_SYSTEMS = new Set<string>(UGC_RPG_SYSTEMS.map((item) => item.value));
const PLAYER_COUNTS = new Set<string>(UGC_PLAYER_COUNTS.map((item) => item.value));
const SESSION_TYPES = new Set<string>(UGC_SESSION_TYPES.map((item) => item.value));
const LIKED = new Set<string>(UGC_LIKED_MOST.map((item) => item.value));
const EXPERIENCE = new Set<string>(UGC_RPG_EXPERIENCE.map((item) => item.value));
const FIRST_3D = new Set<string>(UGC_FIRST_3D.map((item) => item.value));

export type SubmitUgcInput = {
  userId: string;
  instagram?: string | null;
  rpgSystem: UgcRpgSystem;
  rpgSystemOther?: string | null;
  playerCount: UgcPlayerCount;
  sessionType: UgcSessionType;
  sessionTypeOther?: string | null;
  kitThemeIds: string[];
  kitOther?: string | null;
  context: string;
  momentHighlight?: string | null;
  tableReaction?: string | null;
  likedMost?: UgcLikedMost[];
  likedMostOther?: string | null;
  highlight?: string | null;
  rpgExperience?: UgcRpgExperience | null;
  first3dSet?: UgcFirst3d | null;
  peopleVisible: UgcPeopleVisibility;
  creditPreference: UgcCreditPreference;
  consentContent: boolean;
  consentLikeness: boolean;
  consentReward: boolean;
  consentGuilda: boolean;
  media: UgcMediaInput[];
};

function inSet<T extends string>(value: string, set: Set<string>): value is T {
  return set.has(value);
}

async function validateKitThemeIds(
  admin: SupabaseClient,
  ids: string[]
): Promise<string[] | { error: string }> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) {
    return { error: 'Selecione pelo menos um kit que aparece nas fotos.' };
  }

  const { data, error } = await admin
    .from('store_kit_themes')
    .select('id')
    .in('id', unique)
    .eq('is_active', true);

  if (error) {
    console.error('[ugc] validateKitThemeIds:', error.message);
    return { error: 'Não foi possível validar os kits.' };
  }

  if ((data ?? []).length !== unique.length) {
    return { error: 'Um ou mais kits selecionados não são válidos.' };
  }

  return unique;
}

export async function submitUgcSubmission(
  admin: SupabaseClient,
  input: SubmitUgcInput
): Promise<{ submissionId: string } | { error: string }> {
  const canSubmit = await userCanSubmitUgc(admin, input.userId);
  if (!canSubmit) {
    return { error: 'A campanha é para assinantes com plano ativo.' };
  }

  if (!inSet<UgcRpgSystem>(input.rpgSystem, RPG_SYSTEMS)) {
    return { error: 'Selecione o sistema da mesa.' };
  }
  const rpgSystemOther = input.rpgSystemOther?.trim() || '';
  if (input.rpgSystem === 'outro_rpg' && !rpgSystemOther) {
    return { error: 'Informe qual RPG vocês jogaram.' };
  }

  if (!inSet<UgcPlayerCount>(input.playerCount, PLAYER_COUNTS)) {
    return { error: 'Informe quantos jogadores estavam na mesa.' };
  }

  if (!inSet<UgcSessionType>(input.sessionType, SESSION_TYPES)) {
    return { error: 'Selecione o tipo de sessão.' };
  }
  const sessionTypeOther = input.sessionTypeOther?.trim() || '';
  if (input.sessionType === 'outro' && !sessionTypeOther) {
    return { error: 'Descreva o tipo de sessão.' };
  }

  const context = input.context.trim();
  if (context.length < MIN_CONTEXT) {
    return { error: 'Conte um pouco mais sobre a cena (pelo menos 20 caracteres).' };
  }
  if (context.length > MAX_CONTEXT) {
    return { error: 'O contexto da cena é longo demais.' };
  }

  const momentHighlight = input.momentHighlight?.trim() || '';
  const tableReaction = input.tableReaction?.trim() || '';
  const highlight = input.highlight?.trim() || '';
  if (momentHighlight.length > MAX_LONG || tableReaction.length > MAX_LONG) {
    return { error: 'Um dos textos da aventura é longo demais.' };
  }
  if (highlight.length > MAX_SHORT) {
    return { error: 'A frase da aventura é longa demais.' };
  }

  const likedMost = (input.likedMost ?? []).filter((item) => LIKED.has(item));
  const likedMostOther = input.likedMostOther?.trim() || '';
  if (likedMost.includes('outro') && !likedMostOther) {
    return { error: 'Conte o que mais gostaram.' };
  }

  if (input.rpgExperience && !EXPERIENCE.has(input.rpgExperience)) {
    return { error: 'Experiência com RPG inválida.' };
  }
  if (input.first3dSet && !FIRST_3D.has(input.first3dSet)) {
    return { error: 'Resposta inválida sobre cenário 3D.' };
  }

  const instagram = normalizeInstagramHandle(input.instagram);
  if (input.instagram?.trim() && !instagram) {
    return { error: 'Informe um @ do Instagram válido.' };
  }

  if (
    (input.creditPreference === 'instagram' || input.creditPreference === 'both') &&
    !instagram
  ) {
    return { error: 'Informe o Instagram para ser identificado pelo @.' };
  }

  if (input.peopleVisible === 'minors') {
    return {
      error:
        'Não aceitamos envios com crianças ou adolescentes identificáveis nesta campanha.',
    };
  }

  if (!input.consentContent) {
    return { error: 'É preciso autorizar o uso do conteúdo para enviar.' };
  }

  if (input.peopleVisible === 'adults' && !input.consentLikeness) {
    return {
      error: 'Se aparecem pessoas identificáveis, confirme que elas autorizaram o uso da imagem.',
    };
  }

  if (!input.consentReward) {
    return { error: 'Confirme que você leu as condições do brinde.' };
  }

  if (input.consentGuilda !== true && input.consentGuilda !== false) {
    return { error: 'Informe se autoriza o destaque na Guilda.' };
  }

  const kitThemeIds = await validateKitThemeIds(admin, input.kitThemeIds);
  if ('error' in kitThemeIds) return kitThemeIds;

  const media = input.media.filter((item) => item.path);
  if (media.length === 0) {
    return { error: 'Envie pelo menos uma foto ou vídeo da mesa.' };
  }
  if (media.length > UGC_MAX_FILES) {
    return { error: `Envie no máximo ${UGC_MAX_FILES} arquivos.` };
  }

  for (const item of media) {
    if (!item.path.startsWith(`${input.userId}/`)) {
      return { error: 'Arquivo inválido.' };
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('ugc_submissions')
    .insert({
      user_id: input.userId,
      instagram,
      rpg_system: input.rpgSystem,
      rpg_system_other: input.rpgSystem === 'outro_rpg' ? rpgSystemOther : null,
      player_count: input.playerCount,
      session_type: input.sessionType,
      session_type_other: input.sessionType === 'outro' ? sessionTypeOther : null,
      kit_theme_ids: kitThemeIds,
      kit_other: input.kitOther?.trim() || null,
      context,
      moment_highlight: momentHighlight || null,
      table_reaction: tableReaction || null,
      liked_most: likedMost,
      liked_most_other: likedMost.includes('outro') ? likedMostOther : null,
      highlight: highlight || null,
      rpg_experience: input.rpgExperience || null,
      first_3d_set: input.first3dSet || null,
      people_visible: input.peopleVisible,
      credit_preference: input.creditPreference,
      content_status: 'pending',
      reward_status: 'none',
      consent_content_version: UGC_CONSENT_CONTENT_VERSION,
      consent_content_at: now,
      consent_likeness_version:
        input.peopleVisible === 'adults' ? UGC_CONSENT_LIKENESS_VERSION : null,
      consent_likeness_at: input.peopleVisible === 'adults' ? now : null,
      consent_reward_version: UGC_CONSENT_REWARD_VERSION,
      consent_reward_at: now,
      consent_guilda_version: input.consentGuilda ? UGC_CONSENT_GUILDA_VERSION : null,
      consent_guilda_at: input.consentGuilda ? now : null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[ugc] submitUgcSubmission:', error?.message);
    return { error: 'Não foi possível registrar sua aventura.' };
  }

  const { error: mediaError } = await admin.from('ugc_media').insert(
    media.map((item, index) => ({
      submission_id: data.id,
      storage_path: item.path,
      mime_type: item.mimeType || 'image/jpeg',
      byte_size: item.byteSize,
      original_name: item.originalName?.slice(0, 180) || null,
      duration_seconds: item.durationSeconds ?? null,
      sort_order: index,
    }))
  );

  if (mediaError) {
    console.error('[ugc] submitUgcSubmission media:', mediaError.message);
    await admin.from('ugc_submissions').delete().eq('id', data.id);
    return { error: 'Não foi possível salvar as mídias. Tente novamente.' };
  }

  return { submissionId: data.id as string };
}
