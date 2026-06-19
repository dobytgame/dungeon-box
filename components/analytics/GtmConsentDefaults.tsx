import Script from 'next/script';

/** Consent Mode padrão (negado) antes do GTM carregar — exigido para LGPD + tags de marketing. */
export default function GtmConsentDefaults() {
  return (
    <Script id="gtm-consent-defaults" strategy="beforeInteractive">
      {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'consent_default',analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted'});`}
    </Script>
  );
}
