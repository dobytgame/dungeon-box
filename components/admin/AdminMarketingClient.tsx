'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getMarketingAudienceCountAction,
  previewMarketingCampaignAction,
  previewUnconvertedLeadCampaignAction,
  sendMarketingCampaignAction,
  sendUnconvertedLeadCampaignAction,
} from '@/lib/admin/actions';
import { MARKETING_COPY_PRESETS } from '@/lib/admin/marketing-copies';
import { MARKETING_AUDIENCE_LABELS } from '@/lib/admin/marketing-audience';
import type { MarketingAudience, MarketingTemplateId } from '@/lib/admin/types';

const AUDIENCES = Object.keys(MARKETING_AUDIENCE_LABELS) as MarketingAudience[];

interface Props {
  initialAudienceCounts: Partial<Record<MarketingAudience, number>>;
}

export default function AdminMarketingClient({ initialAudienceCounts }: Props) {
  const [subject, setSubject] = useState(MARKETING_COPY_PRESETS[0]!.subject);
  const [title, setTitle] = useState(MARKETING_COPY_PRESETS[0]!.title);
  const [body, setBody] = useState(MARKETING_COPY_PRESETS[0]!.body);
  const [ctaLabel, setCtaLabel] = useState(
    MARKETING_COPY_PRESETS[0]!.ctaLabel ?? ''
  );
  const [ctaHref, setCtaHref] = useState(
    MARKETING_COPY_PRESETS[0]!.ctaHref ?? ''
  );
  const [audience, setAudience] = useState<MarketingAudience>('admin_test');
  const [activeTemplate, setActiveTemplate] = useState<MarketingTemplateId | null>(
    null
  );
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState(
    initialAudienceCounts.admin_test ?? 1
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getMarketingAudienceCountAction(audience);
      setRecipientCount(result.count);
    });
  }, [audience]);

  function loadPreset(id: string) {
    const preset = MARKETING_COPY_PRESETS.find((copy) => copy.id === id);
    if (!preset) return;
    setSubject(preset.subject);
    setTitle(preset.title);
    setBody(preset.body);
    setCtaLabel(preset.ctaLabel ?? '');
    setCtaHref(preset.ctaHref ?? '');
    setActiveTemplate(preset.template ?? null);
    if (preset.defaultAudience) {
      setAudience(preset.defaultAudience);
    }
    setPreviewHtml(null);
    setMessage(null);
    setError(null);
  }

  const isStructuredTemplate = activeTemplate === 'unconverted_lead';

  function handlePreview() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = isStructuredTemplate
        ? await previewUnconvertedLeadCampaignAction()
        : await previewMarketingCampaignAction({
            subject,
            title,
            body,
            ctaLabel,
            ctaHref,
          });
      if ('error' in result && result.error) {
        setError(result.error);
        setPreviewHtml(null);
        return;
      }
      setPreviewHtml(result.html ?? null);
    });
  }

  function handleSend() {
    setMessage(null);
    setError(null);

    const audienceLabel = MARKETING_AUDIENCE_LABELS[audience];
    const confirmed = window.confirm(
      isStructuredTemplate
        ? `Enviar campanha "Lead não convertido" para ${recipientCount} destinatário(s)?\n\nPúblico: ${audienceLabel}\nAssunto: ${subject}`
        : `Enviar campanha para ${recipientCount} destinatário(s)?\n\nPúblico: ${audienceLabel}\nAssunto: ${subject}`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = isStructuredTemplate
        ? await sendUnconvertedLeadCampaignAction({
            audience,
            confirm: true,
          })
        : await sendMarketingCampaignAction({
            subject,
            title,
            body,
            audience,
            ctaLabel,
            ctaHref,
            confirm: true,
          });

      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }

      setMessage(
        `Campanha enviada: ${result.sent} de ${result.total} e-mail(s).${
          result.failed ? ` ${result.failed} falha(s).` : ''
        }`
      );
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-6">
        <section className="admin-panel rounded p-5 md:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Copys de exemplo
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Selecione um modelo para preencher título e conteúdo. Edite livremente
            antes de enviar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MARKETING_COPY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPreset(preset.id)}
                className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-console/30 hover:text-console"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel space-y-5 rounded p-5 md:p-6">
          {isStructuredTemplate ? (
            <div className="rounded border border-console/20 bg-console/5 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-console">
                Template estruturado
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
              <p className="mt-3 font-mono text-[11px] text-zinc-500">
                Assunto fixo: {subject}
              </p>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">
                Personalização automática do nome do destinatário.
              </p>
            </div>
          ) : null}

          <div>
            <label htmlFor="mkt-audience" className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              Público
            </label>
            <select
              id="mkt-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as MarketingAudience)}
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
            >
              {AUDIENCES.map((key) => (
                <option key={key} value={key}>
                  {MARKETING_AUDIENCE_LABELS[key]}
                  {initialAudienceCounts[key] != null
                    ? ` (${initialAudienceCounts[key]})`
                    : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 font-mono text-[11px] text-console">
              {recipientCount} destinatário(s) selecionado(s)
            </p>
          </div>

          <div>
            <label htmlFor="mkt-subject" className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              Assunto do e-mail
            </label>
            <input
              id="mkt-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              readOnly={isStructuredTemplate}
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 disabled:opacity-70"
              placeholder="Assunto que aparece na caixa de entrada"
            />
          </div>

          {!isStructuredTemplate ? (
            <>
          <div>
            <label htmlFor="mkt-title" className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              Título (headline)
            </label>
            <input
              id="mkt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
              placeholder="Título principal dentro do e-mail"
            />
          </div>

          <div>
            <label htmlFor="mkt-body" className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              Conteúdo
            </label>
            <textarea
              id="mkt-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm leading-relaxed text-zinc-100"
              placeholder="Texto da campanha. Use linha em branco para separar parágrafos."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mkt-cta-label" className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                Botão (opcional)
              </label>
              <input
                id="mkt-cta-label"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
                placeholder="Ex: Ver planos"
              />
            </div>
            <div>
              <label htmlFor="mkt-cta-href" className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                Link do botão
              </label>
              <input
                id="mkt-cta-href"
                value={ctaHref}
                onChange={(e) => setCtaHref(e.target.value)}
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
                placeholder="/dashboard ou URL completa"
              />
            </div>
          </div>
            </>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-zinc-800/80 pt-5">
            <button
              type="button"
              onClick={handlePreview}
              disabled={pending}
              className="rounded border border-zinc-700 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
            >
              Atualizar preview
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={pending || recipientCount === 0}
              className="rounded bg-console px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-stone-950 hover:bg-console/90 disabled:opacity-50"
            >
              {pending ? 'Processando…' : 'Enviar campanha'}
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center px-2 py-2.5 font-mono text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
            >
              Voltar ao dashboard
            </Link>
          </div>

          {error ? (
            <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded border border-console/30 bg-console/10 px-3 py-2 text-sm text-console" role="status">
              {message}
            </p>
          ) : null}
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="admin-panel rounded p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Preview
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Layout DungeonBox via Resend · remetente marketing
          </p>
        </div>
        <div className="admin-panel overflow-hidden rounded">
          {previewHtml ? (
            <iframe
              title="Preview do e-mail marketing"
              srcDoc={previewHtml}
              className="h-[min(70vh,720px)] w-full border-0 bg-zinc-950"
              sandbox=""
            />
          ) : (
            <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-zinc-500">
              Clique em &quot;Atualizar preview&quot; para ver o e-mail renderizado.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
