import { createClient } from '@supabase/supabase-js';
import type { RealtimeClientOptions } from '@supabase/realtime-js';

let cachedNodeWebSocket: RealtimeClientOptions['transport'];

function nodeWebSocketTransport(): RealtimeClientOptions['transport'] | undefined {
  if (cachedNodeWebSocket) return cachedNodeWebSocket;
  if (typeof globalThis.WebSocket !== 'undefined') return undefined;

  try {
    // Node < 22: Supabase inicializa Realtime mesmo sem uso — precisa de `ws`.
    const ws = require('ws') as typeof import('ws');
    cachedNodeWebSocket = ws.WebSocket as RealtimeClientOptions['transport'];
    return cachedNodeWebSocket;
  } catch {
    return undefined;
  }
}

/** Cliente service role — apenas em Route Handlers / webhooks (nunca no browser). */
export function createAdminClient() {
  const transport = nodeWebSocketTransport();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      ...(transport ? { realtime: { transport } } : {}),
    }
  );
}
