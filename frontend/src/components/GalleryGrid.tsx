import { ImageOff } from "lucide-react";
import type { Photo } from "../types/photo";
import { PhotoCard } from "./PhotoCard";

interface GalleryGridProps {
  photos: Photo[];
  deletingId: string;
  onDelete: (photo: Photo) => void;
}

export const GalleryGrid = ({ photos, deletingId, onDelete }: GalleryGridProps) => {
  if (photos.length === 0) {
    return (
      <div className="grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-white text-center shadow-sm">
        <div>
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600"><ImageOff size={25} /></span>
          <p className="font-bold text-slate-800">Your gallery is waiting</p>
          <p className="mt-1 text-sm text-slate-500">Upload a few favorite moments to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} deleting={deletingId === photo.id} onDelete={onDelete} />
      ))}
    </div>
  );
};
