/** Production Render API. Prefer VITE_API_URL; ignore the retired host. */
const PRODUCTION_API_URL = "https://pixora-2a39.onrender.com";
const RETIRED_API_HOST = "pixora-4nya.onrender.com";

export const getApiBaseUrl = () => {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (fromEnv && !fromEnv.includes(RETIRED_API_HOST)) {
    return fromEnv.replace(/\/$/, "");
  }
  return PRODUCTION_API_URL;
};
