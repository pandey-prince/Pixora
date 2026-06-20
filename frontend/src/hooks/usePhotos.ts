import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiError, photoApi } from "../services/api";
import type { Photo } from "../types/photo";

export const usePhotos = () => {
  const { getToken } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (page: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await photoApi.list(token, page);
      setPhotos((current) => {
        if (reset) return data.photos;
        const existing = new Set(current.map((photo) => photo.id));
        return [...current, ...data.photos.filter((photo) => !existing.has(photo.id))];
      });
      pageRef.current = page;
      setHasMore(page < data.pagination.totalPages);
    } catch (loadError) {
      setError(getApiError(loadError));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [getToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPage(1, true), 0);
    return () => window.clearTimeout(timeout);
  }, [loadPage]);

  const addPhotos = (newPhotos: Photo[]) => setPhotos((current) => [...newPhotos, ...current]);
  const removePhoto = (id: string) => setPhotos((current) => current.filter((photo) => photo.id !== id));
  const loadMore = useCallback(() => {
    if (hasMore && !loadingRef.current) void loadPage(pageRef.current + 1);
  }, [hasMore, loadPage]);
  const reload = useCallback(() => {
    pageRef.current = 1;
    setHasMore(true);
    void loadPage(1, true);
  }, [loadPage]);

  return { photos, isLoading, isLoadingMore, hasMore, error, reload, loadMore, addPhotos, removePhoto };
};
