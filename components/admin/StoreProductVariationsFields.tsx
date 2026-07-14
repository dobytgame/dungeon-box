'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { StoreProductVariation } from '@/lib/store/product-variations';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  enabled: boolean;
  variations: StoreProductVariation[];
}

function createEmptyVariation(): StoreProductVariation {
  return { name: '', options: [''] };
}

export default function StoreProductVariationsFields({
  enabled: initialEnabled,
  variations: initialVariations,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [variations, setVariations] = useState<StoreProductVariation[]>(
    initialVariations.length > 0 ? initialVariations : []
  );

  function updateVariationName(index: number, name: string) {
    setVariations((current) =>
      current.map((variation, variationIndex) =>
        variationIndex === index ? { ...variation, name } : variation
      )
    );
  }

  function updateOption(variationIndex: number, optionIndex: number, value: string) {
    setVariations((current) =>
      current.map((variation, currentVariationIndex) => {
        if (currentVariationIndex !== variationIndex) return variation;
        const options = [...variation.options];
        options[optionIndex] = value;
        return { ...variation, options };
      })
    );
  }

  function addOption(variationIndex: number) {
    setVariations((current) =>
      current.map((variation, currentVariationIndex) =>
        currentVariationIndex === variationIndex
          ? { ...variation, options: [...variation.options, ''] }
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
        return { ...variation, options: options.length > 0 ? options : [''] };
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
        options: variation.options.map((option) => option.trim()).filter(Boolean),
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
            Ative para pedir uma escolha ao cliente antes de adicionar ao carrinho
            (ex.: cor, tamanho, acabamento).
          </span>
        </span>
      </label>

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
                    placeholder="Ex.: Cor, Tamanho, Acabamento"
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
                <ul className="mt-2 space-y-2">
                  {variation.options.map((option, optionIndex) => (
                    <li key={optionIndex} className="flex gap-2">
                      <input
                        value={option}
                        onChange={(event) =>
                          updateOption(variationIndex, optionIndex, event.target.value)
                        }
                        placeholder={`Opção ${optionIndex + 1}`}
                        className="min-w-0 flex-1 rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        aria-label="Remover opção"
                        onClick={() => removeOption(variationIndex, optionIndex)}
                        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
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
