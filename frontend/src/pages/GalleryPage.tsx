import { useAuth, useUser, UserButton } from "@clerk/react";
import JSZip from "jszip";
import { Camera, Check, Download, Images, Lock, Settings, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { GalleryGrid } from "../components/GalleryGrid";
import { GallerySkeleton } from "../components/GallerySkeleton";
import { InfiniteScrollTrigger } from "../components/InfiniteScrollTrigger";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { SecuritySettingsModal } from "../components/SecuritySettingsModal";
import { UploadPanel } from "../components/UploadPanel";
import { decryptPhotoBlob, resolveFileName } from "../components/EncryptedImage";
import { useCrypto } from "../hooks/useCrypto";
import { usePhotos } from "../hooks/usePhotos";
import { getApiError, photoApi } from "../services/api";
import type { Photo } from "../types/photo";

export const GalleryPage = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { masterKey, lock, state: cryptoState } = useCrypto();
  const { photos, isLoading, isLoadingMore, hasMore, error, reload, loadMore, addPhotos, removePhoto } = usePhotos();
  const [deletingId, setDeletingId] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const activeSelectedIds = useMemo(
    () => selectedIds.filter((id) => photos.some((photo) => photo.id === id)),
    [selectedIds, photos],
  );
  const selectedIdSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds]);

  const handleDelete = async (photo: Photo) => {
    const displayName =
      photo.encrypted && masterKey ? await resolveFileName(masterKey, photo) : photo.fileName;
    if (!window.confirm(`Delete "${displayName}"? This cannot be undone.`)) return;
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

  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedIdSet.has(photo.id)),
    [photos, selectedIdSet],
  );

  const toggleSelect = (photo: Photo) => {
    setSelectedIds((current) =>
      current.includes(photo.id) ? current.filter((id) => id !== photo.id) : [...current, photo.id],
    );
  };

  const clearSelection = () => setSelectedIds([]);
  const selectAllVisible = () => setSelectedIds(photos.map((photo) => photo.id));

  const downloadBlob = async (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const fetchPhotoBlob = async (photo: Photo): Promise<Blob> => {
    if (photo.encrypted) {
      if (!masterKey) throw new Error("Gallery is locked");
      return decryptPhotoBlob(masterKey, photo, "full");
    }
    const response = await fetch(photo.imageUrl);
    if (!response.ok) throw new Error("Failed to download photo");
    return response.blob();
  };

  const fetchPhotoName = async (photo: Photo): Promise<string> => {
    if (photo.encrypted && masterKey) return resolveFileName(masterKey, photo);
    return photo.fileName;
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      const [blob, name] = await Promise.all([fetchPhotoBlob(photo), fetchPhotoName(photo)]);
      await downloadBlob(blob, name);
    } catch (downloadError) {
      setActionError(downloadError instanceof Error ? downloadError.message : "Something went wrong while downloading");
    }
  };

  const downloadSelected = async () => {
    if (!selectedPhotos.length) return;
    setActionError("");
    try {
      if (selectedPhotos.length === 1) {
        await downloadPhoto(selectedPhotos[0]!);
        return;
      }

      const zip = new JSZip();
      const usedNames = new Map<string, number>();
      for (const photo of selectedPhotos) {
        const [blob, name] = await Promise.all([fetchPhotoBlob(photo), fetchPhotoName(photo)]);
        const count = usedNames.get(name) ?? 0;
        usedNames.set(name, count + 1);
        const baseName = name.replace(/\.[^.]+$/, "");
        const extension = name.includes(".") ? name.split(".").pop() ?? "jpg" : "jpg";
        const suffix = count ? `-${count + 1}` : "";
        zip.file(`${baseName}${suffix}.${extension}`, blob);
      }
      const archive = await zip.generateAsync({ type: "blob" });
      await downloadBlob(archive, `pixora-${selectedPhotos.length}-photos.zip`);
    } catch (downloadError) {
      setActionError(downloadError instanceof Error ? downloadError.message : "Something went wrong while downloading");
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
            <button
              type="button"
              onClick={lock}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Lock size={14} className="text-violet-500" />
              Lock
            </button>
            {cryptoState === "unlocked" && (
              <button
                type="button"
                onClick={() => setShowSecurity(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Settings size={14} className="text-violet-500" />
                Security
              </button>
            )}
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Your private library</p>
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
        {selectedPhotos.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-violet-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedPhotos.length} selected</p>
              <p className="text-xs text-slate-500">Download one file or bundle them into a zip.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Check size={15} />
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <X size={15} />
                Clear
              </button>
              <button
                type="button"
                onClick={() => void downloadSelected()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <Download size={15} />
                Download
              </button>
            </div>
          </div>
        )}
        {isLoading ? (
          <GallerySkeleton />
        ) : (
          <>
            <GalleryGrid
              photos={photos}
              deletingId={deletingId}
              selectedIds={selectedIdSet}
              onDelete={(photo) => void handleDelete(photo)}
              onDownload={(photo) => void downloadPhoto(photo)}
              onOpen={(photo) => setZoomedPhoto(photo)}
              onToggleSelect={toggleSelect}
            />
            {photos.length > 0 && <InfiniteScrollTrigger hasMore={hasMore} isLoading={isLoadingMore} onLoadMore={loadMore} />}
          </>
        )}
      </div>

      {zoomedPhoto && (
        <PhotoLightbox
          photo={zoomedPhoto}
          onClose={() => setZoomedPhoto(null)}
          onDownload={() => void downloadPhoto(zoomedPhoto)}
        />
      )}
      {showSecurity && <SecuritySettingsModal onClose={() => setShowSecurity(false)} />}
    </main>
  );
};
