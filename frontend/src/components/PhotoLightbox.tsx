import { Download, X } from "lucide-react";
import { useEffect } from "react";
import { EncryptedImage, useDecryptedName } from "./EncryptedImage";
import type { Photo } from "../types/photo";

interface PhotoLightboxProps {
  photo: Photo;
  onClose: () => void;
  onDownload: () => void;
}

export const PhotoLightbox = ({ photo, onClose, onDownload }: PhotoLightboxProps) => {
  const fileName = useDecryptedName(photo);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-semibold">{fileName}</p>
            <p className="text-xs text-white/70">Use Escape or click outside to close</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              <Download size={15} />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              aria-label="Close photo viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="perspective-[1800px]">
          <EncryptedImage
            photo={photo}
            variant="full"
            alt={fileName}
            className="animate-photo-pop max-h-[82vh] w-full rounded-[1.75rem] object-contain shadow-2xl shadow-black/40"
          />
        </div>
      </div>
    </div>
  );
};
