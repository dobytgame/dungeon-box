import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUgcSignedUpload } from '@/lib/ugc/upload';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(80),
  byteSize: z.number().int().positive(),
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
  const result = await createUgcSignedUpload(admin, {
    userId: user.id,
    fileName: body.fileName,
    mimeType: body.mimeType,
    byteSize: body.byteSize,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
