'use client';

import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { uploadStoreMedia } from '@/lib/admin/store-media-client';
import type {
  StoreProductVariation,
  StoreProductVariationOption,
} from '@/lib/store/product-variations';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  enabled: boolean;
  variations: StoreProductVariation[];
}

function createEmptyOption(): StoreProductVariationOption {
  return { label: '' };
}

function createEmptyVariation(): StoreProductVariation {
  return { name: '', options: [createEmptyOption()] };
}

export default function StoreProductVariationsFields({
  enabled: initialEnabled,
  variations: initialVariations,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [variations, setVariations] = useState<StoreProductVariation[]>(
    initialVariations.length > 0 ? initialVariations : []
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  function updateVariationName(index: number, name: string) {
    setVariations((current) =>
      current.map((variation, variationIndex) =>
        variationIndex === index ? { ...variation, name } : variation
      )
    );
  }

  function updateOptionLabel(
    variationIndex: number,
    optionIndex: number,
    label: string
  ) {
    setVariations((current) =>
      current.map((variation, currentVariationIndex) => {
        if (currentVariationIndex !== variationIndex) return variation;
        const options = [...variation.options];
        options[optionIndex] = { ...options[optionIndex], label };
        return { ...variation, options };
      })
    );
  }

  function updateOptionImage(
    variationIndex: number,
    optionIndex: number,
    imageUrl: string
  ) {
    setVariations((current) =>
      current.map((variation, currentVariationIndex) => {
        if (currentVariationIndex !== variationIndex) return variation;
        const options = [...variation.options];
        options[optionIndex] = {
          ...options[optionIndex],
          ...(imageUrl ? { imageUrl } : {}),
        };
        if (!imageUrl) {
          const { imageUrl: _removed, ...rest } = options[optionIndex];
          options[optionIndex] = rest;
        }
        return { ...variation, options };
      })
    );
  }

  async function uploadOptionImage(
    variationIndex: number,
    optionIndex: number,
    file: File
  ) {
    const key = `${variationIndex}-${optionIndex}`;
    setUploadingKey(key);
    setUploadError('');

    try {
      const url = await uploadStoreMedia(file, 'products');
      updateOptionImage(variationIndex, optionIndex, url);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Falha no upload da imagem.'
      );
    } finally {
      setUploadingKey(null);
    }
  }

  function addOption(variationIndex: number) {
    setVariations((current) =>
      current.map((variation, currentVariationIndex) =>
        currentVariationIndex === variationIndex
          ? { ...variation, options: [...variation.options, createEmptyOption()] }
          : variation
      )
    );
  }

  function removeOption(variationIndex: number, optionIndex: number) {
    setVariations((current) =>
      current.map((variation, currentVariationIndex) => {
        if (currentVariationIndex !== variationIndex) return variation;
        const options = variation.options.filter(
          (_, currentOptionIndex) => currentOptionIndex !== optionIndex
        );
        return {
          ...variation,
          options: options.length > 0 ? options : [createEmptyOption()],
        };
      })
    );
  }

  function addVariation() {
    setVariations((current) => [...current, createEmptyVariation()]);
  }

  function removeVariation(index: number) {
    setVariations((current) => current.filter((_, variationIndex) => variationIndex !== index));
  }

  const serializedVariations = JSON.stringify(
    variations
      .map((variation) => ({
        name: variation.name.trim(),
        options: variation.options
          .map((option) => ({
            label: option.label.trim(),
            ...(option.imageUrl?.trim() ? { imageUrl: option.imageUrl.trim() } : {}),
          }))
          .filter((option) => option.label),
      }))
      .filter((variation) => variation.name && variation.options.length > 0)
  );

  return (
    <div className="space-y-4 rounded-sm border border-white/10 bg-stone-950/40 p-4">
      <input type="hidden" name="variations" value={serializedVariations} />

      <label className="flex items-start gap-3 text-sm text-stone-300">
        <input
          type="checkbox"
          name="variations_enabled"
          checked={enabled}
          onChange={(event) => {
            const nextEnabled = event.target.checked;
            setEnabled(nextEnabled);
            if (nextEnabled && variations.length === 0) {
              setVariations([createEmptyVariation()]);
            }
          }}
          className="mt-1 rounded border-white/20"
        />
        <span>
          <span className="font-display text-xs uppercase tracking-widest text-stone-400">
            Variações do produto
          </span>
          <span className="mt-1 block text-xs text-stone-500">
            Ative para oferecer escolhas ao cliente (ex.: variedades, cor, tamanho).
            Cada opção pode ter uma imagem própria.
          </span>
        </span>
      </label>

      {uploadError ? (
        <p className="text-sm text-red-400" role="alert">
          {uploadError}
        </p>
      ) : null}

      {enabled ? (
        <div className="space-y-4">
          {variations.map((variation, variationIndex) => (
            <div
              key={variationIndex}
              className="rounded-sm border border-white/10 bg-stone-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label className={labelClass}>Nome da variação</label>
                  <input
                    value={variation.name}
                    onChange={(event) =>
                      updateVariationName(variationIndex, event.target.value)
                    }
                    placeholder="Ex.: Variedade, Cor, Tamanho"
                    className="mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariation(variationIndex)}
                  className="mt-7 inline-flex cursor-pointer items-center gap-1 rounded-sm border border-red-500/30 px-2 py-1 text-xs text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </div>

              <div className="mt-4">
                <p className={labelClass}>Opções</p>
                <ul className="mt-2 space-y-3">
                  {variation.options.map((option, optionIndex) => {
                    const uploadKey = `${variationIndex}-${optionIndex}`;
                    const isUploading = uploadingKey === uploadKey;

                    return (
                      <li
                        key={optionIndex}
                        className="rounded-sm border border-white/10 bg-stone-950/80 p-3"
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-stone-900/60">
                            {option.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={option.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="px-1 text-center text-[10px] text-stone-600">
                                Sem imagem
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              value={option.label}
                              onChange={(event) =>
                                updateOptionLabel(
                                  variationIndex,
                                  optionIndex,
                                  event.target.value
                                )
                              }
                              placeholder={`Opção ${optionIndex + 1}`}
                              className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
                            />

                            <div className="flex flex-wrap gap-2">
                              <label
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-white/10 px-2.5 py-1.5 text-xs text-stone-300 hover:border-white/20 ${
                                  isUploading ? 'cursor-not-allowed opacity-60' : ''
                                }`}
                              >
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="sr-only"
                                  disabled={isUploading}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = '';
                                    if (file) {
                                      void uploadOptionImage(
                                        variationIndex,
                                        optionIndex,
                                        file
                                      );
                                    }
                                  }}
                                />
                                {isUploading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-3.5 w-3.5" />
                                )}
                                {option.imageUrl ? 'Trocar imagem' : 'Enviar imagem'}
                              </label>

                              {option.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateOptionImage(variationIndex, optionIndex, '')
                                  }
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-white/10 px-2.5 py-1.5 text-xs text-stone-400 hover:text-white"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remover imagem
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label="Remover opção"
                            onClick={() => removeOption(variationIndex, optionIndex)}
                            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => addOption(variationIndex)}
                  className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar opção
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addVariation}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-console/30 px-3 py-2 text-xs uppercase tracking-widest text-console"
          >
            <Plus className="h-4 w-4" />
            Nova variação
          </button>
        </div>
      ) : null}
    </div>
  );
}
