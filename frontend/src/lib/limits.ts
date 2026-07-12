export const MAX_PHOTOS_PER_USER = 100;

export const FREE_TIER_LIMIT_MESSAGE =
  "Pixora is currently on the free tier. You can upload up to 100 photos only.";

export const FREE_TIER_LIMIT_REACHED_MESSAGE =
  "Pixora is currently on the free tier. You can upload up to 100 photos only. You've reached the limit — delete some photos to upload more.";

export const freeTierSlotsRemaining = (photoTotal: number) =>
  Math.max(0, MAX_PHOTOS_PER_USER - photoTotal);
