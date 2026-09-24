export const UGC_RPG_SYSTEMS = [
  { value: 'dnd', label: 'D&D' },
  { value: 'pathfinder', label: 'Pathfinder' },
  { value: 'tormenta', label: 'Tormenta' },
  { value: 'ordem_paranormal', label: 'Ordem Paranormal' },
  { value: 'old_dragon', label: 'Old Dragon' },
  { value: 'outro_rpg', label: 'Outro RPG' },
  { value: 'nao_rpg', label: 'Não era RPG / outro tipo de jogo' },
] as const;

export const UGC_PLAYER_COUNTS = [
  { value: '1-2', label: '1–2' },
  { value: '3-4', label: '3–4' },
  { value: '5-6', label: '5–6' },
  { value: '7-8', label: '7–8' },
  { value: '8+', label: 'Mais de 8' },
] as const;

export const UGC_SESSION_TYPES = [
  { value: 'campanha', label: 'Sessão normal da campanha' },
  { value: 'batalha', label: 'Batalha especial' },
  { value: 'chefe', label: 'Encontro com chefe' },
  { value: 'exploracao', label: 'Exploração' },
  { value: 'oneshot', label: 'One-shot' },
  { value: 'especial', label: 'Sessão especial' },
  { value: 'outro', label: 'Outro' },
] as const;

export const UGC_LIKED_MOST = [
  { value: 'montar', label: 'A possibilidade de montar a dungeon' },
  { value: 'combate', label: 'Usar o cenário durante o combate' },
  { value: 'visual', label: 'O visual das peças' },
  { value: 'modularidade', label: 'A modularidade' },
  { value: 'miniaturas', label: 'A interação com as miniaturas' },
  { value: 'mapas', label: 'Criar mapas diferentes' },
  { value: 'tema', label: 'O tema do kit' },
  { value: 'outro', label: 'Outro' },
] as const;

export const UGC_RPG_EXPERIENCE = [
  { value: 'comecando', label: 'Estou começando agora' },
  { value: 'menos_1', label: 'Menos de 1 ano' },
  { value: '1_3', label: '1–3 anos' },
  { value: '3_5', label: '3–5 anos' },
  { value: 'mais_5', label: 'Mais de 5 anos' },
] as const;

export const UGC_FIRST_3D = [
  { value: 'sim', label: 'Sim!' },
  { value: 'nao', label: 'Não, já utilizávamos' },
  { value: 'algumas', label: 'Já tínhamos utilizado algumas vezes' },
] as const;

export const UGC_USAGE_TAGS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Site' },
  { value: 'anuncio', label: 'Anúncio' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'mesa_da_semana', label: 'Mesa da Semana' },
] as const;

export const UGC_POTENTIALS = [
  { value: 'ugc_normal', label: 'UGC normal' },
  { value: 'destaque', label: 'Destaque' },
  { value: 'alto_potencial', label: 'Alto potencial' },
] as const;

export type UgcRpgSystem = (typeof UGC_RPG_SYSTEMS)[number]['value'];
export type UgcPlayerCount = (typeof UGC_PLAYER_COUNTS)[number]['value'];
export type UgcSessionType = (typeof UGC_SESSION_TYPES)[number]['value'];
export type UgcLikedMost = (typeof UGC_LIKED_MOST)[number]['value'];
export type UgcRpgExperience = (typeof UGC_RPG_EXPERIENCE)[number]['value'];
export type UgcFirst3d = (typeof UGC_FIRST_3D)[number]['value'];
export type UgcUsageTag = (typeof UGC_USAGE_TAGS)[number]['value'];
export type UgcPotential = (typeof UGC_POTENTIALS)[number]['value'];

export function optionLabel<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return options.find((item) => item.value === value)?.label ?? value;
}
