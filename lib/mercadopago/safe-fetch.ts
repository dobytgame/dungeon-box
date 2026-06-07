import { getPaymentClient, MP_CONFIGURED } from '@/lib/mercadopago';
import {
  getPreapproval,
  isMpTransientHttpStatus,
  type MpApiError,
} from '@/lib/mercadopago/preapproval-api';

function isMpNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; error?: string; message?: string };
  return (
    e.status === 404 ||
    e.error === 'not_found' ||
    /not found/i.test(e.message ?? '')
  );
}

/** Busca pagamento no MP; retorna null se não existir (ex.: simulação do painel). */
export async function fetchMpPayment(
  mpPaymentId: string
): Promise<Record<string, unknown> | null> {
  if (!MP_CONFIGURED) {
    console.warn('[mp] MP_ACCESS_TOKEN ausente — ignorando fetch de pagamento.');
    return null;
  }

  try {
    const payment = await getPaymentClient().get({ id: mpPaymentId });
    return payment as unknown as Record<string, unknown>;
  } catch (error) {
    if (isMpNotFound(error)) {
      console.warn('[mp-webhook] payment not found in MP API:', mpPaymentId);
      return null;
    }
    throw error;
  }
}

/** Busca pré-aprovação no MP; retorna null se não existir. */
export async function fetchMpPreapproval(
  mpSubscriptionId: string
): Promise<Record<string, unknown> | null> {
  if (!MP_CONFIGURED) {
    console.warn('[mp] MP_ACCESS_TOKEN ausente — ignorando fetch de assinatura.');
    return null;
  }

  try {
    const preapproval = await getPreapproval(mpSubscriptionId);
    return (preapproval as unknown as Record<string, unknown>) ?? null;
  } catch (error) {
    if (isMpNotFound(error)) {
      console.warn(
        '[mp-webhook] preapproval not found in MP API:',
        mpSubscriptionId
      );
      return null;
    }
    if (isMpTransientHttpStatus((error as MpApiError).status)) {
      console.warn(
        '[mp-webhook] preapproval fetch unavailable:',
        mpSubscriptionId
      );
      return null;
    }
    throw error;
  }
}
