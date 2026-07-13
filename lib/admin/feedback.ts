import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type {
  AdminFeedbackDetail,
  AdminFeedbackRow,
  AdminFeedbackStats,
  AdminListFilters,
} from '@/lib/admin/types';
import { USER_FEEDBACK_BUCKET } from '@/lib/feedback/upload';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type AdminFeedbackFilters = AdminListFilters & {
  rating?: string;
};

type FeedbackRecord = {
  id: string;
  user_id: string;
  subscription_cycle_id: string;
  rating: number;
  message: string | null;
  image_paths: string[] | null;
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
  subscription_cycles?:
    | {
        cycle_number?: number | null;
        themes?:
          | { name?: string | null; emoji?: string | null }
          | { name?: string | null; emoji?: string | null }[]
          | null;
      }
    | {
        cycle_number?: number | null;
        themes?:
          | { name?: string | null; emoji?: string | null }
          | { name?: string | null; emoji?: string | null }[]
          | null;
      }[]
    | null;
};

function mapFeedbackRow(row: FeedbackRecord): AdminFeedbackRow {
  const profile = relOne(row.profiles);
  const cycle = relOne(row.subscription_cycles);
  const theme = relOne(cycle?.themes ?? null);
  const imagePaths = row.image_paths ?? [];

  return {
    id: row.id,
    userId: row.user_id,
    cycleId: row.subscription_cycle_id,
    rating: row.rating,
    message: row.message,
    imageCount: imagePaths.length,
    createdAt: row.created_at,
    customerName: profile?.full_name ?? profile?.display_name ?? null,
    customerEmail: profile?.email ?? null,
    cycleNumber: cycle?.cycle_number ?? null,
    themeName: theme?.name ?? null,
    themeEmoji: theme?.emoji ?? null,
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

export async function getAdminFeedbackStats(
  admin: SupabaseClient
): Promise<AdminFeedbackStats> {
  const { data, count } = await admin
    .from('user_feedback')
    .select('rating, image_paths', { count: 'exact' })
    .limit(5000);

  const rows = data ?? [];
  const total = count ?? rows.length;
  const withPhotos = rows.filter((row) => (row.image_paths ?? []).length > 0).length;
  const ratingSum = rows.reduce((sum, row) => sum + (row.rating as number), 0);

  return {
    total,
    averageRating: total > 0 ? Math.round((ratingSum / total) * 10) / 10 : null,
    withPhotos,
  };
}

export async function listAdminFeedback(
  admin: SupabaseClient,
  filters: AdminFeedbackFilters = {}
): Promise<AdminFeedbackRow[]> {
  const limit = filters.limit ?? 100;

  let query = admin
    .from('user_feedback')
    .select(
      `
      id,
      user_id,
      subscription_cycle_id,
      rating,
      message,
      image_paths,
      created_at,
      profiles(full_name, display_name, email),
      subscription_cycles(cycle_number, themes(name, emoji))
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  const rating = filters.rating?.trim();
  if (rating && /^[1-5]$/.test(rating)) {
    query = query.eq('rating', Number(rating));
  }

  const q = filters.q?.trim();
  if (q) {
    const userIds = await resolveMatchingUserIds(admin, q);
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      query = query.ilike('message', `%${q}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listAdminFeedback:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapFeedbackRow(row as FeedbackRecord));
}

export async function getFeedbackImageSignedUrls(
  admin: SupabaseClient,
  paths: string[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const path of paths) {
    const { data, error } = await admin.storage
      .from(USER_FEEDBACK_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.warn('[admin] signed url failed:', path, error.message);
      continue;
    }

    if (data?.signedUrl) {
      urls.push(data.signedUrl);
    }
  }

  return urls;
}

export async function getAdminFeedbackDetail(
  admin: SupabaseClient,
  feedbackId: string
): Promise<AdminFeedbackDetail | null> {
  const { data, error } = await admin
    .from('user_feedback')
    .select(
      `
      id,
      user_id,
      subscription_cycle_id,
      rating,
      message,
      image_paths,
      created_at,
      profiles(full_name, display_name, email),
      subscription_cycles(cycle_number, themes(name, emoji))
    `
    )
    .eq('id', feedbackId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[admin] getAdminFeedbackDetail:', error.message);
    return null;
  }

  const row = mapFeedbackRow(data as FeedbackRecord);
  const imagePaths = (data.image_paths as string[] | null) ?? [];
  const imageUrls = await getFeedbackImageSignedUrls(admin, imagePaths);

  return {
    ...row,
    imagePaths,
    imageUrls,
  };
}
