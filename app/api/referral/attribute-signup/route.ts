import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { REFERRAL_COOKIE_NAME } from '@/lib/referral/cookie';
import { registerReferralAtSignup } from '@/lib/referral/signups';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const referralCode = cookies().get(REFERRAL_COOKIE_NAME)?.value ?? null;
  if (!referralCode) {
    return NextResponse.json({ result: 'skipped_no_cookie' });
  }

  const admin = createAdminClient();
  const result = await registerReferralAtSignup(admin, {
    referredUserId: user.id,
    referralCode,
  });

  return NextResponse.json({ result });
}
