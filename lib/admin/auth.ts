import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireAdmin(options?: { next?: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = options?.next ?? '/admin';
    redirect(`/auth?next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, display_name, is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/');
  }

  return {
    user,
    profile,
    supabase,
    admin: createAdminClient(),
  };
}
