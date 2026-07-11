const MAX_CACHE = 20;
const urlCache = new Map<string, string>();

export const cacheKey = (userId: string, photoId: string, variant: string) =>
  `${userId}:${photoId}:${variant}`;

export const getCachedUrl = (key: string) => urlCache.get(key) ?? null;

export const putInCache = (key: string, url: string) => {
  urlCache.set(key, url);
  while (urlCache.size > MAX_CACHE) {
    const oldestKey = urlCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    const oldestUrl = urlCache.get(oldestKey);
    urlCache.delete(oldestKey);
    if (oldestUrl && oldestUrl !== url) URL.revokeObjectURL(oldestUrl);
  }
};

export const clearDecryptionCache = () => {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") clearDecryptionCache();
  });
}
