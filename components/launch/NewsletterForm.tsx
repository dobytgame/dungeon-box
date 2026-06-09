'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  id?: string;
  className?: string;
  buttonLabel?: string;
  source?: string;
}

export default function NewsletterForm({
  id = 'newsletter-email',
  className = '',
  buttonLabel = 'Quero receber',
  source = 'launch_lp',
}: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Não foi possível cadastrar. Tente novamente.');
        return;
      }

      setStatus('success');
      setMessage(data.message ?? 'Pronto! Você entrou na Crônica do Mestre.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente em instantes.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <label htmlFor={id} className="sr-only">
        Seu melhor e-mail
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
            aria-hidden="true"
          />
          <input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'loading' || status === 'success'}
            placeholder="seu@email.com"
            className="w-full rounded-sm border border-white/15 bg-stone-900/80 py-3.5 pl-10 pr-4 text-base text-white placeholder:text-stone-500 transition-colors focus:border-ember/50 focus:outline-none focus:ring-2 focus:ring-ember/30 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-6 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Enviando…
            </>
          ) : (
            buttonLabel
          )}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={`mt-3 text-sm ${
            status === 'error' ? 'text-red-400' : 'text-frost'
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
