import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BRAZIL_STATES } from '@/lib/dashboard/constants';
import { REFERRAL_REWARDS } from '@/lib/referral/constants';
import { createRedemption } from '@/lib/referral/redemptions';
import { notifyReferralRedemption } from '@/lib/referral/notify';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { displayName, getProfile } from '@/lib/dashboard/queries';

const addressSchema = z.object({
  recipient: z.string().min(2).max(120),
  zip_code: z.string().regex(/^\d{8}$/),
  street: z.string().min(2).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(120).optional().nullable(),
  neighborhood: z.string().min(2).max(120),
  city: z.string().min(2).max(120),
  state: z.enum(BRAZIL_STATES),
});

const bodySchema = z.object({
  rewardType: z.enum(['tintas', 'avulso', 'aventureiro', 'heroi', 'lendario']),
  shippingAddress: addressSchema,
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const reward = REFERRAL_REWARDS.find((r) => r.type === body.rewardType);
  if (!reward) {
    return NextResponse.json({ error: 'Recompensa inválida.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { redemptionId } = await createRedemption(admin, {
      userId: user.id,
      rewardType: body.rewardType,
      shippingAddress: body.shippingAddress,
      notes: body.notes,
    });

    const profile = await getProfile(user.id);
    void notifyReferralRedemption({
      userEmail: profile?.email ?? user.email ?? '',
      userName: displayName(profile, user.email),
      rewardLabel: reward.label,
      pointsSpent: reward.points,
      notes: body.notes,
    }).catch((err) => {
      console.error('[referral] ops notify failed:', err);
    });

    return NextResponse.json({ success: true, redemptionId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível resgatar.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
