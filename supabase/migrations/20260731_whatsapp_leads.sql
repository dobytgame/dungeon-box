-- Leads capturados pelo widget flutuante de WhatsApp (LP / loja)

CREATE TABLE whatsapp_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  phone_e164    text NOT NULL,
  source        text NOT NULL DEFAULT 'floating_widget',
  page_path     text,
  page_url      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_leads_email_idx ON whatsapp_leads (email);
CREATE INDEX whatsapp_leads_phone_idx ON whatsapp_leads (phone_e164);
CREATE INDEX whatsapp_leads_created_at_idx ON whatsapp_leads (created_at DESC);

ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE whatsapp_leads IS
  'Leads do popup de WhatsApp (nome, e-mail, celular) antes de abrir o chat.';
