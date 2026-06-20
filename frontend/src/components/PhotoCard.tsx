import { Trash2 } from "lucide-react";
import type { Photo } from "../types/photo";

interface PhotoCardProps {
  photo: Photo;
  deleting: boolean;
  onDelete: (photo: Photo) => void;
}

export const PhotoCard = ({ photo, deleting, onDelete }: PhotoCardProps) => (
  <article className="group relative aspect-square overflow-hidden rounded-[1.35rem] bg-slate-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
    <img
      src={photo.imageUrl}
      alt={photo.fileName}
      loading="lazy"
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 opacity-0 transition group-hover:opacity-100">
      <p className="min-w-0 truncate text-xs font-medium text-white">{photo.fileName}</p>
      <button
        type="button"
        disabled={deleting}
        onClick={() => onDelete(photo)}
        aria-label={`Delete ${photo.fileName}`}
        className="ml-2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-red-500 disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </article>
);
