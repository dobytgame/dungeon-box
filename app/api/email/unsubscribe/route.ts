import { NextResponse } from 'next/server';
import { suppressEmail } from '@/lib/email/suppressions';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function processUnsubscribe(token: string | null) {
  if (!token?.trim()) {
    return { ok: false as const, error: 'Token ausente.', status: 400 };
  }

  const verified = verifyUnsubscribeToken(token.trim());
  if ('error' in verified) {
    return { ok: false as const, error: verified.error, status: 400 };
  }

  const admin = createAdminClient();
  const result = await suppressEmail(admin, {
    email: verified.email,
    reason: 'unsubscribe',
    source: 'list_unsubscribe',
  });

  if ('error' in result) {
    return { ok: false as const, error: result.error, status: 500 };
  }

  return { ok: true as const, email: verified.email };
}

/** One-click unsubscribe (RFC 8058) + fallback GET. */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get('token');

  if (!token) {
    try {
      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const form = await request.formData();
        token = (form.get('token') as string | null) ?? token;
      } else if (contentType.includes('application/json')) {
        const body = (await request.json()) as { token?: string };
        token = body.token ?? token;
      }
    } catch {
      // ignore body parse errors — token may be only in query
    }
  }

  const result = await processUnsubscribe(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const result = await processUnsubscribe(token);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(
        `/email/unsubscribe?error=${encodeURIComponent(result.error)}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL('/email/unsubscribe?ok=1', request.url)
  );
}
