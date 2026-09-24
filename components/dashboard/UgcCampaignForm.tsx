'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { createClient } from '@/lib/supabase/client';
import {
  UGC_CONSENT_CONTENT_TEXT,
  UGC_CONSENT_GUILDA_TEXT,
  UGC_CONSENT_LIKENESS_TEXT,
  UGC_CONSENT_MINORS_TEXT,
  UGC_CONSENT_REWARD_TEXT,
} from '@/lib/ugc/consent';
import {
  UGC_BUCKET,
  UGC_MAX_FILES,
  isUgcVideoMime,
  ugcMaxBytesForMime,
} from '@/lib/ugc/constants';
import {
  UGC_FIRST_3D,
  UGC_LIKED_MOST,
  UGC_PLAYER_COUNTS,
  UGC_RPG_EXPERIENCE,
  UGC_RPG_SYSTEMS,
  UGC_SESSION_TYPES,
} from '@/lib/ugc/options';
import { formatStoreKitThemeLabel, type StoreKitTheme } from '@/lib/store/kit-themes';
import type { UgcCreditPreference, UgcPeopleVisibility } from '@/lib/ugc/types';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

const fieldClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-ember/50 focus:outline-none';

type PendingMedia = {
  path: string;
  previewUrl: string;
  name: string;
  size: number;
  mimeType: string;
  durationSeconds: number | null;
};

interface Props {
  displayName: string;
  email: string;
  kitThemes: StoreKitTheme[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

async function uploadFile(file: File): Promise<Omit<PendingMedia, 'previewUrl'>> {
  const mimeType = file.type || 'image/jpeg';
  const max = ugcMaxBytesForMime(mimeType);
  if (file.size > max) {
    throw new Error(
      `${file.name} passa de ${Math.round(max / (1024 * 1024))} MB.`
    );
  }

  const response = await fetch('/api/ugc/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType,
      byteSize: file.size,
    }),
  });
  const payload = (await response.json()) as {
    path?: string;
    token?: string;
    error?: string;
  };
  if (!response.ok || !payload.path || !payload.token) {
    throw new Error(payload.error ?? 'Falha ao preparar o envio.');
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(UGC_BUCKET)
    .uploadToSignedUrl(payload.path, payload.token, file);
  if (error) {
    throw new Error(error.message || 'Falha ao enviar arquivo.');
  }

  return {
    path: payload.path,
    name: file.name,
    size: file.size,
    mimeType,
    durationSeconds: isUgcVideoMime(mimeType) ? await readVideoDuration(file) : null,
  };
}

export default function UgcCampaignForm({ displayName, email, kitThemes }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instagram, setInstagram] = useState('');
  const [rpgSystem, setRpgSystem] = useState('');
  const [rpgSystemOther, setRpgSystemOther] = useState('');
  const [playerCount, setPlayerCount] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [sessionTypeOther, setSessionTypeOther] = useState('');
  const [kitThemeIds, setKitThemeIds] = useState<string[]>([]);
  const [kitOther, setKitOther] = useState('');
  const [context, setContext] = useState('');
  const [momentHighlight, setMomentHighlight] = useState('');
  const [tableReaction, setTableReaction] = useState('');
  const [likedMost, setLikedMost] = useState<string[]>([]);
  const [likedMostOther, setLikedMostOther] = useState('');
  const [highlight, setHighlight] = useState('');
  const [rpgExperience, setRpgExperience] = useState('');
  const [first3dSet, setFirst3dSet] = useState('');
  const [peopleVisible, setPeopleVisible] = useState<UgcPeopleVisibility>('none');
  const [creditPreference, setCreditPreference] = useState<UgcCreditPreference>('none');
  const [consentContent, setConsentContent] = useState(false);
  const [consentLikeness, setConsentLikeness] = useState(false);
  const [consentReward, setConsentReward] = useState(false);
  const [consentGuilda, setConsentGuilda] = useState(false);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function toggleValue(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (media.length + files.length > UGC_MAX_FILES) {
      setError(`Envie no máximo ${UGC_MAX_FILES} arquivos.`);
      return;
    }

    setError('');
    setUploading(true);
    try {
      const uploaded: PendingMedia[] = [];
      for (const file of files) {
        const item = await uploadFile(file);
        uploaded.push({ ...item, previewUrl: URL.createObjectURL(file) });
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Falha ao enviar arquivo.'
      );
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(path: string) {
    setMedia((prev) => {
      const removed = prev.find((item) => item.path === path);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.path !== path);
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (peopleVisible === 'minors') {
      setError(UGC_CONSENT_MINORS_TEXT);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/ugc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram: instagram.trim() || null,
          rpgSystem,
          rpgSystemOther: rpgSystemOther.trim() || null,
          playerCount,
          sessionType,
          sessionTypeOther: sessionTypeOther.trim() || null,
          kitThemeIds,
          kitOther: kitOther.trim() || null,
          context: context.trim(),
          momentHighlight: momentHighlight.trim() || null,
          tableReaction: tableReaction.trim() || null,
          likedMost,
          likedMostOther: likedMostOther.trim() || null,
          highlight: highlight.trim() || null,
          rpgExperience: rpgExperience || null,
          first3dSet: first3dSet || null,
          peopleVisible,
          creditPreference,
          consentContent,
          consentLikeness,
          consentReward,
          consentGuilda,
          media: media.map((item) => ({
            path: item.path,
            mimeType: item.mimeType,
            byteSize: item.size,
            originalName: item.name,
            durationSeconds: item.durationSeconds,
          })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Não foi possível enviar.');
      }
      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Não foi possível enviar.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <DashboardCard title="Aventura registrada" accent="ember">
        <p className="text-sm leading-relaxed text-stone-300">
          Sua mesa entrou para os registros da Guilda. A equipe vai analisar o
          conteúdo e, se for aprovado, o brinde segue no próximo kit ainda não
          embalado.
        </p>
        <p className="mt-4 text-sm text-stone-500">
          Enviamos a confirmação no seu e-mail. O envio não garante aprovação
          nem o brinde.
        </p>
      </DashboardCard>
    );
  }

  const blockedByMinors = peopleVisible === 'minors';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DashboardCard
        title="Mostre sua aventura"
        description="A DungeonBox ganha vida quando chega na sua mesa. Envie fotos ou vídeos, conte a cena e autorize o uso — a equipe analisa e, se aprovar, o brinde vai no próximo kit."
        accent="ember"
      >
        <div className="space-y-10">
          <section className="space-y-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-stone-300">
              Sobre você
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Nome</p>
                <p className="mt-2 text-sm text-stone-200">{displayName}</p>
              </div>
              <div>
                <p className={labelClass}>E-mail</p>
                <p className="mt-2 text-sm text-stone-200">{email}</p>
              </div>
            </div>
            <div>
              <label htmlFor="ugc-instagram" className={labelClass}>
                Instagram (opcional)
              </label>
              <input
                id="ugc-instagram"
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
                disabled={submitting}
                placeholder="@seuinstagram"
                className={fieldClass}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-stone-300">
              Sobre sua mesa
            </h3>
            <div>
              <label htmlFor="ugc-system" className={labelClass}>
                Sistema utilizado
              </label>
              <select
                id="ugc-system"
                required
                value={rpgSystem}
                onChange={(event) => setRpgSystem(event.target.value)}
                disabled={submitting}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {UGC_RPG_SYSTEMS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {rpgSystem === 'outro_rpg' ? (
                <input
                  value={rpgSystemOther}
                  onChange={(event) => setRpgSystemOther(event.target.value)}
                  required
                  disabled={submitting}
                  placeholder="Qual RPG?"
                  className={fieldClass}
                />
              ) : null}
            </div>
            <div>
              <label htmlFor="ugc-players" className={labelClass}>
                Número de jogadores
              </label>
              <select
                id="ugc-players"
                required
                value={playerCount}
                onChange={(event) => setPlayerCount(event.target.value)}
                disabled={submitting}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {UGC_PLAYER_COUNTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className={labelClass}>Quais kits aparecem?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {kitThemes.map((theme) => {
                  const checked = kitThemeIds.includes(theme.id);
                  return (
                    <label
                      key={theme.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-3 text-sm ${
                        checked
                          ? 'border-ember/40 bg-ember/10 text-stone-100'
                          : 'border-white/10 text-stone-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setKitThemeIds(toggleValue(kitThemeIds, theme.id))}
                        disabled={submitting}
                        className="accent-ember"
                      />
                      {formatStoreKitThemeLabel(theme)}
                    </label>
                  );
                })}
              </div>
              <input
                value={kitOther}
                onChange={(event) => setKitOther(event.target.value)}
                disabled={submitting}
                placeholder="Outro kit? Descreva (opcional)"
                className={fieldClass}
              />
            </fieldset>
            <div>
              <label htmlFor="ugc-session" className={labelClass}>
                Tipo de sessão
              </label>
              <select
                id="ugc-session"
                required
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value)}
                disabled={submitting}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {UGC_SESSION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {sessionType === 'outro' ? (
                <input
                  value={sessionTypeOther}
                  onChange={(event) => setSessionTypeOther(event.target.value)}
                  required
                  disabled={submitting}
                  placeholder="Qual tipo de sessão?"
                  className={fieldClass}
                />
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-stone-300">
              Fotos e vídeos
            </h3>
            <p className="text-sm leading-relaxed text-stone-500">
              Prefira boa iluminação e a DungeonBox visível. Vídeos curtos,
              de preferência na vertical. Não precisa editar — a gente cuida
              disso. Até {UGC_MAX_FILES} arquivos: foto até 8 MB, vídeo até
              50 MB (JPG, PNG, WebP, MP4, MOV).
            </p>
            {media.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {media.map((item) => (
                  <li
                    key={item.path}
                    className="overflow-hidden rounded-sm border border-white/10 bg-stone-950/60"
                  >
                    {isUgcVideoMime(item.mimeType) ? (
                      <video
                        src={item.previewUrl}
                        className="aspect-[4/3] w-full object-cover"
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate font-mono text-[11px] text-stone-500">
                        {item.name} · {formatBytes(item.size)}
                        {item.durationSeconds
                          ? ` · ${Math.round(item.durationSeconds)}s`
                          : ''}
                      </span>
                      <button
                        type="button"
                        disabled={submitting || uploading}
                        onClick={() => removeMedia(item.path)}
                        className="inline-flex cursor-pointer items-center gap-1 text-xs uppercase tracking-wider text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {media.length < UGC_MAX_FILES ? (
              <>
                <button
                  type="button"
                  disabled={submitting || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-white/15 px-4 py-3 text-sm text-stone-400 hover:border-white/25 hover:text-stone-200 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploading ? 'Enviando…' : 'Adicionar foto ou vídeo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            ) : null}
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-stone-300">
              História da aventura
            </h3>
            <div>
              <label htmlFor="ugc-context" className={labelClass}>
                O que estava acontecendo nessa cena?
              </label>
              <textarea
                id="ugc-context"
                required
                value={context}
                onChange={(event) => setContext(event.target.value)}
                disabled={submitting}
                rows={5}
                maxLength={2000}
                placeholder="Exemplo: O grupo acabou de entrar nas tumbas procurando o artefato, mas encontrou um grupo de mortos-vivos…"
                className={`${fieldClass} resize-y`}
              />
            </div>
            <div>
              <label htmlFor="ugc-moment" className={labelClass}>
                Qual foi o momento mais legal dessa sessão? (opcional)
              </label>
              <textarea
                id="ugc-moment"
                value={momentHighlight}
                onChange={(event) => setMomentHighlight(event.target.value)}
                disabled={submitting}
                rows={3}
                maxLength={2000}
                className={`${fieldClass} resize-y`}
              />
            </div>
            <div>
              <label htmlFor="ugc-reaction" className={labelClass}>
                Como foi a reação da mesa? (opcional)
              </label>
              <textarea
                id="ugc-reaction"
                value={tableReaction}
                onChange={(event) => setTableReaction(event.target.value)}
                disabled={submitting}
                rows={3}
                maxLength={2000}
                placeholder="Todo mundo ficou impressionado quando montamos a dungeon…"
                className={`${fieldClass} resize-y`}
              />
            </div>
            <fieldset>
              <legend className={labelClass}>O que mais gostaram? (opcional)</legend>
              <div className="mt-3 space-y-2">
                {UGC_LIKED_MOST.map((item) => (
                  <label
                    key={item.value}
                    className="flex cursor-pointer items-start gap-3 text-sm text-stone-300"
                  >
                    <input
                      type="checkbox"
                      checked={likedMost.includes(item.value)}
                      onChange={() => setLikedMost(toggleValue(likedMost, item.value))}
                      disabled={submitting}
                      className="mt-0.5 accent-ember"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              {likedMost.includes('outro') ? (
                <input
                  value={likedMostOther}
                  onChange={(event) => setLikedMostOther(event.target.value)}
                  required
                  disabled={submitting}
                  placeholder="O que mais?"
                  className={fieldClass}
                />
              ) : null}
            </fieldset>
            <div>
              <label htmlFor="ugc-phrase" className={labelClass}>
                Uma frase da aventura (opcional)
              </label>
              <input
                id="ugc-phrase"
                value={highlight}
                onChange={(event) => setHighlight(event.target.value)}
                disabled={submitting}
                maxLength={400}
                placeholder="A pior ideia do grupo foi abrir aquela porta."
                className={fieldClass}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-stone-300">
              Perfil da mesa
            </h3>
            <div>
              <label htmlFor="ugc-exp" className={labelClass}>
                Experiência com RPG (opcional)
              </label>
              <select
                id="ugc-exp"
                value={rpgExperience}
                onChange={(event) => setRpgExperience(event.target.value)}
                disabled={submitting}
                className={fieldClass}
              >
                <option value="">Não informar</option>
                {UGC_RPG_EXPERIENCE.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ugc-3d" className={labelClass}>
                Primeira vez com cenário 3D? (opcional)
              </label>
              <select
                id="ugc-3d"
                value={first3dSet}
                onChange={(event) => setFirst3dSet(event.target.value)}
                disabled={submitting}
                className={fieldClass}
              >
                <option value="">Não informar</option>
                {UGC_FIRST_3D.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-stone-300">
              Autorizações
            </h3>
            <fieldset>
              <legend className={labelClass}>Aparecem pessoas identificáveis?</legend>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ['none', 'Não — só a mesa, as peças ou as miniaturas'],
                    ['adults', 'Sim, pessoas adultas'],
                    ['minors', 'Sim, crianças ou adolescentes'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 text-sm text-stone-300"
                  >
                    <input
                      type="radio"
                      name="people-visible"
                      value={value}
                      checked={peopleVisible === value}
                      onChange={() => setPeopleVisible(value)}
                      disabled={submitting}
                      className="mt-0.5 accent-ember"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {blockedByMinors ? (
                <p className="mt-3 text-sm text-amber-300/90">{UGC_CONSENT_MINORS_TEXT}</p>
              ) : null}
            </fieldset>
            <div>
              <label htmlFor="ugc-credit" className={labelClass}>
                Se publicarmos, como prefere ser identificado?
              </label>
              <select
                id="ugc-credit"
                value={creditPreference}
                onChange={(event) =>
                  setCreditPreference(event.target.value as UgcCreditPreference)
                }
                disabled={submitting}
                className={fieldClass}
              >
                <option value="none">Prefiro não ser identificado</option>
                <option value="name">Meu nome</option>
                <option value="instagram">Meu @ do Instagram</option>
                <option value="both">Nome + Instagram</option>
              </select>
            </div>
            <div className="space-y-4 border-t border-white/10 pt-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-300">
                <input
                  type="checkbox"
                  checked={consentContent}
                  onChange={(event) => setConsentContent(event.target.checked)}
                  disabled={submitting || blockedByMinors}
                  required
                  className="mt-1 accent-ember"
                />
                <span>{UGC_CONSENT_CONTENT_TEXT}</span>
              </label>
              {peopleVisible === 'adults' ? (
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-300">
                  <input
                    type="checkbox"
                    checked={consentLikeness}
                    onChange={(event) => setConsentLikeness(event.target.checked)}
                    disabled={submitting}
                    required
                    className="mt-1 accent-ember"
                  />
                  <span>{UGC_CONSENT_LIKENESS_TEXT}</span>
                </label>
              ) : null}
              <fieldset className="space-y-2">
                <legend className="text-sm leading-relaxed text-stone-300">
                  {UGC_CONSENT_GUILDA_TEXT}
                </legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
                  <input
                    type="radio"
                    name="consent-guilda"
                    checked={consentGuilda}
                    onChange={() => setConsentGuilda(true)}
                    disabled={submitting || blockedByMinors}
                    required
                    className="accent-ember"
                  />
                  Sim, autorizo
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
                  <input
                    type="radio"
                    name="consent-guilda"
                    checked={!consentGuilda}
                    onChange={() => setConsentGuilda(false)}
                    disabled={submitting || blockedByMinors}
                    className="accent-ember"
                  />
                  Não autorizo
                </label>
              </fieldset>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-300">
                <input
                  type="checkbox"
                  checked={consentReward}
                  onChange={(event) => setConsentReward(event.target.checked)}
                  disabled={submitting || blockedByMinors}
                  required
                  className="mt-1 accent-ember"
                />
                <span>{UGC_CONSENT_REWARD_TEXT}</span>
              </label>
            </div>
          </section>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || uploading || blockedByMinors}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-6 py-3 font-display text-sm uppercase tracking-widest text-stone-950 hover:bg-ember-bright disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              'Registrar aventura'
            )}
          </button>
        </div>
      </DashboardCard>
    </form>
  );
}
