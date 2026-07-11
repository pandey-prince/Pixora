import { CheckSquare, Download, Square, Trash2 } from "lucide-react";
import { EncryptedImage, useDecryptedName } from "./EncryptedImage";
import type { Photo } from "../types/photo";

interface PhotoCardProps {
  photo: Photo;
  deleting: boolean;
  selected: boolean;
  onDelete: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  onOpen: (photo: Photo) => void;
  onToggleSelect: (photo: Photo) => void;
}

export const PhotoCard = ({ photo, deleting, selected, onDelete, onDownload, onOpen, onToggleSelect }: PhotoCardProps) => {
  const fileName = useDecryptedName(photo);

  return (
  <article
    className={`group relative aspect-square overflow-hidden rounded-[1.35rem] bg-slate-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 ${selected ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-[#f8f7f4]" : ""}`}
  >
    <EncryptedImage
      photo={photo}
      variant="thumb"
      alt={fileName}
      onClick={() => onOpen(photo)}
      className="h-full w-full cursor-zoom-in object-cover transition duration-500 group-hover:scale-105"
    />
    <button
      type="button"
      aria-label={selected ? `Deselect ${fileName}` : `Select ${fileName}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggleSelect(photo);
      }}
      className="absolute left-3 top-3 rounded-full bg-black/55 p-1.5 text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
    >
      {selected ? <CheckSquare size={18} /> : <Square size={18} />}
    </button>
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 opacity-0 transition group-hover:opacity-100">
      <p className="min-w-0 truncate text-xs font-medium text-white">{fileName}</p>
      <div className="ml-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Download ${fileName}`}
          onClick={(event) => {
            event.stopPropagation();
            onDownload(photo);
          }}
          className="rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-violet-500"
        >
          <Download size={16} />
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(photo);
          }}
          aria-label={`Delete ${fileName}`}
          className="rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-red-500 disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </article>
  );
};
