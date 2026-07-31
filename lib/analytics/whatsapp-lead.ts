import { pushDataLayer } from '@/lib/analytics/data-layer';

export type WhatsAppLeadTrackingContext = {
  source: string;
  pagePath?: string | null;
};

export function trackWhatsAppWidgetOpen(context: WhatsAppLeadTrackingContext): void {
  pushDataLayer({
    event: 'whatsapp_widget_open',
    lead_source: context.source,
    page_path: context.pagePath ?? undefined,
  });
}

export function trackWhatsAppLeadSubmit(input: {
  source: string;
  pagePath?: string | null;
  email: string;
}): void {
  pushDataLayer({
    event: 'generate_lead',
    lead_source: input.source,
    lead_type: 'whatsapp',
    page_path: input.pagePath ?? undefined,
    user_data: {
      email: input.email.trim().toLowerCase(),
    },
  });

  pushDataLayer({
    event: 'whatsapp_lead_submit',
    lead_source: input.source,
    page_path: input.pagePath ?? undefined,
  });

  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', {
      content_name: 'whatsapp_widget',
      content_category: input.source,
    });
  }
}
