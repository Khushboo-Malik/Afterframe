"use client";

import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef, type CSSProperties } from "react";

import { CATEGORY_COLORS, type NumberedPlace } from "@/lib/trip-state";

export type MapFocus = { id: number; seq: number } | null;

type Props = {
  places: NumberedPlace[]; // already filtered by the category chips
  selectedId: number | null;
  focus: MapFocus; // set when a card is clicked: pan + zoom to that pin
  onPinClick: (id: number) => void;
  onShowAll: () => void;
};

/** Fits the map to every pin whenever the pin set changes, unless a card asked to focus one pin. */
function Camera({ places, focus }: { places: NumberedPlace[]; focus: MapFocus }) {
  const map = useMap();
  const pinKey = places.map((p) => p.id).join(",");
  const lastFocus = useRef<number | null>(null);

  useEffect(() => {
    if (!map || focus || places.length === 0) return;
    if (places.length === 1) {
      map.setCenter({ lat: places[0].lat, lng: places[0].lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 56);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pinKey, focus]);

  useEffect(() => {
    if (!map || !focus || focus.seq === lastFocus.current) return;
    lastFocus.current = focus.seq;
    const p = places.find((x) => x.id === focus.id);
    if (!p) return;
    map.panTo({ lat: p.lat, lng: p.lng });
    map.setZoom(Math.max(map.getZoom() ?? 0, 15));
  }, [map, focus, places]);

  return null;
}

export default function TripMap({ places, selectedId, focus, onPinClick, onShowAll }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // DEMO_MAP_ID is Google's public test Map ID, used only when ours isn't set (e.g. CI builds).
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

  if (!apiKey) {
    return (
      <div className="map-area">
        <p className="map-msg">The map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in frontend/.env.local.</p>
      </div>
    );
  }

  const first = places[0];
  return (
    <div className="map-area">
      <APIProvider apiKey={apiKey}>
        <Map
          className="map-fill"
          mapId={mapId}
          defaultCenter={first ? { lat: first.lat, lng: first.lng } : { lat: 20, lng: 0 }}
          defaultZoom={first ? 12 : 2}
          gestureHandling="cooperative"
          colorScheme="FOLLOW_SYSTEM"
          mapTypeControl={false}
          streetViewControl={false}
          clickableIcons={false}
          reuseMaps
        >
          {places.map((p) => {
            const selected = p.id === selectedId;
            return (
              <AdvancedMarker
                key={p.id}
                position={{ lat: p.lat, lng: p.lng }}
                title={`${p.number}. ${p.name}`}
                zIndex={selected ? 10_000 : 1000 - p.number}
                onClick={() => onPinClick(p.id)}
              >
                <div
                  className={`pin drop${p.verification === "needs_review" ? " hollow" : ""}${selected ? " sel" : ""}`}
                  style={{ "--c": CATEGORY_COLORS[p.category] } as CSSProperties}
                >
                  <span>{p.number}</span>
                </div>
              </AdvancedMarker>
            );
          })}
          <Camera places={places} focus={focus} />
        </Map>
      </APIProvider>
      {focus && (
        <button type="button" className="fitall" onClick={onShowAll}>
          Show all pins
        </button>
      )}
    </div>
  );
}
