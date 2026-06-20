import { useAuth, useUser, UserButton } from "@clerk/react";
import { Camera, Images, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { GalleryGrid } from "../components/GalleryGrid";
import { GallerySkeleton } from "../components/GallerySkeleton";
import { InfiniteScrollTrigger } from "../components/InfiniteScrollTrigger";
import { UploadPanel } from "../components/UploadPanel";
import { usePhotos } from "../hooks/usePhotos";
import { getApiError, photoApi } from "../services/api";
import type { Photo } from "../types/photo";

export const GalleryPage = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { photos, isLoading, isLoadingMore, hasMore, error, reload, loadMore, addPhotos, removePhoto } = usePhotos();
  const [deletingId, setDeletingId] = useState("");
  const [actionError, setActionError] = useState("");

  const handleDelete = async (photo: Photo) => {
    if (!window.confirm(`Delete "${photo.fileName}"? This cannot be undone.`)) return;
    setDeletingId(photo.id);
    setActionError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await photoApi.remove(token, photo.id);
      removePhoto(photo.id);
    } catch (deleteError) {
      setActionError(getApiError(deleteError));
    } finally {
      setDeletingId("");
    }
  };

  const name = user?.firstName ?? user?.username ?? "there";

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#f8f7f4]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3.5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-2.5 text-white shadow-lg shadow-slate-950/15"><Camera size={18} /></div>
            <div>
              <p className="font-black leading-tight tracking-tight">Pixora</p>
              <p className="text-[11px] font-medium text-slate-500">Welcome, {name}</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 sm:flex">
              <Images size={14} className="text-violet-500" />
              {photos.length} loaded
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-600"><Sparkles size={14} /> Your private library</p>
            <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">Moments worth keeping.</h1>
            <p className="mt-3 text-sm text-slate-500">Upload your favorites. We’ll keep the view calm and beautiful.</p>
          </div>
        </div>
        <UploadPanel onUploaded={addPhotos} />
        {(error || actionError) && (
          <div className="mb-5 flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <span>{error || actionError}</span>
            {error && <button type="button" className="font-semibold" onClick={reload}>Retry</button>}
          </div>
        )}
        {isLoading ? (
          <GallerySkeleton />
        ) : (
          <>
            <GalleryGrid photos={photos} deletingId={deletingId} onDelete={(photo) => void handleDelete(photo)} />
            {photos.length > 0 && <InfiniteScrollTrigger hasMore={hasMore} isLoading={isLoadingMore} onLoadMore={loadMore} />}
          </>
        )}
      </div>
    </main>
  );
};
