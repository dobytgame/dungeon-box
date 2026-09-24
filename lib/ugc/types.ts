import type {
  UgcFirst3d,
  UgcLikedMost,
  UgcPlayerCount,
  UgcPotential,
  UgcRpgExperience,
  UgcRpgSystem,
  UgcSessionType,
  UgcUsageTag,
} from '@/lib/ugc/options';

export type UgcContentStatus = 'pending' | 'approved' | 'rejected';
export type UgcRewardStatus = 'none' | 'queued' | 'sent';
export type UgcPeopleVisibility = 'none' | 'adults' | 'minors';
export type UgcCreditPreference = 'name' | 'instagram' | 'both' | 'none';

export type UgcMediaInput = {
  path: string;
  mimeType: string;
  byteSize: number;
  originalName?: string | null;
  durationSeconds?: number | null;
};

export type UgcSubmissionListItem = {
  id: string;
  contentStatus: UgcContentStatus;
  rewardStatus: UgcRewardStatus;
  context: string;
  createdAt: string;
  mediaCount: number;
};

export type {
  UgcFirst3d,
  UgcLikedMost,
  UgcPlayerCount,
  UgcPotential,
  UgcRpgExperience,
  UgcRpgSystem,
  UgcSessionType,
  UgcUsageTag,
};
