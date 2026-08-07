import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function EmailUnsubscribePage({
  searchParams,
}: {
  searchParams?: { token?: string; ok?: string; error?: string };
}) {
  const ok = searchParams?.ok === '1';
  const error = searchParams?.error;
  const token = searchParams?.token;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16">
      <p className="font-display text-xs uppercase tracking-[0.25em] text-ember">
        DungeonBox
      </p>
      <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white">
        {ok ? 'Descadastro confirmado' : error ? 'Não foi possível descadastrar' : 'Descadastrar e-mails'}
      </h1>

      {ok ? (
        <p className="mt-4 text-sm text-stone-400">
          Você não receberá mais comunicados de marketing da DungeonBox. E-mails
          transacionais da assinatura (cobrança, envio, conta) continuam ativos.
        </p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : token ? (
        <form action="/api/email/unsubscribe" method="get" className="mt-6">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-stone-400">
            Confirme para parar de receber comunicados de marketing.
          </p>
          <button
            type="submit"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-sm bg-ember px-5 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Confirmar descadastro
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-stone-400">
          Use o link de descadastro do próprio e-mail, ou desative a newsletter
          em{' '}
          <Link href="/dashboard/profile" className="text-ember hover:underline">
            Meu perfil
          </Link>
          .
        </p>
      )}

      <Link
        href="/"
        className="mt-10 inline-flex font-display text-xs uppercase tracking-widest text-stone-500 hover:text-white"
      >
        Voltar ao site
      </Link>
    </main>
  );
}
