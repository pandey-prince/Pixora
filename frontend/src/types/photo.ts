export interface Photo {
  id: string;
  imageUrl: string;
  publicId: string;
  fileName: string;
  uploadedAt: string;
  userId: string;
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
