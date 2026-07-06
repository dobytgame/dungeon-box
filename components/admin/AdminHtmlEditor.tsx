'use client';

import { useRef, useState } from 'react';
import ProductDescriptionContent from '@/components/shop/ProductDescriptionContent';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

const toolbarButtonClass =
  'rounded-sm border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-400 hover:border-white/20 hover:text-stone-200';

interface Props {
  name?: string;
  label?: string;
  defaultValue?: string | null;
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  textarea.value = next;
  textarea.focus();
  const cursor = start + before.length + selected.length + after.length;
  textarea.setSelectionRange(cursor, cursor);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function AdminHtmlEditor({
  name = 'page_content_html',
  label = 'Conteúdo da página (HTML)',
  defaultValue = '',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [html, setHtml] = useState(defaultValue ?? '');

  function applyTag(before: string, after: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    wrapSelection(textarea, before, after);
    setHtml(textarea.value);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
        <div className="inline-flex rounded-sm border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`rounded-sm px-2.5 py-1 text-[10px] uppercase tracking-wider ${
              mode === 'edit' ? 'bg-console/15 text-console' : 'text-stone-500'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`rounded-sm px-2.5 py-1 text-[10px] uppercase tracking-wider ${
              mode === 'preview' ? 'bg-console/15 text-console' : 'text-stone-500'
            }`}
          >
            Visualizar
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => applyTag('<strong>', '</strong>')}
            >
              Negrito
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => applyTag('<em>', '</em>')}
            >
              Itálico
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => applyTag('<h2>', '</h2>')}
            >
              Título
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => applyTag('<p>', '</p>')}
            >
              Parágrafo
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => applyTag('<ul>\n<li>', '</li>\n</ul>')}
            >
              Lista
            </button>
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => applyTag('<a href="">', '</a>')}
            >
              Link
            </button>
          </div>

          <textarea
            ref={textareaRef}
            id={name}
            name={name}
            rows={14}
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 font-mono text-sm text-white"
            placeholder="<p>Descrição completa do produto...</p>"
          />
        </>
      ) : (
        <div className="min-h-48 rounded-sm border border-white/10 bg-stone-950/60 px-5 py-4">
          <ProductDescriptionContent
            html={html || '<p class="text-stone-600">Nenhum conteúdo ainda.</p>'}
          />
        </div>
      )}

      <p className="text-xs text-stone-500">
        HTML exibido na página pública do produto. Use tags como{' '}
        <code className="text-stone-400">&lt;p&gt;</code>,{' '}
        <code className="text-stone-400">&lt;ul&gt;</code>,{' '}
        <code className="text-stone-400">&lt;img&gt;</code>.
      </p>
    </div>
  );
}
