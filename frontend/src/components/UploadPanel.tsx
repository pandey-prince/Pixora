import { useAuth } from "@clerk/react";
import axios from "axios";
import { ImagePlus, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  encryptPhoto,
  MAX_SELECTION_COUNT,
  prepareImageForUpload,
  validateImageFile,
} from "../lib/crypto";
import { useCrypto } from "../hooks/useCrypto";
import { useUnlockRequest } from "../hooks/useUnlockRequest";
import { getApiError, photoApi } from "../services/api";
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
  const { isUnlocked, requireMasterKey } = useCrypto();
  const { requestUnlock } = useUnlockRequest();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [partialSuccess, setPartialSuccess] = useState("");

  const addFiles = (files: File[]) => {
    setError("");
    setPartialSuccess("");
    setInfo("");
    void (async () => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length !== files.length) {
        setInfo("Non-image files were skipped.");
      }

      const accepted: SelectedFile[] = [];
      const skipped: string[] = [];
      const compressed: string[] = [];

      for (const file of images) {
        const validation = await validateImageFile(file);
        if (validation) {
          skipped.push(`"${file.name}" (${validation})`);
          continue;
        }
        try {
          const prepared = await prepareImageForUpload(file);
          if (prepared.compressed) compressed.push(file.name);
          accepted.push({
            file: prepared.file,
            preview: URL.createObjectURL(prepared.file),
          });
        } catch (prepareError) {
          skipped.push(
            `"${file.name}" (${prepareError instanceof Error ? prepareError.message : "could not prepare"})`,
          );
        }
      }

      setSelected((current) => {
        const slotsLeft = Math.max(0, MAX_SELECTION_COUNT - current.length);
        const toAdd = accepted.slice(0, slotsLeft);
        const overflow = accepted.length - toAdd.length;

        const messages: string[] = [];
        if (skipped.length) messages.push(`${skipped.join("; ")}`);
        if (compressed.length) {
          messages.push(`Compressed for upload: ${compressed.join(", ")}.`);
        }
        if (overflow > 0) {
          messages.push(`Only ${MAX_SELECTION_COUNT} photos can be uploaded at a time. Extra files were not added.`);
        }
        if (messages.length) setInfo(messages.join(" "));

        return [...current, ...toAdd];
      });
    })();
  };

  const removeSelected = (index: number) => {
    setSelected((current) => {
      URL.revokeObjectURL(current[index]!.preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const uploadOne = async (item: SelectedFile, index: number, total: number) => {
    const masterKey = requireMasterKey();
    const attempt = async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const encrypted = await encryptPhoto(masterKey, item.file);
      return photoApi.upload(token, encrypted, (fileProgress) => {
        setProgress(Math.round(((index + fileProgress / 100) / total) * 100));
      });
    };

    try {
      return await attempt();
    } catch (uploadError) {
      const isUnauthorized =
        axios.isAxiosError(uploadError) && uploadError.response?.status === 401;
      if (isUnauthorized) return attempt();
      throw uploadError;
    }
  };

  const upload = async () => {
    if (!selected.length) return;

    if (!isUnlocked) {
      try {
        await requestUnlock();
      } catch {
        return;
      }
    }

    setIsUploading(true);
    setError("");
    setPartialSuccess("");
    setInfo("");
    setProgress(0);

    const total = selected.length;
    const uploaded: Photo[] = [];
    const failed: SelectedFile[] = [];
    let failureReason = "";

    for (let index = 0; index < total; index += 1) {
      const item = selected[index]!;
      try {
        const photo = await uploadOne(item, index, total);
        uploaded.push(photo);
        URL.revokeObjectURL(item.preview);
      } catch (uploadError) {
        failed.push(item);
        if (!failureReason) failureReason = getApiError(uploadError);
      }
    }

    if (uploaded.length > 0) onUploaded(uploaded);

    if (failed.length === 0) {
      setSelected([]);
      setPartialSuccess(`${uploaded.length} of ${total} uploaded.`);
    } else {
      setSelected(failed);
      const names = failed.map(({ file }) => file.name).join(", ");
      if (uploaded.length > 0) {
        setPartialSuccess(`${uploaded.length} of ${total} uploaded.`);
        setError(
          failureReason
            ? `${failureReason} Could not upload: ${names}. Tap Upload to retry the rest.`
            : `Could not upload: ${names}. Tap Upload to retry the rest.`,
        );
      } else {
        setError(failureReason || `Upload failed for: ${names}`);
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
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <div>
          <ImagePlus className="mx-auto mb-2 text-violet-600" size={22} aria-hidden />
          <p className="font-semibold text-slate-800">Drop photos here or click to browse</p>
          <p id={hintId} className="mt-1 text-xs text-slate-500">
            Up to {MAX_SELECTION_COUNT} images; larger photos are compressed automatically
          </p>
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
      {info && <p className="mt-3 text-sm text-amber-700">{info}</p>}
      {partialSuccess && <p className="mt-3 text-sm text-emerald-600">{partialSuccess}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
};
