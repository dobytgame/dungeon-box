'use client';

import { useState } from 'react';
import AdminStoreImageField from '@/components/admin/AdminStoreImageField';
import {
  STORE_CATEGORY_BANNER_HEIGHT,
  STORE_CATEGORY_BANNER_WIDTH,
  STORE_CATEGORY_THUMB_SIZE,
} from '@/lib/store/category-media';

export default function StoreCategoryMediaFields({
  bannerUrl: initialBannerUrl,
  thumbUrl: initialThumbUrl,
}: {
  bannerUrl: string | null;
  thumbUrl: string | null;
}) {
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl ?? '');
  const [thumbUrl, setThumbUrl] = useState(initialThumbUrl ?? '');

  return (
    <div className="space-y-5 rounded-sm border border-white/10 bg-stone-950/40 p-4">
      <input type="hidden" name="banner_url" value={bannerUrl} />
      <input type="hidden" name="thumb_url" value={thumbUrl} />

      <AdminStoreImageField
        label="Banner da página"
        hint={`Exibido no topo da página da categoria. Recomendado ${STORE_CATEGORY_BANNER_WIDTH}×${STORE_CATEGORY_BANNER_HEIGHT}px.`}
        value={bannerUrl}
        onChange={setBannerUrl}
        uploadFolder="categories/banners"
        previewClassName="h-40 w-full max-w-2xl"
        previewAspectClassName="aspect-[21/9]"
        emptyLabel="Sem banner"
        showManualUrl={false}
      />

      <AdminStoreImageField
        label="Miniatura da loja"
        hint={`Usada no slider de categorias na home. Recomendado ${STORE_CATEGORY_THUMB_SIZE}×${STORE_CATEGORY_THUMB_SIZE}px.`}
        value={thumbUrl}
        onChange={setThumbUrl}
        uploadFolder="categories/thumbs"
        previewClassName="h-32 w-32"
        previewAspectClassName="aspect-square"
        emptyLabel="Sem miniatura"
        showManualUrl={false}
      />
    </div>
  );
}
