'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, Link2, QrCode } from 'lucide-react';
import type { QrPreset } from '@/lib/admin/qr-presets';

type QrStyle = 'print' | 'dark' | 'transparent';
type QrSize = 512 | 1024 | 2048;

const SIZE_OPTIONS: { value: QrSize; label: string; hint: string }[] = [
  { value: 512, label: '512 px', hint: 'Redes sociais e telas' },
  { value: 1024, label: '1024 px', hint: 'Flyers e cartões' },
  { value: 2048, label: '2048 px', hint: 'Impressão em alta resolução' },
];

const STYLE_OPTIONS: { value: QrStyle; label: string; hint: string }[] = [
  { value: 'print', label: 'Impressão', hint: 'Preto no branco' },
  { value: 'dark', label: 'Fundo escuro', hint: 'Branco no preto' },
  { value: 'transparent', label: 'Transparente', hint: 'Só o QR, fundo PNG' },
];

function styleColors(style: QrStyle) {
  switch (style) {
    case 'dark':
      return { dark: '#ffffff', light: '#0c0a09' };
    case 'transparent':
      return { dark: '#000000', light: '#00000000' };
    default:
      return { dark: '#000000', light: '#ffffff' };
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

interface Props {
  defaultSiteUrl: string;
  presets: QrPreset[];
}

export default function AdminQrGeneratorClient({ defaultSiteUrl, presets }: Props) {
  const [targetUrl, setTargetUrl] = useState(presets[0]?.url ?? defaultSiteUrl);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    presets[0]?.id ?? null
  );
  const [size, setSize] = useState<QrSize>(1024);
  const [style, setStyle] = useState<QrStyle>('print');
  const [margin, setMargin] = useState(2);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const colors = useMemo(() => styleColors(style), [style]);

  const generateQr = useCallback(async () => {
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      setPreviewDataUrl(null);
      setError('Informe uma URL válida.');
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setPreviewDataUrl(null);
      setError('URL inválida. Use o formato completo, ex.: https://dungeonbox.com.br/loja');
      return;
    }

    try {
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(trimmed, {
        width: Math.min(size, 512),
        margin,
        errorCorrectionLevel: 'M',
        color: colors,
      });
      setPreviewDataUrl(dataUrl);
      setError(null);
    } catch {
      setPreviewDataUrl(null);
      setError('Não foi possível gerar o QR Code. Verifique a URL e tente novamente.');
    }
  }, [colors, margin, size, targetUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void generateQr();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [generateQr]);

  function selectPreset(preset: QrPreset) {
    setActivePresetId(preset.id);
    setTargetUrl(preset.url);
    setError(null);
    setCopyMessage(null);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(targetUrl.trim());
      setCopyMessage('URL copiada.');
      window.setTimeout(() => setCopyMessage(null), 2000);
    } catch {
      setCopyMessage('Não foi possível copiar.');
    }
  }

  async function downloadPng() {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    try {
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(trimmed, {
        width: size,
        margin,
        errorCorrectionLevel: 'M',
        color: colors,
      });

      const link = document.createElement('a');
      const presetSlug = activePresetId ? slugify(activePresetId) : 'personalizado';
      link.href = dataUrl;
      link.download = `dungeonbox-qr-${presetSlug}-${size}.png`;
      link.click();
    } catch {
      setError('Falha ao exportar o PNG.');
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <div className="space-y-6">
        <section className="admin-panel rounded p-5 md:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Destinos rápidos
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Atalhos do site para material publicitário. Você também pode colar qualquer
            URL com parâmetros UTM.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {presets.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`rounded border px-3 py-3 text-left transition-colors ${
                    active
                      ? 'border-console/40 bg-console/10'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <p
                    className={`font-mono text-[11px] uppercase tracking-wider ${
                      active ? 'text-console' : 'text-zinc-300'
                    }`}
                  >
                    {preset.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="admin-panel space-y-5 rounded p-5 md:p-6">
          <div>
            <label
              htmlFor="qr-url"
              className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500"
            >
              URL do QR Code
            </label>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Link2
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                  aria-hidden="true"
                />
                <input
                  id="qr-url"
                  type="url"
                  value={targetUrl}
                  onChange={(e) => {
                    setTargetUrl(e.target.value);
                    setActivePresetId(null);
                    setCopyMessage(null);
                  }}
                  placeholder="https://dungeonbox.com.br/"
                  className="w-full rounded border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <button
                type="button"
                onClick={() => void copyUrl()}
                className="inline-flex shrink-0 items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-console/30 hover:text-console"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar
              </button>
            </div>
            {copyMessage ? (
              <p className="mt-2 font-mono text-[11px] text-console">{copyMessage}</p>
            ) : null}
            <p className="mt-2 font-mono text-[11px] text-zinc-600">
              Base do site: {defaultSiteUrl}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="qr-size"
                className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500"
              >
                Tamanho do download
              </label>
              <select
                id="qr-size"
                value={size}
                onChange={(e) => setSize(Number(e.target.value) as QrSize)}
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
              >
                {SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.hint}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="qr-style"
                className="block font-mono text-[11px] uppercase tracking-widest text-zinc-500"
              >
                Estilo
              </label>
              <select
                id="qr-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as QrStyle)}
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
              >
                {STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.hint}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="qr-margin"
              className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-zinc-500"
            >
              Margem
              <span className="text-zinc-400">{margin}</span>
            </label>
            <input
              id="qr-margin"
              type="range"
              min={0}
              max={8}
              step={1}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="mt-3 w-full accent-console"
            />
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="admin-panel sticky top-6 rounded p-5 md:p-6">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-console" aria-hidden="true" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Pré-visualização
            </p>
          </div>

          <div
            className={`mt-4 flex min-h-[280px] items-center justify-center rounded border border-zinc-800 p-6 ${
              style === 'dark' ? 'bg-stone-950' : 'bg-white'
            }`}
          >
            {previewDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDataUrl}
                alt="Pré-visualização do QR Code"
                className="h-auto max-h-64 w-full max-w-64 object-contain"
              />
            ) : (
              <p className="text-center text-sm text-zinc-500">
                Informe uma URL válida para gerar o QR Code.
              </p>
            )}
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Exporte em PNG para flyers, cartões, adesivos e posts. Para impressão
              profissional, use 2048 px.
            </p>
          )}

          <button
            type="button"
            onClick={() => void downloadPng()}
            disabled={!previewDataUrl}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-console/40 bg-console/15 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-console transition-colors hover:bg-console/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar PNG ({size}px)
          </button>
        </section>
      </aside>
    </div>
  );
}
