'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { establishRecoverySession } from '@/lib/auth/recovery-session';
import { createClient } from '@/lib/supabase/client';

type Status = 'loading' | 'ready' | 'invalid';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      const result = await establishRecoverySession(supabase);

      if (cancelled) return;

      if (result === 'ready') {
        setStatus('ready');
        return;
      }

      if (result === 'invalid') {
        setStatus('invalid');
        return;
      }

      setStatus('invalid');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
      }
    });

    void prepareRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  if (status === 'loading') {
    return (
      <p className="text-center text-sm text-stone-400" role="status">
        Validando seu link de recuperação…
      </p>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="text-center">
        <p className="text-sm text-stone-300">
          Este link expirou ou já foi usado. Solicite um novo e-mail de recuperação.
        </p>
        <Link
          href="/auth"
          className="mt-6 inline-block font-display text-sm uppercase tracking-wider text-ember hover:text-ember-bright"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        className="w-full border border-stone-700 bg-stone-900 px-4 py-3 text-white placeholder-stone-500 transition focus:border-frost focus:outline-none"
      />
      <input
        type="password"
        placeholder="Confirmar nova senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        className="w-full border border-stone-700 bg-stone-900 px-4 py-3 text-white placeholder-stone-500 transition focus:border-frost focus:outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ember py-3 font-display text-sm uppercase tracking-wider text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
      >
        {loading ? 'Salvando…' : 'Cadastrar nova senha'}
      </button>

      {message && (
        <p className="text-center text-sm text-frost" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
