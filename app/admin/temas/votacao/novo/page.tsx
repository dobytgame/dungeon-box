import Link from 'next/link';
import ThemePollForm from '@/components/admin/ThemePollForm';

export default function AdminNewThemePollPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/temas/votacao"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para votação
      </Link>
      <ThemePollForm />
    </div>
  );
}
