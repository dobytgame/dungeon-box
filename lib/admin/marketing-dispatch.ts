import type { SupabaseClient } from '@supabase/supabase-js';
import type { SendEmailResult } from '@/lib/email/send';
import type {
  MarketingAudience,
  MarketingRecipient,
} from '@/lib/admin/types';

export type MarketingRecipientStatus = 'sent' | 'failed' | 'skipped';

export interface MarketingRecipientResult {
  recipient: MarketingRecipient;
  status: MarketingRecipientStatus;
  resendId?: string;
  errorMessage?: string;
}

export interface MarketingDispatchSummary {
  dispatchId: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface AdminMarketingDispatchRow {
  id: string;
  templateId: string;
  audience: MarketingAudience;
  subject: string;
  actorName: string | null;
  actorEmail: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminMarketingRecipientRow {
  id: string;
  email: string;
  name: string | null;
  userId: string | null;
  status: MarketingRecipientStatus;
  resendId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
}

const TEMPLATE_LABELS: Record<string, string> = {
  voltei10_winback: 'VOLTEI10 — Não assinantes',
  unconverted_lead: 'Lead não convertido',
};

export function marketingTemplateLabel(templateId: string): string {
  return TEMPLATE_LABELS[templateId] ?? templateId;
}

async function fetchAlreadySentEmails(
  admin: SupabaseClient,
  templateId: string
): Promise<Set<string>> {
  const { data: dispatches, error: dispatchError } = await admin
    .from('marketing_campaign_dispatches')
    .select('id')
    .eq('template_id', templateId);

  if (dispatchError) {
    console.error('[marketing-dispatch] fetchAlreadySentEmails:', dispatchError.message);
    return new Set();
  }

  const dispatchIds = (dispatches ?? []).map((row) => row.id as string);
  if (!dispatchIds.length) return new Set();

  const { data, error } = await admin
    .from('marketing_campaign_recipients')
    .select('email')
    .in('dispatch_id', dispatchIds)
    .eq('status', 'sent');

  if (error) {
    console.error('[marketing-dispatch] fetchAlreadySentEmails:', error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.email?.trim().toLowerCase())
      .filter(Boolean) as string[]
  );
}

function dedupeRecipients(recipients: MarketingRecipient[]): MarketingRecipient[] {
  const byEmail = new Map<string, MarketingRecipient>();
  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, { ...recipient, email });
  }
  return Array.from(byEmail.values());
}

export async function executeMarketingDispatch(
  admin: SupabaseClient,
  options: {
    templateId: string;
    audience: MarketingAudience;
    subject: string;
    actorId: string;
    recipients: MarketingRecipient[];
    skipAlreadySent?: boolean;
    sendOne: (recipient: MarketingRecipient) => Promise<SendEmailResult>;
  }
): Promise<MarketingDispatchSummary> {
  const unique = dedupeRecipients(options.recipients);
  const alreadySent = options.skipAlreadySent
    ? await fetchAlreadySentEmails(admin, options.templateId)
  : new Set<string>();

  const toSend: MarketingRecipient[] = [];
  const skippedResults: MarketingRecipientResult[] = [];

  for (const recipient of unique) {
    const email = recipient.email.trim().toLowerCase();
    if (alreadySent.has(email)) {
      skippedResults.push({
        recipient,
        status: 'skipped',
        errorMessage: 'Já recebeu esta campanha anteriormente.',
      });
      continue;
    }
    toSend.push(recipient);
  }

  const { data: dispatch, error: dispatchError } = await admin
    .from('marketing_campaign_dispatches')
    .insert({
      template_id: options.templateId,
      audience: options.audience,
      subject: options.subject,
      actor_id: options.actorId,
      total_recipients: unique.length,
      sent_count: 0,
      failed_count: 0,
      skipped_count: skippedResults.length,
    })
    .select('id')
    .single();

  if (dispatchError || !dispatch) {
    throw new Error(dispatchError?.message ?? 'Falha ao criar registro do disparo.');
  }

  const dispatchId = dispatch.id as string;

  const detailedResults = await sendWithDetailedTracking(toSend, options.sendOne);
  const mergedResults: MarketingRecipientResult[] = [
    ...skippedResults,
    ...detailedResults,
  ];

  const sentCount = mergedResults.filter((row) => row.status === 'sent').length;
  const failedCount = mergedResults.filter((row) => row.status === 'failed').length;
  const skippedCount = mergedResults.filter((row) => row.status === 'skipped').length;
  const errors = mergedResults
    .filter((row) => row.status === 'failed' && row.errorMessage)
    .slice(0, 5)
    .map((row) => `${row.recipient.email}: ${row.errorMessage}`);

  if (mergedResults.length) {
    const { error: recipientsError } = await admin
      .from('marketing_campaign_recipients')
      .insert(
        mergedResults.map((row) => ({
          dispatch_id: dispatchId,
          user_id: row.recipient.userId ?? null,
          email: row.recipient.email,
          name: row.recipient.name,
          status: row.status,
          resend_id: row.resendId ?? null,
          error_message: row.errorMessage ?? null,
          sent_at: row.status === 'sent' ? new Date().toISOString() : null,
        }))
      );

    if (recipientsError) {
      console.error('[marketing-dispatch] insert recipients:', recipientsError.message);
    }
  }

  const { error: updateError } = await admin
    .from('marketing_campaign_dispatches')
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', dispatchId);

  if (updateError) {
    console.error('[marketing-dispatch] finalize:', updateError.message);
  }

  return {
    dispatchId,
    total: unique.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    errors,
  };
}

async function sendWithDetailedTracking(
  recipients: MarketingRecipient[],
  sendOne: (recipient: MarketingRecipient) => Promise<SendEmailResult>
): Promise<MarketingRecipientResult[]> {
  if (!recipients.length) return [];

  const BATCH_SIZE = 8;
  const BATCH_DELAY_MS = 1_100;
  const results: MarketingRecipientResult[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }

    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async (recipient) => {
        const result = await sendOne(recipient);
        if (result.sent) {
          return {
            recipient,
            status: 'sent' as const,
            resendId: result.id,
          };
        }
        return {
          recipient,
          status: 'failed' as const,
          errorMessage: result.message ?? result.reason,
        };
      })
    );

    results.push(...chunkResults);
  }

  return results;
}

export async function listMarketingDispatches(
  admin: SupabaseClient,
  limit = 50
): Promise<AdminMarketingDispatchRow[]> {
  const { data, error } = await admin
    .from('marketing_campaign_dispatches')
    .select(
      `
      id,
      template_id,
      audience,
      subject,
      total_recipients,
      sent_count,
      failed_count,
      skipped_count,
      created_at,
      completed_at,
      profiles:actor_id(full_name, display_name, email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[marketing-dispatch] list:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id as string,
      templateId: row.template_id as string,
      audience: row.audience as MarketingAudience,
      subject: row.subject as string,
      actorName:
        (actor?.full_name as string | null) ??
        (actor?.display_name as string | null) ??
        null,
      actorEmail: (actor?.email as string | null) ?? null,
      totalRecipients: row.total_recipients as number,
      sentCount: row.sent_count as number,
      failedCount: row.failed_count as number,
      skippedCount: row.skipped_count as number,
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? null,
    };
  });
}

export async function getMarketingDispatchDetail(
  admin: SupabaseClient,
  dispatchId: string
): Promise<{
  dispatch: AdminMarketingDispatchRow | null;
  recipients: AdminMarketingRecipientRow[];
}> {
  const { data: dispatchRow, error: dispatchError } = await admin
    .from('marketing_campaign_dispatches')
    .select(
      `
      id,
      template_id,
      audience,
      subject,
      total_recipients,
      sent_count,
      failed_count,
      skipped_count,
      created_at,
      completed_at,
      profiles:actor_id(full_name, display_name, email)
    `
    )
    .eq('id', dispatchId)
    .maybeSingle();

  if (dispatchError || !dispatchRow) {
    if (dispatchError) {
      console.error('[marketing-dispatch] detail:', dispatchError.message);
    }
    return { dispatch: null, recipients: [] };
  }

  const actor = Array.isArray(dispatchRow.profiles)
    ? dispatchRow.profiles[0]
    : dispatchRow.profiles;

  const dispatch: AdminMarketingDispatchRow = {
    id: dispatchRow.id as string,
    templateId: dispatchRow.template_id as string,
    audience: dispatchRow.audience as MarketingAudience,
    subject: dispatchRow.subject as string,
    actorName:
      (actor?.full_name as string | null) ??
      (actor?.display_name as string | null) ??
      null,
    actorEmail: (actor?.email as string | null) ?? null,
    totalRecipients: dispatchRow.total_recipients as number,
    sentCount: dispatchRow.sent_count as number,
    failedCount: dispatchRow.failed_count as number,
    skippedCount: dispatchRow.skipped_count as number,
    createdAt: dispatchRow.created_at as string,
    completedAt: (dispatchRow.completed_at as string | null) ?? null,
  };

  const { data: recipients, error: recipientsError } = await admin
    .from('marketing_campaign_recipients')
    .select('id, email, name, user_id, status, resend_id, error_message, sent_at')
    .eq('dispatch_id', dispatchId)
    .order('status', { ascending: true })
    .order('email', { ascending: true });

  if (recipientsError) {
    console.error('[marketing-dispatch] recipients:', recipientsError.message);
  }

  return {
    dispatch,
    recipients: (recipients ?? []).map((row) => ({
      id: row.id as string,
      email: row.email as string,
      name: (row.name as string | null) ?? null,
      userId: (row.user_id as string | null) ?? null,
      status: row.status as MarketingRecipientStatus,
      resendId: (row.resend_id as string | null) ?? null,
      errorMessage: (row.error_message as string | null) ?? null,
      sentAt: (row.sent_at as string | null) ?? null,
    })),
  };
}
