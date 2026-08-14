'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer, type Marker } from '@googlemaps/markerclusterer';
import type { SalesMapPin } from '@/lib/admin/sales-map';

const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };

const KIND_LABEL: Record<SalesMapPin['kind'], string> = {
  subscription: 'Assinatura ativa',
  store: 'Compra na loja',
  both: 'Assinatura + loja',
};

const KIND_COLOR: Record<SalesMapPin['kind'], string> = {
  subscription: '#38bdf8',
  store: '#fbbf24',
  both: '#a78bfa',
};

type Props = {
  pins: SalesMapPin[];
  apiKey: string;
};

function ClusteredPins({
  pins,
  selectedId,
  onSelect,
}: {
  pins: SalesMapPin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const map = useMap();
  const markersRef = useRef(new globalThis.Map<string, Marker>());
  const clustererRef = useRef<MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return;

    const clusterer = new MarkerClusterer({ map });
    clustererRef.current = clusterer;

    return () => {
      clusterer.clearMarkers();
      clustererRef.current = null;
    };
  }, [map]);

  const syncClusterer = useCallback(() => {
    const clusterer = clustererRef.current;
    if (!clusterer) return;
    clusterer.clearMarkers();
    clusterer.addMarkers(Array.from(markersRef.current.values()));
  }, []);

  const setMarkerRef = useCallback(
    (id: string, marker: Marker | null) => {
      const current = markersRef.current.get(id);
      if (marker) {
        if (current === marker) return;
        markersRef.current.set(id, marker);
      } else if (current) {
        markersRef.current.delete(id);
      } else {
        return;
      }
      syncClusterer();
    },
    [syncClusterer]
  );

  useEffect(() => {
    const alive = new Set(pins.map((pin) => pin.id));
    let changed = false;
    for (const id of Array.from(markersRef.current.keys())) {
      if (!alive.has(id)) {
        markersRef.current.delete(id);
        changed = true;
      }
    }
    if (changed) syncClusterer();
  }, [pins, syncClusterer]);

  const selectedPin = useMemo(
    () => pins.find((pin) => pin.id === selectedId) ?? null,
    [pins, selectedId]
  );

  return (
    <>
      {pins.map((pin) => (
        <AdvancedMarker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          title={`${pin.name} — ${pin.city}/${pin.state}`}
          onClick={() => onSelect(pin.id)}
          ref={(marker) => {
            setMarkerRef(pin.id, marker);
          }}
        >
          <span
            className="block h-3.5 w-3.5 rounded-full border-2 border-zinc-950 shadow"
            style={{ backgroundColor: KIND_COLOR[pin.kind] }}
            aria-hidden="true"
          />
        </AdvancedMarker>
      ))}

      {selectedPin ? (
        <InfoWindow
          position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
          onCloseClick={() => onSelect(null)}
        >
          <div className="min-w-[180px] max-w-[240px] space-y-1 p-1 text-zinc-900">
            <p className="text-sm font-semibold leading-tight">{selectedPin.name}</p>
            <p className="text-xs text-zinc-600">
              {selectedPin.city}/{selectedPin.state}
            </p>
            <p className="text-xs text-zinc-600">{KIND_LABEL[selectedPin.kind]}</p>
            {selectedPin.email ? (
              <p className="truncate text-[11px] text-zinc-500">{selectedPin.email}</p>
            ) : null}
            <Link
              href={selectedPin.href}
              className="inline-flex pt-1 text-xs font-medium text-sky-700 underline"
            >
              Ver cliente
            </Link>
          </div>
        </InfoWindow>
      ) : null}
    </>
  );
}

export default function SalesCustomersMap({ pins, apiKey }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | SalesMapPin['kind']>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return pins;
    return pins.filter((p) => p.kind === filter);
  }, [filter, pins]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'Todos'],
            ['subscription', 'Assinatura'],
            ['store', 'Loja'],
            ['both', 'Ambos'],
          ] as const
        ).map(([value, label]) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setSelectedId(null);
              }}
              className={`inline-flex min-h-[36px] cursor-pointer items-center rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                active
                  ? 'border-console/40 bg-console/15 text-console'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900">
        <div className="h-[min(70vh,640px)] w-full">
          <APIProvider apiKey={apiKey}>
            <GoogleMap
              defaultCenter={BRAZIL_CENTER}
              defaultZoom={4}
              mapId="dungeonbox-sales-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              colorScheme="DARK"
              className="h-full w-full"
            >
              <ClusteredPins
                pins={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </GoogleMap>
          </APIProvider>
        </div>
      </div>

      <ul className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <li className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: KIND_COLOR.subscription }}
          />
          Assinatura
        </li>
        <li className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: KIND_COLOR.store }}
          />
          Loja
        </li>
        <li className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: KIND_COLOR.both }}
          />
          Ambos
        </li>
      </ul>
    </div>
  );
}
