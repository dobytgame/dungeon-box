import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listPagarmeCustomerCards,
  pickNewestActivePagarmeCard,
  type PagarmeCustomerCard,
} from '@/lib/pagarme/cards';
import { updatePagarmeSubscriptionCard } from '@/lib/pagarme/subscription-api';

export type SyncedPagarmeSubscriptionCard = {
  cardId: string;
  last4: string | null;
  brand: string | null;
  synced: boolean;
  previousCardId: string | null;
};

function cardStamp(card: PagarmeCustomerCard | null | undefined): string {
  return String(card?.created_at ?? '');
}

/**
 * Confere a carteira do cliente no Pagar.me e, se houver cartão mais novo
 * que o da assinatura, anexa esse cartão antes da cobrança.
 */
export async function syncLatestPagarmeCardToSubscription(input: {
  admin: SupabaseClient;
  subscriptionId: string;
  pagarmeSubscriptionId: string;
  pagarmeCustomerId: string;
  currentRemoteCardId?: string | null;
  currentRemoteLast4?: string | null;
  currentRemoteBrand?: string | null;
}): Promise<SyncedPagarmeSubscriptionCard | { error: string }> {
  const previousCardId = input.currentRemoteCardId?.trim() || null;

  let cards: PagarmeCustomerCard[] = [];
  try {
    cards = await listPagarmeCustomerCards(input.pagarmeCustomerId);
  } catch (error) {
    console.warn(
      '[pagarme] list customer cards for sync:',
      input.subscriptionId,
      error instanceof Error ? error.message : error
    );
  }

  const latestWallet = pickNewestActivePagarmeCard(cards);
  const currentInWallet = previousCardId
    ? cards.find((card) => card.id === previousCardId)
    : undefined;

  const walletIsNewer =
    Boolean(latestWallet?.id) &&
    latestWallet!.id !== previousCardId &&
    (!currentInWallet || cardStamp(latestWallet) >= cardStamp(currentInWallet));

  let cardId = previousCardId;
  let last4 =
    input.currentRemoteLast4?.trim() ||
    currentInWallet?.last_four_digits?.trim() ||
    null;
  let brand =
    input.currentRemoteBrand?.trim() || currentInWallet?.brand?.trim() || null;
  let synced = false;

  const attachWalletCard = async (card: PagarmeCustomerCard) => {
    await updatePagarmeSubscriptionCard(input.pagarmeSubscriptionId, {
      cardId: card.id,
    });
    cardId = card.id;
    last4 = card.last_four_digits?.trim() || last4;
    brand = card.brand?.trim() || brand;
    synced = true;
  };

  if (walletIsNewer && latestWallet) {
    try {
      await attachWalletCard(latestWallet);
    } catch (error) {
      console.error(
        '[pagarme] attach latest wallet card:',
        input.subscriptionId,
        error
      );
      return {
        error:
          'O cliente tem um cartão mais novo, mas não foi possível anexá-lo à assinatura. Peça para atualizar o cartão no dashboard e tente de novo.',
      };
    }
  } else if (!cardId && latestWallet) {
    try {
      await attachWalletCard(latestWallet);
    } catch (error) {
      console.warn(
        '[pagarme] attach fallback wallet card:',
        input.subscriptionId,
        error instanceof Error ? error.message : error
      );
      cardId = latestWallet.id;
      last4 = latestWallet.last_four_digits?.trim() || null;
      brand = latestWallet.brand?.trim() || null;
    }
  } else if (latestWallet && latestWallet.id === previousCardId) {
    last4 = latestWallet.last_four_digits?.trim() || last4;
    brand = latestWallet.brand?.trim() || brand;
  }

  if (!cardId) {
    return { error: 'Assinatura sem cartão salvo no Pagar.me.' };
  }

  if (last4 || brand) {
    await input.admin
      .from('subscriptions')
      .update({
        ...(last4 ? { card_last4: last4 } : {}),
        ...(brand ? { card_brand: brand } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.subscriptionId);
  }

  return {
    cardId,
    last4,
    brand,
    synced,
    previousCardId,
  };
}
