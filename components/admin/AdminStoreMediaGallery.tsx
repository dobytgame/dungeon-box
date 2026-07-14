'use client';

import { useEffect, useMemo, useState } from 'react';
import { Images, Loader2, Search } from 'lucide-react';
import AdminModal from '@/components/admin/AdminModal';
import {
  fetchStoreMediaGallery,
  type StoreMediaGalleryItem,
} from '@/lib/admin/store-media-client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  description?: string;
}

export default function AdminStoreMediaGallery({
  open,
  onClose,
  onSelect,
  title = 'Galeria de mídia',
  description = 'Escolha uma imagem já enviada ao Supabase.',
}: Props) {
  const [files, setFiles] = useState<StoreMediaGalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    void fetchStoreMediaGallery()
      .then((items) => {
        if (!cancelled) setFiles(items);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Não foi possível carregar a galeria.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return files;

    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(normalized) ||
        file.folder.toLowerCase().includes(normalized) ||
        file.path.toLowerCase().includes(normalized)
    );
  }, [files, query]);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou pasta…"
            className="w-full rounded-sm border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-200"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando galeria…
          </div>
        ) : null}

        {error ? (
          <p className="rounded-sm border border-red-400/20 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {!loading && !error && filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-zinc-500">
            <Images className="h-8 w-8 text-zinc-600" aria-hidden="true" />
            <p>Nenhuma imagem encontrada no bucket store-media.</p>
          </div>
        ) : null}

        {!loading && filteredFiles.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredFiles.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(file.url);
                    onClose();
                  }}
                  className="group block w-full cursor-pointer overflow-hidden rounded-sm border border-zinc-800 bg-zinc-900/40 text-left transition hover:border-console/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url}
                    alt={file.name}
                    className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                  />
                  <div className="border-t border-zinc-800 px-2 py-2">
                    <p className="truncate text-[11px] text-zinc-300">{file.name}</p>
                    <p className="truncate text-[10px] text-zinc-600">{file.folder}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AdminModal>
  );
}
