import { useAuth } from "@clerk/react";
import { ImagePlus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const addFiles = (files: File[]) => {
    setError("");
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length !== files.length) setError("Only image files can be uploaded.");
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
    setIsUploading(true);
    setError("");
    setProgress(0);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const photos = await photoApi.upload(token, selected.map(({ file }) => file), setProgress);
      onUploaded(photos);
      selected.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setSelected([]);
    } catch (uploadError) {
      setError(getApiError(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="mb-10 rounded-[2rem] border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div
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
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        />
        <div>
          <ImagePlus className="mx-auto mb-2 text-violet-600" size={22} />
          <p className="font-semibold text-slate-800">Drop photos here or click to browse</p>
          <p className="mt-1 text-xs text-slate-500">Up to 20 images, 10 MB each</p>
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
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
};
