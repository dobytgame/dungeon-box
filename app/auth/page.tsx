import { redirect } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import AuthForm from '@/components/auth/AuthForm';
import { createClient } from '@/lib/supabase/server';

interface Props {
  searchParams: { next?: string };
}

export default async function AuthPage({ searchParams }: Props) {
  const next = searchParams.next ?? '/dashboard';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(safeNext);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-stone-950 px-4 py-16 noise">
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-40"
        aria-hidden="true"
      />

      <div className="relative z-10 mb-10">
        <Logo variant="nav" />
      </div>

      <div className="relative z-10 w-full max-w-md border border-white/[0.06] bg-stone-950/80 p-8 backdrop-blur-sm">
        <h1 className="font-display text-3xl uppercase tracking-wide text-white">
          Entrar na <span className="text-ember">Dungeon</span>
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Acesse seu painel, assinatura e entregas.
        </p>

        <div className="mt-8">
          <AuthForm redirectTo={next} />
        </div>
      </div>
    </div>
  );
}
