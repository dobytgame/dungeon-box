import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import { UGC_BUCKET } from '@/lib/ugc/constants';
import type {
  UgcContentStatus,
  UgcCreditPreference,
  UgcPeopleVisibility,
  UgcRewardStatus,
} from '@/lib/ugc/types';
import type { UgcPotential } from '@/lib/ugc/options';
import { isUgcVideoMime } from '@/lib/ugc/constants';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type AdminUgcFilters = {
  q?: string;
  status?: string;
  limit?: number;
};

export type AdminUgcRow = {
  id: string;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  instagram: string | null;
  context: string;
  rpgSystem: string | null;
  contentStatus: UgcContentStatus;
  rewardStatus: UgcRewardStatus;
  rewardCycleId: string | null;
  mediaCount: number;
  usageTags: string[];
  createdAt: string;
};

export type AdminUgcKanbanColumn = 'pending' | 'approved' | 'sent' | 'rejected';

export type AdminUgcMedia = {
  id: string;
  path: string;
  url: string | null;
  originalName: string | null;
  mimeType: string;
  durationSeconds: number | null;
  isVideo: boolean;
};

export type AdminUgcDetail = AdminUgcRow & {
  highlight: string | null;
  kitThemeIds: string[];
  kitLabels: string[];
  kitOther: string | null;
  rpgSystemOther: string | null;
  playerCount: string | null;
  sessionType: string | null;
  sessionTypeOther: string | null;
  momentHighlight: string | null;
  tableReaction: string | null;
  likedMost: string[];
  likedMostOther: string | null;
  rpgExperience: string | null;
  first3dSet: string | null;
  peopleVisible: UgcPeopleVisibility;
  creditPreference: UgcCreditPreference;
  rejectReason: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  consentContentVersion: string;
  consentContentAt: string;
  consentLikenessVersion: string | null;
  consentLikenessAt: string | null;
  consentRewardVersion: string;
  consentRewardAt: string;
  consentGuildaVersion: string | null;
  consentGuildaAt: string | null;
  marketingPotential: UgcPotential | null;
  marketingNotes: string | null;
  rewardCycleNumber: number | null;
  media: AdminUgcMedia[];
};

export type AdminUgcStats = {
  total: number;
  pending: number;
  approved: number;
  sent: number;
  rejected: number;
};

type SubmissionRecord = {
  id: string;
  user_id: string;
  instagram: string | null;
  context: string;
  rpg_system?: string | null;
  rpg_system_other?: string | null;
  player_count?: string | null;
  session_type?: string | null;
  session_type_other?: string | null;
  kit_other?: string | null;
  moment_highlight?: string | null;
  table_reaction?: string | null;
  liked_most?: string[] | null;
  liked_most_other?: string | null;
  rpg_experience?: string | null;
  first_3d_set?: string | null;
  highlight?: string | null;
  kit_theme_ids?: string[] | null;
  usage_tags?: string[] | null;
  marketing_potential?: string | null;
  marketing_notes?: string | null;
  consent_guilda_version?: string | null;
  consent_guilda_at?: string | null;
  people_visible?: UgcPeopleVisibility;
  credit_preference?: UgcCreditPreference;
  content_status: UgcContentStatus;
  reward_status: UgcRewardStatus;
  reward_cycle_id: string | null;
  reject_reason?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  consent_content_version?: string;
  consent_content_at?: string;
  consent_likeness_version?: string | null;
  consent_likeness_at?: string | null;
  consent_reward_version?: string;
  consent_reward_at?: string;
  created_at: string;
  profiles?:
    | {
        full_name?: string | null;
        display_name?: string | null;
        email?: string | null;
      }
    | {
        full_name?: string | null;
        display_name?: string | null;
        email?: string | null;
      }[]
    | null;
  ugc_media?: { id: string; storage_path?: string; original_name?: string | null }[] | null;
  subscription_cycles?:
    | { cycle_number?: number | null }
    | { cycle_number?: number | null }[]
    | null;
};

function mapRow(row: SubmissionRecord): AdminUgcRow {
  const profile = relOne(row.profiles);
  return {
    id: row.id,
    userId: row.user_id,
    customerName: profile?.full_name ?? profile?.display_name ?? null,
    customerEmail: profile?.email ?? null,
    instagram: row.instagram,
    context: row.context,
    rpgSystem: row.rpg_system ?? null,
    contentStatus: row.content_status,
    rewardStatus: row.reward_status,
    rewardCycleId: row.reward_cycle_id,
    mediaCount: row.ugc_media?.length ?? 0,
    usageTags: row.usage_tags ?? [],
    createdAt: row.created_at,
  };
}

async function resolveMatchingUserIds(
  admin: SupabaseClient,
  q: string
): Promise<string[] | null> {
  const term = q.trim();
  if (!term) return null;

  const { data } = await admin
    .from('profiles')
    .select('id')
    .or(
      `email.ilike.%${term}%,full_name.ilike.%${term}%,display_name.ilike.%${term}%`
    )
    .limit(200);

  return (data ?? []).map((row) => row.id as string);
}

export function ugcKanbanColumn(row: AdminUgcRow): AdminUgcKanbanColumn {
  if (row.contentStatus === 'rejected') return 'rejected';
  if (row.rewardStatus === 'sent') return 'sent';
  if (row.contentStatus === 'approved') return 'approved';
  return 'pending';
}

export async function getAdminUgcStats(admin: SupabaseClient): Promise<AdminUgcStats> {
  const { data, count } = await admin
    .from('ugc_submissions')
    .select('content_status, reward_status', { count: 'exact' })
    .limit(5000);

  const rows = data ?? [];
  const total = count ?? rows.length;

  return {
    total,
    pending: rows.filter((row) => row.content_status === 'pending').length,
    approved: rows.filter(
      (row) => row.content_status === 'approved' && row.reward_status !== 'sent'
    ).length,
    sent: rows.filter((row) => row.reward_status === 'sent').length,
    rejected: rows.filter((row) => row.content_status === 'rejected').length,
  };
}

export async function listAdminUgc(
  admin: SupabaseClient,
  filters: AdminUgcFilters = {}
): Promise<{ rows: AdminUgcRow[]; queryError: string | null }> {
  const limit = filters.limit ?? 100;
  let query = admin
    .from('ugc_submissions')
    .select(
      `
      id,
      user_id,
      instagram,
      context,
      rpg_system,
      content_status,
      reward_status,
      reward_cycle_id,
      usage_tags,
      created_at,
      profiles(full_name, display_name, email),
      ugc_media(id)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  const status = filters.status?.trim();
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query = query.eq('content_status', status);
  }

  const q = filters.q?.trim();
  if (q) {
    const userIds = await resolveMatchingUserIds(admin, q);
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      query = query.or(`context.ilike.%${q}%,instagram.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listAdminUgc:', error.message);
    return { rows: [], queryError: error.message };
  }

  return {
    rows: (data ?? []).map((row) => mapRow(row as SubmissionRecord)),
    queryError: null,
  };
}

async function signUgcPaths(
  admin: SupabaseClient,
  paths: string[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const path of paths) {
    const { data, error } = await admin.storage
      .from(UGC_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) {
      console.warn('[admin] ugc signed url failed:', path, error.message);
      continue;
    }
    if (data?.signedUrl) urls.set(path, data.signedUrl);
  }
  return urls;
}

export async function getAdminUgcDetail(
  admin: SupabaseClient,
  submissionId: string
): Promise<AdminUgcDetail | null> {
  const { data, error } = await admin
    .from('ugc_submissions')
    .select(
      `
      id,
      user_id,
      instagram,
      context,
      highlight,
      kit_theme_ids,
      kit_other,
      rpg_system,
      rpg_system_other,
      player_count,
      session_type,
      session_type_other,
      moment_highlight,
      table_reaction,
      liked_most,
      liked_most_other,
      rpg_experience,
      first_3d_set,
      usage_tags,
      marketing_potential,
      marketing_notes,
      people_visible,
      credit_preference,
      content_status,
      reward_status,
      reward_cycle_id,
      reject_reason,
      review_note,
      reviewed_at,
      consent_content_version,
      consent_content_at,
      consent_likeness_version,
      consent_likeness_at,
      consent_reward_version,
      consent_reward_at,
      consent_guilda_version,
      consent_guilda_at,
      created_at,
      profiles(full_name, display_name, email),
      ugc_media(id, storage_path, original_name, mime_type, duration_seconds, sort_order)
    `
    )
    .eq('id', submissionId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[admin] getAdminUgcDetail:', error.message);
    return null;
  }

  const row = data as SubmissionRecord & {
    ugc_media?: {
      id: string;
      storage_path: string;
      original_name: string | null;
      mime_type?: string;
      duration_seconds?: number | null;
      sort_order?: number;
    }[];
  };

  const mediaRows = [...(row.ugc_media ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const signed = await signUgcPaths(
    admin,
    mediaRows.map((item) => item.storage_path)
  );

  const kitThemeIds = row.kit_theme_ids ?? [];
  let kitLabels: string[] = [];
  if (kitThemeIds.length > 0) {
    const { data: themes } = await admin
      .from('store_kit_themes')
      .select('id, kit_number, name')
      .in('id', kitThemeIds);
    kitLabels = (themes ?? []).map(
      (theme) => `Kit ${theme.kit_number} · ${theme.name}`
    );
  }

  let rewardCycleNumber: number | null = null;
  if (row.reward_cycle_id) {
    const { data: cycle } = await admin
      .from('subscription_cycles')
      .select('cycle_number')
      .eq('id', row.reward_cycle_id)
      .maybeSingle();
    rewardCycleNumber = cycle?.cycle_number != null ? Number(cycle.cycle_number) : null;
  }

  const base = mapRow(row);

  return {
    ...base,
    highlight: row.highlight ?? null,
    kitThemeIds,
    kitLabels,
    kitOther: row.kit_other ?? null,
    rpgSystemOther: row.rpg_system_other ?? null,
    playerCount: row.player_count ?? null,
    sessionType: row.session_type ?? null,
    sessionTypeOther: row.session_type_other ?? null,
    momentHighlight: row.moment_highlight ?? null,
    tableReaction: row.table_reaction ?? null,
    likedMost: row.liked_most ?? [],
    likedMostOther: row.liked_most_other ?? null,
    rpgExperience: row.rpg_experience ?? null,
    first3dSet: row.first_3d_set ?? null,
    peopleVisible: row.people_visible ?? 'none',
    creditPreference: row.credit_preference ?? 'none',
    rejectReason: row.reject_reason ?? null,
    reviewNote: row.review_note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    consentContentVersion: row.consent_content_version ?? '',
    consentContentAt: row.consent_content_at ?? row.created_at,
    consentLikenessVersion: row.consent_likeness_version ?? null,
    consentLikenessAt: row.consent_likeness_at ?? null,
    consentRewardVersion: row.consent_reward_version ?? '',
    consentRewardAt: row.consent_reward_at ?? row.created_at,
    consentGuildaVersion: row.consent_guilda_version ?? null,
    consentGuildaAt: row.consent_guilda_at ?? null,
    marketingPotential: (row.marketing_potential as UgcPotential | null) ?? null,
    marketingNotes: row.marketing_notes ?? null,
    rewardCycleNumber,
    media: mediaRows.map((item) => {
      const mimeType = item.mime_type || 'image/jpeg';
      return {
        id: item.id,
        path: item.storage_path,
        url: signed.get(item.storage_path) ?? null,
        originalName: item.original_name,
        mimeType,
        durationSeconds: item.duration_seconds ?? null,
        isVideo: isUgcVideoMime(mimeType),
      };
    }),
  };
}
