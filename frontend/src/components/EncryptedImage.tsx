import { ImageOff, Lock } from "lucide-react";
import { useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { decryptFromUrl, decryptFileName, type MasterKey } from "../lib/crypto";
import { useCrypto } from "../hooks/useCrypto";
import type { Photo } from "../types/photo";

import { cacheKey, getCachedUrl, putInCache } from "../lib/decryption-cache";

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

const ImageSkeleton = ({ label }: { label: string }) => (
  <div
    aria-busy="true"
    aria-label={label}
    className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200"
  >
    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

const LockedPlaceholder = ({ label }: { label: string }) => (
  <div
    role="img"
    aria-label={label}
    className="grid h-full w-full place-items-center bg-slate-100 text-slate-400"
  >
    <div className="text-center">
      <Lock size={22} className="mx-auto mb-2" />
      <p className="text-xs font-medium">Unlock gallery to view</p>
    </div>
  </div>
);

const useObjectUrl = (photo: Photo, variant: Variant) => {
  const { isUnlocked, requireMasterKey } = useCrypto();
  const { user } = useUser();
  const userId = user?.id ?? "anonymous";
  const [url, setUrl] = useState<string | null>(() => {
    if (!photo.encrypted) return photo.imageUrl;
    return getCachedUrl(cacheKey(userId, photo.id, variant));
  });
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!url && photo.encrypted);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!photo.encrypted) {
        if (!cancelled) setUrl(photo.imageUrl);
        return;
      }
      const key = cacheKey(userId, photo.id, variant);
      const cached = getCachedUrl(key);
      if (cached) {
        if (!cancelled) {
          setUrl(cached);
          setLoading(false);
        }
        return;
      }
      if (!isUnlocked) {
        if (!cancelled) {
          setLoading(false);
          setUrl(null);
        }
        return;
      }

      if (!cancelled) {
        setFailed(false);
        setLoading(true);
      }
      try {
        const blob = await decryptPhotoBlob(requireMasterKey(), photo, variant);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        putInCache(key, objectUrl);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photo, variant, isUnlocked, userId, requireMasterKey]);

  return { url, failed, loading, locked: photo.encrypted && !isUnlocked };
};

interface EncryptedImageProps {
  photo: Photo;
  variant?: Variant;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export const EncryptedImage = ({ photo, variant = "thumb", alt, className, onClick }: EncryptedImageProps) => {
  const { url, failed, loading, locked } = useObjectUrl(photo, variant);

  if (locked) {
    return (
      <div className={className} onClick={onClick}>
        <LockedPlaceholder label={`${alt} is locked`} />
      </div>
    );
  }

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} could not be decrypted`}
        className={`grid place-items-center bg-slate-100 text-slate-400 ${className ?? ""}`}
        onClick={onClick}
      >
        <ImageOff size={22} />
      </div>
    );
  }

  if (!url || loading) {
    return (
      <div className={className} onClick={onClick}>
        <ImageSkeleton label={`Loading ${alt}`} />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" onClick={onClick} className={className} />;
};

/** Decrypt and memoize a photo's original file name for display and downloads. */
export const useDecryptedName = (photo: Photo): string => {
  const { isUnlocked, requireMasterKey } = useCrypto();
  const [name, setName] = useState(photo.encrypted ? "" : photo.fileName);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!photo.encrypted) {
        if (!cancelled) setName(photo.fileName);
        return;
      }
      if (!isUnlocked || !photo.encryptedFileName || !photo.fileNameIv) {
        if (!cancelled) setName("photo");
        return;
      }
      try {
        const decrypted = await decryptFileName(
          requireMasterKey(),
          photo.encryptedFileName,
          photo.fileNameIv,
        );
        if (!cancelled) setName(decrypted);
      } catch {
        if (!cancelled) setName("photo");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photo, isUnlocked, requireMasterKey]);

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
