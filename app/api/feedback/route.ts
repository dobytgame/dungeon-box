import { NextResponse } from 'next/server';
import { z } from 'zod';
import { submitUserFeedback } from '@/lib/feedback/submit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  cycleId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  message: z.string().max(2000).optional().nullable(),
  imagePaths: z.array(z.string().min(1).max(500)).max(3).optional(),
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
  const result = await submitUserFeedback(admin, {
    userId: user.id,
    cycleId: body.cycleId,
    rating: body.rating,
    message: body.message,
    imagePaths: body.imagePaths,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, feedbackId: result.feedbackId });
}
