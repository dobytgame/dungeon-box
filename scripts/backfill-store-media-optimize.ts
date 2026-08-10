/**
 * Backfill: otimiza imagens existentes do bucket `store-media` (WebP ≤1600px)
 * e reescreve URLs em produtos, categorias, banners e temas.
 *
 * Uso:
 *   npx tsx scripts/backfill-store-media-optimize.ts            # dry-run
 *   npx tsx scripts/backfill-store-media-optimize.ts --apply
 *   npx tsx scripts/backfill-store-media-optimize.ts --apply --delete-old
 *   npx tsx scripts/backfill-store-media-optimize.ts --apply --limit=20
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { createAdminClient } from '../lib/supabase/admin';
import {
  STORE_MEDIA_BUCKET,
  STORE_MEDIA_CACHE_CONTROL,
  STORE_MEDIA_MAX_EDGE_PX,
  getStoreMediaPublicUrl,
  optimizeStoreMediaBytes,
  parseStoreMediaObjectPath,
} from '../lib/admin/store-upload';
import {
  parseStoreProductVariations,
  type StoreProductVariation,
} from '../lib/store/product-variations';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

type CliOptions = {
  apply: boolean;
  deleteOld: boolean;
  limit: number | null;
};

type ProcessResult =
  | {
      status: 'optimized';
      path: string;
      newPath: string;
      oldUrl: string;
      newUrl: string;
      beforeBytes: number;
      afterBytes: number;
    }
  | {
      status: 'skipped';
      path: string;
      reason: string;
      beforeBytes?: number;
    }
  | {
      status: 'error';
      path: string;
      error: string;
    };

function parseArgs(argv: string[]): CliOptions {
  let apply = false;
  let deleteOld = false;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    if (arg === '--delete-old') deleteOld = true;
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length));
      if (Number.isFinite(value) && value > 0) limit = Math.floor(value);
    }
  }

  return { apply, deleteOld, limit };
}

function guessMimeType(path: string, contentType?: string | null): string {
  if (contentType && contentType.startsWith('image/')) {
    return contentType.split(';')[0]!.trim();
  }
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function optimizedObjectPath(originalPath: string): string {
  const slash = originalPath.lastIndexOf('/');
  const dir = slash >= 0 ? originalPath.slice(0, slash + 1) : '';
  const fileName = slash >= 0 ? originalPath.slice(slash + 1) : originalPath;
  const base = fileName.replace(/\.[^.]+$/, '') || fileName;
  return `${dir}${base}.webp`;
}

async function listAllStoreMediaPaths(admin: SupabaseClient): Promise<string[]> {
  const paths: string[] = [];

  async function walk(prefix: string): Promise<void> {
    let offset = 0;
    for (;;) {
      const { data, error } = await admin.storage.from(STORE_MEDIA_BUCKET).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        throw new Error(`list ${prefix || '/'}: ${error.message}`);
      }

      const entries = data ?? [];
      if (entries.length === 0) break;

      for (const entry of entries) {
        const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const isFolder = !entry.id;
        if (isFolder) {
          await walk(entryPath);
          continue;
        }
        paths.push(entryPath);
      }

      if (entries.length < 100) break;
      offset += entries.length;
    }
  }

  await walk('');
  return paths;
}

function rewriteUrl(value: string | null | undefined, urlMap: Map<string, string>): string | null {
  if (!value) return null;
  return urlMap.get(value) ?? value;
}

function rewriteUrlList(
  values: string[] | null | undefined,
  urlMap: Map<string, string>
): string[] {
  if (!values?.length) return [];
  return values.map((url) => urlMap.get(url) ?? url);
}

function rewriteVariations(
  raw: unknown,
  urlMap: Map<string, string>
): { next: StoreProductVariation[]; changed: boolean } {
  const variations = parseStoreProductVariations(raw);
  let changed = false;

  const next = variations.map((variation) => ({
    ...variation,
    options: variation.options.map((option) => {
      if (!option.imageUrl) return option;
      const mapped = urlMap.get(option.imageUrl);
      if (!mapped || mapped === option.imageUrl) return option;
      changed = true;
      return { ...option, imageUrl: mapped };
    }),
  }));

  return { next, changed };
}

async function rewriteDatabaseUrls(
  admin: SupabaseClient,
  urlMap: Map<string, string>,
  apply: boolean
): Promise<{ products: number; categories: number; banners: number; themes: number }> {
  let products = 0;
  let categories = 0;
  let banners = 0;
  let themes = 0;

  const { data: productRows, error: productsError } = await admin
    .from('store_products')
    .select('id, image_url, gallery_urls, variations');

  if (productsError) {
    throw new Error(`store_products: ${productsError.message}`);
  }

  for (const row of productRows ?? []) {
    const imageUrl = rewriteUrl(row.image_url as string | null, urlMap);
    const galleryUrls = rewriteUrlList(row.gallery_urls as string[] | null, urlMap);
    const { next: variations, changed: variationsChanged } = rewriteVariations(
      row.variations,
      urlMap
    );

    const imageChanged = imageUrl !== (row.image_url as string | null);
    const galleryChanged =
      JSON.stringify(galleryUrls) !== JSON.stringify(row.gallery_urls ?? []);

    if (!imageChanged && !galleryChanged && !variationsChanged) continue;
    products += 1;

    if (!apply) continue;

    const { error } = await admin
      .from('store_products')
      .update({
        ...(imageChanged ? { image_url: imageUrl } : {}),
        ...(galleryChanged ? { gallery_urls: galleryUrls } : {}),
        ...(variationsChanged ? { variations } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id as string);

    if (error) {
      throw new Error(`update store_products ${row.id}: ${error.message}`);
    }
  }

  const { data: categoryRows, error: categoriesError } = await admin
    .from('store_categories')
    .select('id, banner_url, thumb_url');

  if (categoriesError) {
    throw new Error(`store_categories: ${categoriesError.message}`);
  }

  for (const row of categoryRows ?? []) {
    const bannerUrl = rewriteUrl(row.banner_url as string | null, urlMap);
    const thumbUrl = rewriteUrl(row.thumb_url as string | null, urlMap);
    const changed =
      bannerUrl !== (row.banner_url as string | null) ||
      thumbUrl !== (row.thumb_url as string | null);
    if (!changed) continue;
    categories += 1;
    if (!apply) continue;

    const { error } = await admin
      .from('store_categories')
      .update({
        banner_url: bannerUrl,
        thumb_url: thumbUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id as string);

    if (error) {
      throw new Error(`update store_categories ${row.id}: ${error.message}`);
    }
  }

  const { data: bannerRows, error: bannersError } = await admin
    .from('store_banners')
    .select('id, image_url');

  if (bannersError) {
    throw new Error(`store_banners: ${bannersError.message}`);
  }

  for (const row of bannerRows ?? []) {
    const imageUrl = rewriteUrl(row.image_url as string | null, urlMap);
    if (imageUrl === (row.image_url as string | null)) continue;
    banners += 1;
    if (!apply) continue;

    const { error } = await admin
      .from('store_banners')
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id as string);

    if (error) {
      throw new Error(`update store_banners ${row.id}: ${error.message}`);
    }
  }

  const { data: themeRows, error: themesError } = await admin
    .from('themes')
    .select('id, image_url');

  if (themesError) {
    // Temas podem não existir em todos os ambientes; não aborta o backfill da loja.
    console.warn(`[backfill] themes skip: ${themesError.message}`);
  } else {
    for (const row of themeRows ?? []) {
      const current = row.image_url as string | null;
      if (!current || !parseStoreMediaObjectPath(current)) continue;
      const imageUrl = rewriteUrl(current, urlMap);
      if (imageUrl === current) continue;
      themes += 1;
      if (!apply) continue;

      const { error } = await admin
        .from('themes')
        .update({ image_url: imageUrl })
        .eq('id', row.id as string);

      if (error) {
        throw new Error(`update themes ${row.id}: ${error.message}`);
      }
    }
  }

  return { products, categories, banners, themes };
}

async function processObject(
  admin: SupabaseClient,
  path: string,
  apply: boolean
): Promise<ProcessResult> {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'gif') {
    return { status: 'skipped', path, reason: 'gif-preserved' };
  }
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return { status: 'skipped', path, reason: `unsupported-ext:${ext || 'none'}` };
  }

  const { data, error } = await admin.storage.from(STORE_MEDIA_BUCKET).download(path);
  if (error || !data) {
    return { status: 'error', path, error: error?.message ?? 'download-failed' };
  }

  const originalBytes = Buffer.from(await data.arrayBuffer());
  const mimeType = guessMimeType(path, data.type);
  if (!mimeType.startsWith('image/')) {
    return {
      status: 'skipped',
      path,
      reason: `non-image:${mimeType}`,
      beforeBytes: originalBytes.byteLength,
    };
  }

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(originalBytes, { failOn: 'none' }).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    // segue para optimize; se falhar, cai no fallback
  }

  const optimized = await optimizeStoreMediaBytes(originalBytes, mimeType);
  const alreadyCompact =
    mimeType === 'image/webp' &&
    width > 0 &&
    height > 0 &&
    width <= STORE_MEDIA_MAX_EDGE_PX &&
    height <= STORE_MEDIA_MAX_EDGE_PX &&
    optimized.bytes.byteLength >= originalBytes.byteLength * 0.95;

  if (alreadyCompact) {
    return {
      status: 'skipped',
      path,
      reason: 'already-optimized',
      beforeBytes: originalBytes.byteLength,
    };
  }

  if (optimized.bytes.byteLength >= originalBytes.byteLength) {
    return {
      status: 'skipped',
      path,
      reason: 'no-size-gain',
      beforeBytes: originalBytes.byteLength,
    };
  }

  const newPath = optimizedObjectPath(path);
  const oldUrl = getStoreMediaPublicUrl(admin, path);
  const newUrl = getStoreMediaPublicUrl(admin, newPath);

  if (apply) {
    const { error: uploadError } = await admin.storage
      .from(STORE_MEDIA_BUCKET)
      .upload(newPath, optimized.bytes, {
        contentType: optimized.mimeType,
        cacheControl: STORE_MEDIA_CACHE_CONTROL,
        upsert: true,
      });

    if (uploadError) {
      return { status: 'error', path, error: uploadError.message };
    }
  }

  return {
    status: 'optimized',
    path,
    newPath,
    oldUrl,
    newUrl,
    beforeBytes: originalBytes.byteLength,
    afterBytes: optimized.bytes.byteLength,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const admin = createAdminClient();

  console.log(
    `[backfill] mode=${options.apply ? 'APPLY' : 'DRY-RUN'} deleteOld=${options.deleteOld} limit=${options.limit ?? 'all'}`
  );

  const allPaths = await listAllStoreMediaPaths(admin);
  const targets = options.limit ? allPaths.slice(0, options.limit) : allPaths;
  console.log(`[backfill] objects found=${allPaths.length} processing=${targets.length}`);

  const urlMap = new Map<string, string>();
  const toDelete: string[] = [];
  let optimizedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let savedBytes = 0;

  for (const path of targets) {
    const result = await processObject(admin, path, options.apply);
    if (result.status === 'optimized') {
      optimizedCount += 1;
      savedBytes += result.beforeBytes - result.afterBytes;
      urlMap.set(result.oldUrl, result.newUrl);
      if (result.path !== result.newPath) {
        toDelete.push(result.path);
      }
      console.log(
        `  ✓ ${result.path} → ${result.newPath} (${formatBytes(result.beforeBytes)} → ${formatBytes(result.afterBytes)})`
      );
      continue;
    }

    if (result.status === 'skipped') {
      skippedCount += 1;
      console.log(`  · skip ${result.path} (${result.reason})`);
      continue;
    }

    errorCount += 1;
    console.error(`  ✗ ${result.path}: ${result.error}`);
  }

  console.log(
    `[backfill] files optimized=${optimizedCount} skipped=${skippedCount} errors=${errorCount} saved≈${formatBytes(savedBytes)}`
  );

  if (urlMap.size === 0) {
    console.log('[backfill] no URL rewrites needed');
    return;
  }

  const db = await rewriteDatabaseUrls(admin, urlMap, options.apply);
  console.log(
    `[backfill] db rows touched products=${db.products} categories=${db.categories} banners=${db.banners} themes=${db.themes}`
  );

  if (options.apply && options.deleteOld && toDelete.length > 0) {
    const { error: removeError } = await admin.storage
      .from(STORE_MEDIA_BUCKET)
      .remove(toDelete);
    if (removeError) {
      throw new Error(`delete-old failed: ${removeError.message}`);
    }
    console.log(`[backfill] deleted originals=${toDelete.length}`);
  } else if (toDelete.length > 0) {
    console.log(
      `[backfill] originals kept=${toDelete.length}${options.apply ? ' (pass --delete-old to remove)' : ''}`
    );
  }

  if (!options.apply) {
    console.log('[backfill] dry-run only — re-run with --apply to write changes');
  } else {
    console.log('[backfill] done');
  }
}

main().catch((error) => {
  console.error('[backfill] failed:', error);
  process.exit(1);
});
