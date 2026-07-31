type AdminBrowserPushPayload = {
  title: string;
  body?: string | null;
  url?: string;
  tag?: string;
};

function resolveAppOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return null;
}

/** Dispara push do navegador via rota interna (evita bundlar web-push no cliente). */
export async function triggerAdminBrowserPush(
  payload: AdminBrowserPushPayload
): Promise<void> {
  const secret = process.env.ADMIN_PUSH_INTERNAL_SECRET?.trim();
  const origin = resolveAppOrigin();

  if (!secret || !origin) return;

  try {
    const res = await fetch(`${origin}/api/admin/push/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-push-secret': secret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[admin] push dispatch failed:', res.status, text);
    }
  } catch (error) {
    console.error('[admin] push dispatch error:', error);
  }
}
