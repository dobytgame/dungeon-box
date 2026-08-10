import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { getFeedbackImageSignedUrls } from '@/lib/admin/feedback';
import { relOne } from '@/lib/dashboard/format';
import { createAdminClient } from '@/lib/supabase/admin';

const LP_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_LIMIT = 12;
const TESTIMONIALS_REVALIDATE_SECONDS = 60 * 60;

function isFeaturedColumnMissing(message: string): boolean {
  return /featured_on_lp/i.test(message);
}

export type PublicTestimonial = {
  id: string;
  name: string;
  message: string;
  rating: number;
  imageUrls: string[];
  themeName: string | null;
};

function publicAuthorName(
  displayName: string | null | undefined,
  fullName: string | null | undefined
): string {
  const raw = displayName?.trim() || fullName?.trim();
  if (!raw) return 'Aventureiro';

  const first = raw.split(/\s+/)[0] ?? raw;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

async function mapPublicTestimonial(
  admin: SupabaseClient,
  row: {
    id: string;
    rating: number;
    message: string | null;
    image_paths: string[] | null;
    profiles?:
      | { display_name?: string | null; full_name?: string | null }
      | { display_name?: string | null; full_name?: string | null }[]
      | null;
    subscription_cycles?:
      | { themes?: { name?: string | null } | { name?: string | null }[] | null }
      | { themes?: { name?: string | null } | { name?: string | null }[] | null }[]
      | null;
  }
): Promise<PublicTestimonial | null> {
  const message = row.message?.trim();
  if (!message) return null;

  const profile = relOne(row.profiles ?? null);
  const cycle = relOne(row.subscription_cycles ?? null);
  const theme = relOne(cycle?.themes ?? null);
  const imagePaths = row.image_paths ?? [];
  const imageUrls = await getFeedbackImageSignedUrls(
    admin,
    imagePaths,
    LP_SIGNED_URL_TTL_SECONDS
  );

  return {
    id: row.id,
    name: publicAuthorName(profile?.display_name, profile?.full_name),
    message,
    rating: row.rating,
    imageUrls,
    themeName: theme?.name ?? null,
  };
}

async function fetchPublicTestimonials(
  limit: number
): Promise<PublicTestimonial[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('user_feedback')
    .select(
      `
      id,
      rating,
      message,
      image_paths,
      profiles(display_name, full_name),
      subscription_cycles(themes(name))
    `
    )
    .eq('featured_on_lp', true)
    .not('message', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isFeaturedColumnMissing(error.message)) {
      console.warn('[feedback] getPublicTestimonials: featured_on_lp column unavailable');
      return [];
    }
    console.error('[feedback] getPublicTestimonials:', error.message);
    return [];
  }

  const testimonials: PublicTestimonial[] = [];

  for (const row of data ?? []) {
    const mapped = await mapPublicTestimonial(admin, row as Parameters<
      typeof mapPublicTestimonial
    >[1]);
    if (mapped) testimonials.push(mapped);
  }

  return testimonials;
}

export async function getPublicTestimonials(
  limit = DEFAULT_LIMIT
): Promise<PublicTestimonial[]> {
  return unstable_cache(
    () => fetchPublicTestimonials(limit),
    ['public-testimonials', String(limit)],
    { revalidate: TESTIMONIALS_REVALIDATE_SECONDS }
  )();
}
