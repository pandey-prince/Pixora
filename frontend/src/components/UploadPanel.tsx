import { useAuth } from "@clerk/react";
import { ImagePlus, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { encryptPhoto, MAX_UPLOAD_BYTES } from "../lib/crypto";
import { useCrypto } from "../hooks/useCrypto";
import { photoApi } from "../services/api";
import type { Photo } from "../types/photo";

interface UploadPanelProps {
  onUploaded: (photos: Photo[]) => void;
}

interface SelectedFile {
  file: File;
  preview: string;
}

export const UploadPanel = ({ onUploaded }: UploadPanelProps) => {
  const { getToken } = useAuth();
  const { masterKey } = useCrypto();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [partialSuccess, setPartialSuccess] = useState("");

  const addFiles = (files: File[]) => {
    setError("");
    setPartialSuccess("");
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length !== files.length) setError("Only image files can be uploaded.");
    const oversized = images.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the 15 MB limit.`);
      return;
    }
    setSelected((current) => [
      ...current,
      ...images.slice(0, Math.max(0, 20 - current.length)).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeSelected = (index: number) => {
    setSelected((current) => {
      URL.revokeObjectURL(current[index]!.preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const upload = async () => {
    if (!selected.length) return;
    if (!masterKey) {
      setError("Your gallery is locked. Unlock it before uploading.");
      return;
    }
    setIsUploading(true);
    setError("");
    setPartialSuccess("");
    setProgress(0);

    const token = await getToken();
    if (!token) {
      setError("Not authenticated");
      setIsUploading(false);
      return;
    }

    const total = selected.length;
    const uploaded: Photo[] = [];
    const failed: SelectedFile[] = [];

    for (let index = 0; index < total; index += 1) {
      const item = selected[index]!;
      try {
        const encrypted = await encryptPhoto(masterKey, item.file);
        const photo = await photoApi.upload(token, encrypted, (fileProgress) => {
          setProgress(Math.round(((index + fileProgress / 100) / total) * 100));
        });
        uploaded.push(photo);
        URL.revokeObjectURL(item.preview);
      } catch {
        failed.push(item);
      }
    }

    if (uploaded.length > 0) onUploaded(uploaded);

    if (failed.length === 0) {
      setSelected([]);
    } else {
      setSelected(failed);
      const names = failed.map(({ file }) => file.name).join(", ");
      if (uploaded.length > 0) {
        setPartialSuccess(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded.`);
        setError(`Failed to upload: ${names}. Fix the issue and retry the remaining files.`);
      } else {
        setError(`Upload failed for: ${names}`);
      }
    }

    setIsUploading(false);
  };

  const openFilePicker = () => inputRef.current?.click();

  return (
    <section className="mb-10 rounded-[2rem] border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div
        role="button"
        tabIndex={0}
        aria-labelledby={inputId}
        aria-describedby={hintId}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={`grid min-h-28 cursor-pointer place-items-center rounded-[1.4rem] border border-dashed p-5 text-center transition ${
          isDragging ? "border-violet-500 bg-violet-50" : "border-slate-300 bg-slate-50/60 hover:border-violet-400 hover:bg-violet-50/50"
        }`}
        onClick={openFilePicker}
      >
        <input
          ref={inputRef}
          id={inputId}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        />
        <div>
          <ImagePlus className="mx-auto mb-2 text-violet-600" size={22} aria-hidden />
          <p className="font-semibold text-slate-800">Drop photos here or click to browse</p>
          <p id={hintId} className="mt-1 text-xs text-slate-500">Up to 20 images, 15 MB each</p>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {selected.map(({ file, preview }, index) => (
              <div key={`${file.name}-${index}`} className="relative shrink-0">
                <img src={preview} alt={file.name} className="h-20 w-20 rounded-xl object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeSelected(index)}
                  disabled={isUploading}
                  className="absolute -right-1 -top-1 rounded-full bg-slate-900 p-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void upload()}
            disabled={isUploading}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
          >
            <Upload size={16} />
            {isUploading ? `Uploading ${progress}%` : `Upload ${selected.length} photo${selected.length > 1 ? "s" : ""}`}
          </button>
          {isUploading && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}
      {partialSuccess && <p className="mt-3 text-sm text-emerald-600">{partialSuccess}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
};
