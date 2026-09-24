import { NextResponse } from 'next/server';
import { z } from 'zod';
import { notifyUgcReceived } from '@/lib/ugc/notify';
import { submitUgcSubmission } from '@/lib/ugc/submit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  instagram: z.string().max(80).optional().nullable(),
  rpgSystem: z.string().min(1),
  rpgSystemOther: z.string().max(80).optional().nullable(),
  playerCount: z.string().min(1),
  sessionType: z.string().min(1),
  sessionTypeOther: z.string().max(80).optional().nullable(),
  kitThemeIds: z.array(z.string().uuid()).min(1).max(12),
  kitOther: z.string().max(80).optional().nullable(),
  context: z.string().min(20).max(2000),
  momentHighlight: z.string().max(2000).optional().nullable(),
  tableReaction: z.string().max(2000).optional().nullable(),
  likedMost: z.array(z.string()).max(12).optional(),
  likedMostOther: z.string().max(200).optional().nullable(),
  highlight: z.string().max(400).optional().nullable(),
  rpgExperience: z.string().max(40).optional().nullable(),
  first3dSet: z.string().max(40).optional().nullable(),
  peopleVisible: z.enum(['none', 'adults', 'minors']),
  creditPreference: z.enum(['name', 'instagram', 'both', 'none']),
  consentContent: z.literal(true),
  consentLikeness: z.boolean(),
  consentReward: z.literal(true),
  consentGuilda: z.boolean(),
  media: z
    .array(
      z.object({
        path: z.string().min(1).max(500),
        mimeType: z.string().max(80),
        byteSize: z.number().int().positive(),
        originalName: z.string().max(180).optional().nullable(),
        durationSeconds: z.number().positive().optional().nullable(),
      })
    )
    .min(1)
    .max(10),
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

  const admin = createAdminClient();
  const result = await submitUgcSubmission(admin, {
    userId: user.id,
    ...body,
    rpgSystem: body.rpgSystem as never,
    playerCount: body.playerCount as never,
    sessionType: body.sessionType as never,
    likedMost: body.likedMost as never,
    rpgExperience: (body.rpgExperience || null) as never,
    first3dSet: (body.first3dSet || null) as never,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  void notifyUgcReceived(admin, user.id);

  return NextResponse.json({ success: true, submissionId: result.submissionId });
}
