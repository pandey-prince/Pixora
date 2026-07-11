export interface Photo {
  id: string;
  imageUrl: string;
  publicId: string;
  fileName: string;
  uploadedAt: string;
  userId: string;
  encrypted: boolean;
  encryptedKey: string | null;
  keyIv: string | null;
  contentIv: string | null;
  encryptedFileName: string | null;
  fileNameIv: string | null;
  mimeType: string | null;
  thumbUrl: string | null;
  thumbPublicId: string | null;
  thumbIv: string | null;
}

export interface PhotoPage {
  photos: Photo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadMetadata {
  encryptedKey: string;
  keyIv: string;
  contentIv: string;
  encryptedFileName: string;
  fileNameIv: string;
  mimeType: string;
  thumbIv?: string;
}

export interface EncryptedUpload {
  imageBlob: Blob;
  thumbBlob: Blob | null;
  metadata: UploadMetadata;
}

export interface KeyStatus {
  initialized: boolean;
  hasRecovery: boolean;
  encryptedMasterKey?: string;
  masterKeySalt?: string;
  masterKeyIv?: string;
  kdf?: string;
  recoveryWrappedKey?: string;
  recoverySalt?: string;
  recoveryIv?: string;
}

export interface WrappedKeyPayload {
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyIv: string;
  kdf: string;
  recoveryWrappedKey?: string;
  recoverySalt?: string;
  recoveryIv?: string;
}
