'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'register' | 'magic' | 'forgot';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

interface Props {
  redirectTo?: string;
}

export default function AuthForm({ redirectTo = '/dashboard' }: Props) {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  async function handleOAuth(provider: 'google' | 'discord') {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (mode === 'forgot') {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      setMessage(data.message ?? data.error ?? 'Verifique seu e-mail.');
    } else if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      setMessage(error ? error.message : 'Link enviado! Verifique seu e-mail.');
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl },
      });
      if (!error) {
        void fetch('/api/auth/account-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      }
      setMessage(error ? error.message : 'Conta criada! Verifique seu e-mail.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        window.location.href = redirectTo;
        return;
      }
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 bg-white px-4 py-3 font-semibold text-stone-900 transition hover:bg-stone-100 disabled:opacity-50"
        >
          <GoogleIcon />
          Continuar com Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('discord')}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 bg-[#5865F2] px-4 py-3 font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-50"
        >
          <DiscordIcon />
          Continuar com Discord
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-sm text-stone-500">ou com e-mail</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full border border-stone-700 bg-stone-900 px-4 py-3 text-white placeholder-stone-500 transition focus:border-frost focus:outline-none"
        />

        {mode !== 'magic' && mode !== 'forgot' && (
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="w-full border border-stone-700 bg-stone-900 px-4 py-3 text-white placeholder-stone-500 transition focus:border-frost focus:outline-none"
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ember py-3 font-display text-sm uppercase tracking-wider text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
        >
          {loading
            ? 'Aguarde...'
            : mode === 'register'
              ? 'Criar conta'
              : mode === 'magic'
                ? 'Enviar magic link'
                : mode === 'forgot'
                  ? 'Enviar link de recuperação'
                  : 'Entrar'}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-sm text-frost" role="status">
          {message}
        </p>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
        Ao continuar, você concorda com os{' '}
        <Link href="/termos" className="text-stone-400 underline-offset-2 hover:text-ember hover:underline">
          Termos de Uso
        </Link>{' '}
        e a{' '}
        <Link href="/privacidade" className="text-stone-400 underline-offset-2 hover:text-ember hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <div className="mt-4 flex flex-col gap-2 text-center text-sm text-stone-400">
        {mode === 'forgot' && (
          <p className="text-xs text-stone-500">
            Enviaremos um link para você cadastrar uma nova senha com segurança.
          </p>
        )}
        {mode === 'login' && (
          <>
            <button type="button" onClick={() => setMode('register')} className="hover:text-white">
              Não tem conta? <span className="text-ember">Criar conta</span>
            </button>
            <button type="button" onClick={() => setMode('forgot')} className="hover:text-white">
              Esqueci minha senha
            </button>
            <button type="button" onClick={() => setMode('magic')} className="hover:text-white">
              Entrar sem senha (magic link)
            </button>
          </>
        )}
        {mode !== 'login' && (
          <button type="button" onClick={() => setMode('login')} className="hover:text-white">
            Já tenho conta · <span className="text-ember">Fazer login</span>
          </button>
        )}
      </div>
    </div>
  );
}
