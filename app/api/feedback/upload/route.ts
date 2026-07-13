import { NextResponse } from 'next/server';
import { uploadUserFeedbackImage } from '@/lib/feedback/upload';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await uploadUserFeedbackImage(admin, {
    userId: user.id,
    fileName: file.name,
    mimeType: file.type || 'image/jpeg',
    bytes,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ path: result.path });
}
