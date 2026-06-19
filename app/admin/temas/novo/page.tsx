import Link from 'next/link';
import ThemeForm from '@/components/admin/ThemeForm';

export default function AdminNewThemePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/temas"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para temas
      </Link>
      <ThemeForm />
    </div>
  );
}
