import { ImageOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { decryptFromUrl, decryptFileName, type MasterKey } from "../lib/crypto";
import { useCrypto } from "../hooks/useCrypto";
import type { Photo } from "../types/photo";

/**
 * Decrypted object URLs are cached so scrolling through the gallery does not
 * re-download and re-decrypt the same photo repeatedly. The cache is bounded;
 * evicted entries have their object URLs revoked to free memory.
 */
const MAX_CACHE = 200;
const urlCache = new Map<string, string>();

const cacheKey = (photoId: string, variant: Variant) => `${photoId}:${variant}`;

const putInCache = (key: string, url: string) => {
  urlCache.set(key, url);
  while (urlCache.size > MAX_CACHE) {
    const oldestKey = urlCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    const oldestUrl = urlCache.get(oldestKey);
    urlCache.delete(oldestKey);
    if (oldestUrl && oldestUrl !== url) URL.revokeObjectURL(oldestUrl);
  }
};

type Variant = "thumb" | "full";

const resolveSource = (photo: Photo, variant: Variant) => {
  if (variant === "thumb" && photo.thumbUrl && photo.thumbIv) {
    return { url: photo.thumbUrl, iv: photo.thumbIv };
  }
  return { url: photo.imageUrl, iv: photo.contentIv ?? "" };
};

/** Decrypt a photo into a Blob, used for both display and downloads. */
export const decryptPhotoBlob = async (
  master: MasterKey,
  photo: Photo,
  variant: Variant = "full",
): Promise<Blob> => {
  const { url, iv } = resolveSource(photo, variant);
  return decryptFromUrl(master, {
    url,
    encryptedKey: photo.encryptedKey ?? "",
    keyIv: photo.keyIv ?? "",
    iv,
    mimeType: photo.mimeType ?? "application/octet-stream",
  });
};

const useObjectUrl = (photo: Photo, variant: Variant) => {
  const { masterKey } = useCrypto();
  const [url, setUrl] = useState<string | null>(() => {
    if (!photo.encrypted) return photo.imageUrl;
    return urlCache.get(cacheKey(photo.id, variant)) ?? null;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!photo.encrypted) {
        if (!cancelled) setUrl(photo.imageUrl);
        return;
      }
      const key = cacheKey(photo.id, variant);
      const cached = urlCache.get(key);
      if (cached) {
        if (!cancelled) setUrl(cached);
        return;
      }
      if (!masterKey) return;

      if (!cancelled) setFailed(false);
      try {
        const blob = await decryptPhotoBlob(masterKey, photo, variant);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        putInCache(key, objectUrl);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photo, variant, masterKey]);

  return { url, failed };
};

interface EncryptedImageProps {
  photo: Photo;
  variant?: Variant;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export const EncryptedImage = ({ photo, variant = "thumb", alt, className, onClick }: EncryptedImageProps) => {
  const { url, failed } = useObjectUrl(photo, variant);

  if (failed) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-400 ${className ?? ""}`} onClick={onClick}>
        <ImageOff size={22} />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-300 ${className ?? ""}`}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" onClick={onClick} className={className} />;
};

/** Decrypt and memoize a photo's original file name for display and downloads. */
export const useDecryptedName = (photo: Photo): string => {
  const { masterKey } = useCrypto();
  const [name, setName] = useState(photo.encrypted ? "" : photo.fileName);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!photo.encrypted) {
        if (!cancelled) setName(photo.fileName);
        return;
      }
      if (!masterKey || !photo.encryptedFileName || !photo.fileNameIv) {
        if (!cancelled) setName("photo");
        return;
      }
      try {
        const decrypted = await decryptFileName(masterKey, photo.encryptedFileName, photo.fileNameIv);
        if (!cancelled) setName(decrypted);
      } catch {
        if (!cancelled) setName("photo");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photo, masterKey]);

  return name;
};

export const resolveFileName = async (master: MasterKey, photo: Photo): Promise<string> => {
  if (!photo.encrypted) return photo.fileName;
  if (!photo.encryptedFileName || !photo.fileNameIv) return "photo";
  try {
    return await decryptFileName(master, photo.encryptedFileName, photo.fileNameIv);
  } catch {
    return "photo";
  }
};
