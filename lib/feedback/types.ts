export type UserFeedback = {
  id: string;
  user_id: string;
  subscription_cycle_id: string;
  rating: number;
  message: string | null;
  image_paths: string[];
  created_at: string;
};

export type FeedbackCycleOption = {
  id: string;
  cycleNumber: number;
  themeName: string | null;
  themeEmoji: string | null;
  deliveredAt: string | null;
  hasFeedback: boolean;
};
