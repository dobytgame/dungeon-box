import { z } from 'zod';

export const marketingAttributionInputSchema = z
  .object({
    utmSource: z.string().trim().max(128).nullable().optional(),
    utmMedium: z.string().trim().max(128).nullable().optional(),
    utmCampaign: z.string().trim().max(128).nullable().optional(),
    utmContent: z.string().trim().max(128).nullable().optional(),
    utmTerm: z.string().trim().max(128).nullable().optional(),
    fbclid: z.string().trim().max(256).nullable().optional(),
    capturedAt: z.string().trim().max(64).nullable().optional(),
    landingPath: z.string().trim().max(512).nullable().optional(),
  })
  .optional()
  .nullable();

export type MarketingAttributionInput = z.infer<
  typeof marketingAttributionInputSchema
>;

export type MarketingAttributionRecord = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  captured_at?: string | null;
  landing_path?: string | null;
};

export function marketingAttributionToRecord(
  input: MarketingAttributionInput | MarketingAttributionRecord | null | undefined
): MarketingAttributionRecord | null {
  if (!input || typeof input !== 'object') return null;

  if ('utm_source' in input || 'fbclid' in input) {
    return input as MarketingAttributionRecord;
  }

  const parsed = marketingAttributionInputSchema.safeParse(input);
  if (!parsed.success || !parsed.data) return null;

  const value = parsed.data;
  const hasAny = Object.values(value).some((v) => Boolean(v?.toString().trim()));
  if (!hasAny) return null;

  return {
    utm_source: value.utmSource?.trim() || null,
    utm_medium: value.utmMedium?.trim() || null,
    utm_campaign: value.utmCampaign?.trim() || null,
    utm_content: value.utmContent?.trim() || null,
    utm_term: value.utmTerm?.trim() || null,
    fbclid: value.fbclid?.trim() || null,
    captured_at: value.capturedAt?.trim() || null,
    landing_path: value.landingPath?.trim() || null,
  };
}

export function parseMarketingAttributionJson(
  raw: unknown
): MarketingAttributionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as MarketingAttributionRecord;
}

export function isMetaAdsAttribution(
  att: MarketingAttributionRecord | null | undefined
): boolean {
  if (!att) return false;
  if (att.fbclid?.trim()) return true;

  const source = att.utm_source?.trim().toLowerCase() ?? '';
  const medium = att.utm_medium?.trim().toLowerCase() ?? '';

  const metaSources = ['facebook', 'fb', 'instagram', 'ig', 'meta'];
  if (metaSources.some((key) => source.includes(key))) return true;

  if (
    (medium.includes('paid') || medium.includes('cpc') || medium.includes('ads')) &&
    metaSources.some((key) => source.includes(key) || medium.includes(key))
  ) {
    return true;
  }

  return false;
}

export function isMetaWhatsAppLead(input: {
  utm_source?: string | null;
  utm_medium?: string | null;
}): boolean {
  return isMetaAdsAttribution({
    utm_source: input.utm_source,
    utm_medium: input.utm_medium,
  });
}
