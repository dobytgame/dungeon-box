import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth] exchangeCodeForSession failed:', error);
      const loginUrl = new URL('/auth', requestUrl.origin);
      loginUrl.searchParams.set('error', 'link_invalido');
      return NextResponse.redirect(loginUrl);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const authEmail = user?.email?.trim().toLowerCase();
    if (user?.id && authEmail) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: authEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('[auth] profile email sync after OAuth failed:', profileError);
      }
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
