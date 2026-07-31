import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAdminBrowserPush } from '@/lib/admin/push-notifications';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.ADMIN_PUSH_INTERNAL_SECRET?.trim();
  const header = request.headers.get('x-admin-push-secret')?.trim();

  if (!secret || header !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    title?: string;
    body?: string | null;
    url?: string;
    tag?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const admin = createAdminClient();
  await sendAdminBrowserPush(admin, {
    title: body.title.trim(),
    body: body.body,
    url: body.url,
    tag: body.tag,
  });

  return NextResponse.json({ ok: true });
}
