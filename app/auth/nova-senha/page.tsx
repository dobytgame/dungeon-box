import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Nova senha — DungeonBox',
  description: 'Defina uma nova senha para sua conta DungeonBox.',
};

export default function NovaSenhaPage() {
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
          Nova <span className="text-ember">senha</span>
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Escolha uma senha forte para proteger sua conta na Guilda.
        </p>

        <div className="mt-8">
          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          <Link href="/auth" className="text-stone-400 hover:text-ember">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
