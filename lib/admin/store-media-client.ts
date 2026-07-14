export type StoreMediaGalleryItem = {
  path: string;
  url: string;
  name: string;
  folder: string;
  updatedAt: string | null;
};

export async function uploadStoreMedia(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch('/api/admin/store/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Falha no upload.');
  }

  return payload.url;
}

export async function fetchStoreMediaGallery(): Promise<StoreMediaGalleryItem[]> {
  const response = await fetch('/api/admin/store/media', { cache: 'no-store' });
  const payload = (await response.json()) as {
    files?: StoreMediaGalleryItem[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Não foi possível carregar a galeria.');
  }

  return payload.files ?? [];
}
