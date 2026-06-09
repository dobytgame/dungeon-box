import { COMPANY } from '@/lib/legal/constants';
import { sendEmail, type SendEmailResult } from '@/lib/email/send';
import {
  ACCOUNT_CREATED_SUBJECT,
  accountCreatedHtml,
  accountCreatedText,
} from '@/lib/email/templates/account-created';
import {
  PASSWORD_RESET_SUBJECT,
  passwordResetHtml,
  passwordResetText,
} from '@/lib/email/templates/password-reset';
import {
  PURCHASE_COMPLETED_SUBJECT,
  purchaseCompletedHtml,
  purchaseCompletedText,
} from '@/lib/email/templates/purchase-completed';
import {
  ORDER_SHIPPED_SUBJECT,
  orderShippedHtml,
  orderShippedText,
  type OrderShippedTemplateData,
} from '@/lib/email/templates/order-shipped';
import {
  SUBSCRIPTION_CANCELLED_SUBJECT,
  subscriptionCancelledHtml,
  subscriptionCancelledText,
} from '@/lib/email/templates/subscription-cancelled';
import {
  SUPPORT_CONFIRMATION_SUBJECT,
  supportConfirmationHtml,
  supportConfirmationText,
} from '@/lib/email/templates/support-confirmation';
import { getRoleEmailAddress } from '@/lib/email/config';
import { escapeHtml } from '@/lib/email/layout';

export async function sendAccountCreatedEmail(input: {
  to: string;
  name?: string | null;
  confirmUrl?: string | null;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to: input.to,
    subject: ACCOUNT_CREATED_SUBJECT,
    html: accountCreatedHtml(input),
    text: accountCreatedText(input),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'account_created' }],
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name?: string | null;
  resetUrl: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to: input.to,
    subject: PASSWORD_RESET_SUBJECT,
    html: passwordResetHtml(input),
    text: passwordResetText(input),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'password_reset' }],
  });
}

export async function sendPurchaseCompletedEmail(input: {
  to: string;
  name?: string | null;
  planName: string;
  amountCents: number;
  cycleNumber?: number;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to: input.to,
    subject: PURCHASE_COMPLETED_SUBJECT,
    html: purchaseCompletedHtml(input),
    text: purchaseCompletedText(input),
    replyTo: getRoleEmailAddress('billing') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'purchase_completed' }],
  });
}

export async function sendOrderShippedEmail(
  to: string,
  data: Omit<OrderShippedTemplateData, 'name'> & { name?: string | null },
): Promise<SendEmailResult> {
  return sendEmail({
    role: 'shipping',
    to,
    subject: ORDER_SHIPPED_SUBJECT,
    html: orderShippedHtml(data),
    text: orderShippedText(data),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'order_shipped' }],
  });
}

export async function sendSubscriptionCancelledEmail(input: {
  to: string;
  name?: string | null;
  planName: string;
  effectiveUntil?: string | null;
  hasPendingShipment?: boolean;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'billing',
    to: input.to,
    subject: SUBSCRIPTION_CANCELLED_SUBJECT,
    html: subscriptionCancelledHtml(input),
    text: subscriptionCancelledText(input),
    replyTo: getRoleEmailAddress('billing') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'subscription_cancelled' }],
  });
}

export async function sendSupportConfirmationEmail(input: {
  to: string;
  name?: string | null;
  subject?: string | null;
  messagePreview?: string | null;
}): Promise<SendEmailResult> {
  const supportAddress = getRoleEmailAddress('support') ?? COMPANY.supportEmail;

  return sendEmail({
    role: 'support',
    to: input.to,
    subject: SUPPORT_CONFIRMATION_SUBJECT,
    html: supportConfirmationHtml(input),
    text: supportConfirmationText(input),
    replyTo: supportAddress,
    tags: [{ name: 'category', value: 'support_confirmation' }],
  });
}

/** Notifica o Mestre sobre nova mensagem de contato (cópia interna). */
export async function sendSupportNotificationToTeam(input: {
  fromEmail: string;
  fromName?: string | null;
  subject: string;
  message: string;
}): Promise<SendEmailResult> {
  const supportAddress = getRoleEmailAddress('support') ?? COMPANY.supportEmail;
  const name = input.fromName?.trim() || input.fromEmail;

  return sendEmail({
    role: 'support',
    to: supportAddress,
    subject: `[Contato] ${input.subject}`,
    html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(input.fromEmail)}&gt;</p><p>${escapeHtml(input.message).replace(/\n/g, '<br>')}</p>`,
    text: `${name} <${input.fromEmail}>\n\n${input.message}`,
    replyTo: input.fromEmail,
    tags: [{ name: 'category', value: 'support_inbound' }],
  });
}
