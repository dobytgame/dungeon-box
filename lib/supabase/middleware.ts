import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
  REFERRAL_VISIT_COUNTED_COOKIE_NAME,
  normalizeReferralCode,
} from '@/lib/referral/cookie';
import { recordReferralLinkVisit } from '@/lib/referral/visits';
import { createAdminClient } from '@/lib/supabase/admin';
import { isStorePublic, profileIsStoreAdmin } from '@/lib/store/access';

function shouldTrackReferralVisit(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/_next/')) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  return true;
}

function applyReferralCookie(request: NextRequest, response: NextResponse) {
  const refParam = request.nextUrl.searchParams.get('ref');
  const code = normalizeReferralCode(refParam);
  if (!code) return response;

  response.cookies.set(REFERRAL_COOKIE_NAME, code, {
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

async function trackReferralVisitIfNeeded(
  request: NextRequest,
  response: NextResponse,
  visitorUserId: string | null
) {
  const refParam = request.nextUrl.searchParams.get('ref');
  const code = normalizeReferralCode(refParam);
  if (!code || !shouldTrackReferralVisit(request.nextUrl.pathname)) {
    return response;
  }

  const alreadyCounted =
    request.cookies.get(REFERRAL_VISIT_COUNTED_COOKIE_NAME)?.value === code;
  if (alreadyCounted) return response;

  try {
    const admin = createAdminClient();
    const result = await recordReferralLinkVisit(admin, code, {
      visitorUserId,
    });

    if (result === 'recorded') {
      response.cookies.set(REFERRAL_VISIT_COUNTED_COOKIE_NAME, code, {
        maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  } catch (error) {
    console.error('[referral] visit tracking failed:', error);
  }

  return response;
}

async function finalizeReferralResponse(
  request: NextRequest,
  response: NextResponse,
  visitorUserId: string | null
) {
  return trackReferralVisitIfNeeded(
    request,
    applyReferralCookie(request, response),
    visitorUserId
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/admin');

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return finalizeReferralResponse(
      request,
      NextResponse.redirect(redirectUrl),
      null
    );
  }

  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      return finalizeReferralResponse(
        request,
        NextResponse.redirect(redirectUrl),
        user.id
      );
    }
  }

  if (!isStorePublic() && pathname.startsWith('/api/store')) {
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const isAdmin = await profileIsStoreAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
  }

  if (!isStorePublic() && pathname.startsWith('/loja')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/auth';
      redirectUrl.searchParams.set('next', pathname + request.nextUrl.search);
      return finalizeReferralResponse(
        request,
        NextResponse.redirect(redirectUrl),
        null
      );
    }

    const isAdmin = await profileIsStoreAdmin(supabase, user.id);
    if (!isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      return finalizeReferralResponse(
        request,
        NextResponse.redirect(redirectUrl),
        user.id
      );
    }
  }

  if (pathname === '/auth' && user) {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next.startsWith('/') ? next : '/dashboard';
    redirectUrl.search = '';
    return finalizeReferralResponse(
      request,
      NextResponse.redirect(redirectUrl),
      user.id
    );
  }

  return finalizeReferralResponse(request, supabaseResponse, user?.id ?? null);
}
