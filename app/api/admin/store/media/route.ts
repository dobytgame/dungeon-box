import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listStoreMediaFiles } from '@/lib/admin/store-upload';

export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const files = await listStoreMediaFiles(admin);
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
