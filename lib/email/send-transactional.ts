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
  cycleStatusUpdateHtml,
  cycleStatusUpdateSubject,
  cycleStatusUpdateText,
  type CycleStatusEmailContext,
} from '@/lib/email/templates/cycle-status-update';
import {
  SUBSCRIPTION_CANCELLED_SUBJECT,
  subscriptionCancelledHtml,
  subscriptionCancelledText,
} from '@/lib/email/templates/subscription-cancelled';
import {
  PLAN_UPGRADE_APPLIED_SUBJECT,
  planUpgradeAppliedHtml,
  planUpgradeAppliedText,
} from '@/lib/email/templates/plan-upgrade-applied';
import {
  STORE_ORDER_CONFIRMED_SUBJECT,
  storeOrderConfirmedHtml,
  storeOrderConfirmedText,
  type StoreOrderConfirmedTemplateData,
} from '@/lib/email/templates/store-order-confirmed';
import {
  SUPPORT_CONFIRMATION_SUBJECT,
  supportConfirmationHtml,
  supportConfirmationText,
} from '@/lib/email/templates/support-confirmation';
import {
  REFERRAL_CONVERTED_SUBJECT,
  referralConvertedHtml,
  referralConvertedText,
} from '@/lib/email/templates/referral-converted';
import {
  REFERRAL_POINTS_EARNED_SUBJECT,
  referralPointsEarnedHtml,
  referralPointsEarnedText,
} from '@/lib/email/templates/referral-points-earned';
import {
  PENDING_PAYMENT_SUBJECT,
  pendingPaymentHtml,
  pendingPaymentText,
} from '@/lib/email/templates/pending-payment';
import {
  SUBSCRIPTION_PIX_PAYMENT_SUBJECT,
  subscriptionPixPaymentHtml,
  subscriptionPixPaymentText,
} from '@/lib/email/templates/subscription-pix-payment';
import {
  FEEDBACK_REQUEST_SUBJECT,
  feedbackRequestHtml,
  feedbackRequestText,
  type FeedbackRequestTemplateData,
} from '@/lib/email/templates/feedback-request';
import {
  getRoleEmailAddress,
  isEmailConfigured,
  type EmailSenderRole,
} from '@/lib/email/config';
import type { CycleStatus } from '@/lib/dashboard/types';
import { escapeHtml } from '@/lib/email/layout';

function cycleStatusEmailRole(status: CycleStatus): EmailSenderRole {
  if (status === 'production' || status === 'preparing') return 'production';
  if (status === 'shipped' || status === 'delivered') return 'shipping';
  return 'guild';
}

function resolveCycleStatusSender(status: CycleStatus): EmailSenderRole {
  const preferred = cycleStatusEmailRole(status);
  const candidates: EmailSenderRole[] = [
    preferred,
    'shipping',
    'guild',
    'production',
    'billing',
    'support',
  ];

  for (const role of candidates) {
    if (isEmailConfigured(role)) return role;
  }

  return preferred;
}

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

export async function sendPendingPaymentEmail(input: {
  to: string;
  name?: string | null;
  planName?: string | null;
  amountCents: number;
  paymentUrl: string;
  dueDate?: string | null;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'billing',
    to: input.to,
    subject: PENDING_PAYMENT_SUBJECT,
    html: pendingPaymentHtml(input),
    text: pendingPaymentText(input),
    replyTo: getRoleEmailAddress('billing') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'pending_payment_link' }],
  });
}

export async function sendSubscriptionPixPaymentEmail(input: {
  to: string;
  name?: string | null;
  planName?: string | null;
  amountCents: number;
  paymentUrl: string;
  pixPayload: string;
  expirationDate?: string | null;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'billing',
    to: input.to,
    subject: SUBSCRIPTION_PIX_PAYMENT_SUBJECT,
    html: subscriptionPixPaymentHtml(input),
    text: subscriptionPixPaymentText(input),
    replyTo: getRoleEmailAddress('billing') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'subscription_pix_payment' }],
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

export async function sendCycleStatusUpdateEmail(
  to: string,
  data: CycleStatusEmailContext
): Promise<SendEmailResult> {
  const role = resolveCycleStatusSender(data.status);

  return sendEmail({
    role,
    to,
    subject: cycleStatusUpdateSubject(data),
    html: cycleStatusUpdateHtml(data),
    text: cycleStatusUpdateText(data),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [
      { name: 'category', value: 'cycle_status_update' },
      { name: 'status', value: data.status },
    ],
  });
}

export async function sendFeedbackRequestEmail(
  to: string,
  data: FeedbackRequestTemplateData
): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to,
    subject: FEEDBACK_REQUEST_SUBJECT,
    html: feedbackRequestHtml(data),
    text: feedbackRequestText(data),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'feedback_request' }],
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

export async function sendPlanUpgradeAppliedEmail(input: {
  to: string;
  name?: string | null;
  previousPlanName: string;
  newPlanName: string;
  nextBillingDate?: string | null;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'billing',
    to: input.to,
    subject: PLAN_UPGRADE_APPLIED_SUBJECT,
    html: planUpgradeAppliedHtml(input),
    text: planUpgradeAppliedText(input),
    replyTo: getRoleEmailAddress('billing') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'plan_upgrade_applied' }],
  });
}

export async function sendReferralConvertedEmail(input: {
  to: string;
  name?: string | null;
  referredName: string;
  projectedPoints: number;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to: input.to,
    subject: REFERRAL_CONVERTED_SUBJECT,
    html: referralConvertedHtml(input),
    text: referralConvertedText(input),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'referral_converted' }],
  });
}

export async function sendReferralPointsEarnedEmail(input: {
  to: string;
  name?: string | null;
  referredName: string;
  pointsEarned: number;
  newBalance: number;
  rankName?: string | null;
}): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to: input.to,
    subject: REFERRAL_POINTS_EARNED_SUBJECT,
    html: referralPointsEarnedHtml(input),
    text: referralPointsEarnedText(input),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'referral_points_earned' }],
  });
}

export async function sendStoreOrderConfirmedEmail(
  input: StoreOrderConfirmedTemplateData & { to: string }
): Promise<SendEmailResult> {
  return sendEmail({
    role: 'guild',
    to: input.to,
    subject: STORE_ORDER_CONFIRMED_SUBJECT,
    html: storeOrderConfirmedHtml(input),
    text: storeOrderConfirmedText(input),
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    tags: [{ name: 'category', value: 'store_order_confirmed' }],
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
