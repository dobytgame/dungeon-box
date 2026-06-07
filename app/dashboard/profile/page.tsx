import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import ProfileForm from '@/components/dashboard/ProfileForm';
import {
  formatCpf,
  formatDate,
  formatDateTime,
  formatPhone,
} from '@/lib/dashboard/format';
import { getProfile, requireDashboardUser } from '@/lib/dashboard/queries';

export default async function ProfilePage() {
  const { user } = await requireDashboardUser();
  const profile = await getProfile(user.id);

  if (!profile) {
    return (
      <p className="text-stone-400">Perfil não encontrado. Tente sair e entrar novamente.</p>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <DashboardCard title="Seus dados" accent="frost">
        <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-white/[0.04] pb-6">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ember/30 bg-ember/15 font-display text-xl text-ember">
              {(profile.display_name || profile.full_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display text-lg uppercase tracking-wide text-white">
              {profile.display_name || profile.full_name}
            </p>
            <p className="text-sm text-stone-500">{profile.email}</p>
          </div>
        </div>
        <ProfileForm profile={profile} />
      </DashboardCard>

      <DashboardCard title="Detalhes da conta" accent="none">
        <dl>
          <DataRow label="CPF" value={formatCpf(profile.cpf)} />
          <DataRow label="Telefone" value={formatPhone(profile.phone)} />
          <DataRow label="Nascimento" value={formatDate(profile.birth_date)} />
          <DataRow
            label="Newsletter"
            value={profile.newsletter ? 'Inscrito' : 'Não inscrito'}
          />
          <DataRow label="Membro desde" value={formatDateTime(profile.created_at)} />
        </dl>
      </DashboardCard>
    </div>
  );
}
