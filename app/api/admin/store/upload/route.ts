import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { uploadStoreMediaFile } from '@/lib/admin/store-media-optimize';

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    const folder = (formData.get('folder') as string | null)?.trim() || 'products';
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadStoreMediaFile(admin, {
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      bytes,
      folder,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
