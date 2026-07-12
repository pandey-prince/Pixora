import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiError, photoApi } from "../services/api";
import type { Photo } from "../types/photo";

const PAGE_SIZE = 24;

export const usePhotos = () => {
  const { getToken } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (targetPage: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const data = await photoApi.list(token, targetPage, PAGE_SIZE);
      setPhotos(data.photos);
      setPagination(data.pagination);
      setPage(data.pagination.page);
    } catch (loadError) {
      setError(getApiError(loadError));
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [getToken]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadPage(1));
    return () => window.cancelAnimationFrame(frame);
  }, [loadPage]);

  const goToPage = useCallback(
    (targetPage: number) => {
      const next = Math.min(Math.max(1, targetPage), pagination.totalPages);
      void loadPage(next);
    },
    [loadPage, pagination.totalPages],
  );

  const addPhotos = (newPhotos: Photo[]) => {
    setPhotos((current) => [...newPhotos, ...current]);
    setPagination((current) => ({
      ...current,
      total: current.total + newPhotos.length,
      totalPages: Math.max(1, Math.ceil((current.total + newPhotos.length) / PAGE_SIZE)),
    }));
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
    setPagination((current) => ({
      ...current,
      total: Math.max(0, current.total - 1),
      totalPages: Math.max(1, Math.ceil(Math.max(0, current.total - 1) / PAGE_SIZE)),
    }));
  };

  const reload = useCallback(() => {
    void loadPage(page);
  }, [loadPage, page]);

  return {
    photos,
    isLoading,
    error,
    pagination,
    page,
    goToPage,
    reload,
    addPhotos,
    removePhoto,
  };
};
