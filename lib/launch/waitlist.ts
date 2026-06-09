import { createAdminClient } from '@/lib/supabase/admin';

export async function getWaitlistCount(): Promise<number> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return 0;
  }

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('newsletter_leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('[waitlist] count failed:', error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.warn('[waitlist] count error:', error);
    return 0;
  }
}
