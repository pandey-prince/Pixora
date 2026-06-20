import axios from "axios";
import type { Photo, PhotoPage } from "../types/photo";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60_000,
});

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const photoApi = {
  list: async (token: string, page = 1, limit = 20) => {
    const response = await api.get<PhotoPage>("/api/photos", {
      params: { page, limit },
      headers: authHeader(token),
    });
    return response.data;
  },

  upload: async (token: string, files: File[], onProgress: (progress: number) => void) => {
    const data = new FormData();
    files.forEach((file) => data.append("images", file));
    const response = await api.post<{ photos: Photo[] }>("/api/photos/upload", data, {
      headers: authHeader(token),
      onUploadProgress: (event) => {
        if (event.total) onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return response.data.photos;
  },

  remove: async (token: string, photoId: string) => {
    await api.delete(`/api/photos/${photoId}`, { headers: authHeader(token) });
  },
};

export const getApiError = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return "Something went wrong";
};
