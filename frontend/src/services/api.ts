import axios from "axios";
import type {
  EncryptedUpload,
  KeyStatus,
  Photo,
  PhotoPage,
  WrappedKeyPayload,
} from "../types/photo";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60_000,
});

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const photoApi = {
  list: async (token: string, page = 1, limit = 24) => {
    const response = await api.get<PhotoPage>("/api/photos", {
      params: { page, limit },
      headers: authHeader(token),
    });
    return response.data;
  },

  upload: async (token: string, upload: EncryptedUpload, onProgress: (progress: number) => void) => {
    const data = new FormData();
    data.append("image", upload.imageBlob, "image.enc");
    if (upload.thumbBlob) data.append("thumbnail", upload.thumbBlob, "thumb.enc");
    data.append("metadata", JSON.stringify(upload.metadata));

    const response = await api.post<{ photo: Photo }>("/api/photos/upload", data, {
      headers: authHeader(token),
      onUploadProgress: (event) => {
        if (event.total) onProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    return response.data.photo;
  },

  remove: async (token: string, photoId: string) => {
    await api.delete(`/api/photos/${photoId}`, { headers: authHeader(token) });
  },
};

export const cryptoApi = {
  getKeys: async (token: string) => {
    const response = await api.get<KeyStatus>("/api/crypto/keys", { headers: authHeader(token) });
    return response.data;
  },

  initKeys: async (token: string, payload: WrappedKeyPayload) => {
    await api.post("/api/crypto/keys", payload, { headers: authHeader(token) });
  },

  rotateKeys: async (token: string, payload: WrappedKeyPayload) => {
    await api.put("/api/crypto/keys", payload, { headers: authHeader(token) });
  },
};

export const getApiError = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response && (error.code === "ERR_NETWORK" || error.message === "Network Error")) {
      return "Cannot reach the API server. Check your connection and try again.";
    }
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes("WebAssembly") || error.message.includes("wasm")) {
      return "Encryption could not start in this browser. Refresh the page and try again.";
    }
    return error.message || "Something went wrong";
  }
  return "Something went wrong";
};
