import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=/admin');
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
