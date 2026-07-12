import { Download, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { EncryptedImage, useDecryptedName } from "./EncryptedImage";
import { useCrypto } from "../hooks/useCrypto";
import type { Photo } from "../types/photo";

interface PhotoLightboxProps {
  photo: Photo;
  onClose: () => void;
  onDownload: () => void;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const PhotoLightbox = ({ photo, onClose, onDownload }: PhotoLightboxProps) => {
  const { isUnlocked } = useCrypto();
  const fileName = useDecryptedName(photo);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const canDownload = !photo.encrypted || isUnlocked;

  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-6xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Viewing ${fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-semibold">{fileName}</p>
            <p className="text-xs text-white/70">
              {canDownload ? "Use Escape or click outside to close" : "Unlock your gallery to view and download"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                <Download size={15} />
                Download
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              aria-label="Close photo viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="relative perspective-[1800px]">
          {canDownload && photo.thumbUrl && (
            <EncryptedImage
              photo={photo}
              variant="thumb"
              alt=""
              className="absolute inset-0 max-h-[82vh] w-full scale-110 rounded-[1.75rem] object-contain opacity-30 blur-2xl"
            />
          )}
          <EncryptedImage
            photo={photo}
            variant="full"
            alt={fileName}
            className="relative animate-photo-pop max-h-[82vh] w-full rounded-[1.75rem] object-contain shadow-2xl shadow-black/40"
          />
        </div>
      </div>
    </div>
  );
};
