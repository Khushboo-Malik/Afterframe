"use client";

import { AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { FitIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { useSiteTheme } from "@/lib/theme";
import { CATEGORY_COLORS, type NumberedPlace } from "@/lib/trip-state";

const PANEL_W = 356; // desktop stop panel width + gap (see .sp in globals.css)
const CARD_W = 372; // desktop trip card width + gap (see .tc)
const PHONE = 720;
const STOP_ZOOM = 15;

type Props = {
  places: NumberedPlace[]; // already filtered by the category chips, in video order
  selectedId: number | null;
  panelOpen: boolean;
  live: boolean; // places are still streaming in
  onSelect: (id: number) => void;
  onClear: () => void; // a click on empty map closes the stop panel
};

type Pad = { top: number; right: number; bottom: number; left: number };

function padding(el: HTMLElement | null, panelOpen: boolean): Pad {
  const w = el?.clientWidth ?? 1200;
  if (w < PHONE) {
    // Keep pins clear of what actually covers the map on phones: the trip card and the stop sheet.
    const stage = el?.closest(".tp-stage");
    const top0 = el?.getBoundingClientRect().top ?? 0;
    const card = stage?.querySelector(".tc")?.getBoundingClientRect();
    const sheet = panelOpen ? stage?.querySelector(".sp")?.getBoundingClientRect() : undefined;
    return { top: card ? card.bottom - top0 + 16 : 150, right: 28, bottom: sheet ? sheet.height + 16 : 36, left: 28 };
  }
  return { top: 72, right: 76 + (panelOpen ? PANEL_W : 0), bottom: 56, left: CARD_W + 24 };
}

/** A gentle arc between two stops, sampled as lat/lng points, so the route reads as a journey. */
function arcPath(a: NumberedPlace, b: NumberedPlace): google.maps.LatLngLiteral[] {
  const mLat = (a.lat + b.lat) / 2, mLng = (a.lng + b.lng) / 2;
  const cLat = mLat + (b.lng - a.lng) * 0.16, cLng = mLng - (b.lat - a.lat) * 0.16;
  const pts: google.maps.LatLngLiteral[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, u = 1 - t;
    pts.push({ lat: u * u * a.lat + 2 * u * t * cLat + t * t * b.lat, lng: u * u * a.lng + 2 * u * t * cLng + t * t * b.lng });
  }
  return pts;
}

/** Fits every pin, keeping clear of the trip card (and the stop panel when it's open). */
function fitAll(map: google.maps.Map, places: NumberedPlace[], pad: Pad) {
  if (places.length === 0) return;
  if (places.length === 1) {
    map.setCenter(places[0]);
    map.setZoom(13);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  places.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, pad);
}

function Camera({ places, selected, panelOpen, live, fitSeq }: { places: NumberedPlace[]; selected: NumberedPlace | null; panelOpen: boolean; live: boolean; fitSeq: number }) {
  const map = useMap();
  const userMoved = useRef(false);
  const pinKey = places.map((p) => p.id).join(",");

  useEffect(() => {
    if (!map) return;
    const l = map.addListener("dragstart", () => (userMoved.current = true));
    return () => l.remove();
  }, [map]);

  // Fit everything: on load, on "Show all", on a category change, and as new pins stream in
  // (unless the visitor is looking at a stop or has moved the map themselves).
  useEffect(() => {
    if (!map || selected) return;
    if (live && userMoved.current) return;
    fitAll(map, places, padding(map.getDiv(), false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pinKey, fitSeq]);

  // Opening a stop: glide there, zoom in a little, then centre it in the space the panel leaves.
  useEffect(() => {
    if (!map || !selected) return;
    map.panTo(selected);
    if ((map.getZoom() ?? 0) < STOP_ZOOM - 1) map.setZoom(STOP_ZOOM);
    const pad = padding(map.getDiv(), panelOpen);
    const dx = (pad.right - pad.left) / 2, dy = (pad.bottom - pad.top) / 2;
    const once = google.maps.event.addListenerOnce(map, "idle", () => map.panBy(dx, dy));
    return () => once.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selected?.id]);

  return null;
}

/** The dotted route in video order: thin and quiet, the hop into the open stop a little stronger. */
function Route({ places, selectedId }: { places: NumberedPlace[]; selectedId: number | null }) {
  const map = useMap();
  const theme = useSiteTheme();
  const drawn = useRef(false);
  const pinKey = places.map((p) => p.id).join(",");

  useEffect(() => {
    if (!map || places.length < 2) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--af-accent").trim() || "#2443d0";
    const sel = places.findIndex((p) => p.id === selectedId);
    const lines = places.slice(1).map((p, i) => {
      const strong = i + 1 === sel;
      return new google.maps.Polyline({
        path: arcPath(places[i], p),
        clickable: false,
        strokeOpacity: 0,
        zIndex: strong ? 2 : 1,
        icons: [
          {
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: strong ? 2.1 : 1.5, strokeWeight: 0, fillColor: accent, fillOpacity: strong ? 1 : 0.5 },
            offset: "0",
            repeat: strong ? "9px" : "10px",
          },
        ],
      });
    });
    // The one entrance: the route draws itself hop by hop the first time (not with reduced motion).
    const animate = !drawn.current && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    drawn.current = true;
    const timers = lines.map((l, i) => (animate ? window.setTimeout(() => l.setMap(map), 120 + i * 70) : (l.setMap(map), 0)));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      lines.forEach((l) => l.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pinKey, selectedId, theme]);

  return null;
}

/** Which pins get a name label: greedy in video order, skipping labels that would overlap. */
function useLabels(places: NumberedPlace[], selectedId: number | null): Set<number> {
  const map = useMap();
  const [shown, setShown] = useState<Set<number>>(new Set());
  const pinKey = places.map((p) => p.id).join(",");

  useEffect(() => {
    if (!map) return;
    const compute = () => {
      const proj = map.getProjection();
      const zoom = map.getZoom();
      if (!proj || zoom == null) return;
      const scale = 2 ** zoom;
      const pts = places.map((p) => {
        const w = proj.fromLatLngToPoint(p)!;
        return { id: p.id, x: w.x * scale, y: w.y * scale, name: p.name };
      });
      // Pin circle ≈ 30px tall, sitting ~36px above its point; labels sit to its right.
      const pins = pts.map((p) => ({ x0: p.x - 15, x1: p.x + 15, y0: p.y - 40, y1: p.y - 8 }));
      const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
      const hit = (a: (typeof taken)[0], b: (typeof taken)[0]) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
      const order = [...pts.keys()].sort((a, b) => Number(pts[b].id === selectedId) - Number(pts[a].id === selectedId) || a - b);
      const next = new Set<number>();
      for (const i of order) {
        const p = pts[i];
        const box = { x0: p.x + 17, x1: p.x + 17 + Math.min(p.name.length, 26) * 7 + 14, y0: p.y - 35, y1: p.y - 13 };
        if (taken.some((t) => hit(t, box)) || pins.some((pin, j) => j !== i && hit(pin, box))) continue;
        taken.push(box);
        next.add(p.id);
      }
      setShown(next);
    };
    compute();
    const l = map.addListener("idle", compute);
    return () => l.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pinKey, selectedId]);

  return shown;
}

function Pins({ places, selectedId, onSelect }: { places: NumberedPlace[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const labels = useLabels(places, selectedId);
  return (
    <>
      {places.map((p) => {
        const sel = p.id === selectedId;
        return (
          <AdvancedMarker
            key={p.id}
            position={p}
            title={`${p.number}. ${p.name}`}
            zIndex={sel ? 10_000 : 1000 - p.number}
            onClick={() => onSelect(p.id)}
          >
            <div
              className={`pin drop${p.verification === "needs_review" ? " hollow" : ""}${sel ? " sel" : ""}`}
              style={{ "--c": CATEGORY_COLORS[p.category] } as CSSProperties}
            >
              <span>{p.number}</span>
              {labels.has(p.id) && <em className="pin-l">{p.name}</em>}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

function Controls({ onFit }: { onFit: () => void }) {
  const map = useMap();
  const zoom = (d: number) => map && map.setZoom((map.getZoom() ?? 12) + d);
  return (
    <div className="mc" role="group" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" onClick={() => zoom(1)}>
        <PlusIcon />
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => zoom(-1)}>
        <MinusIcon />
      </button>
      <button type="button" className="mc-fit" aria-label="Show all pins" onClick={onFit}>
        <FitIcon /> <span className="mc-fit-l">Show all</span>
      </button>
    </div>
  );
}

export default function TripMap({ places, selectedId, panelOpen, live, onSelect, onClear }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // DEMO_MAP_ID is Google's public test Map ID, used only when ours isn't set (e.g. CI builds).
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";
  const theme = useSiteTheme();
  const [fitSeq, setFitSeq] = useState(0);
  const selected = places.find((p) => p.id === selectedId) ?? null;

  if (!apiKey) {
    return (
      <div className="tp-map">
        <p className="map-msg">The map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in frontend/.env.local.</p>
      </div>
    );
  }

  const first = places[0];
  return (
    <div className={`tp-map${panelOpen ? " panel" : ""}`}>
      {/* Wait for the theme so the map loads once, in the right colours; a switch remounts it. */}
      {theme && (
        <Map
          key={theme}
          className="map-fill"
          mapId={mapId}
          colorScheme={theme === "dark" ? "DARK" : "LIGHT"}
          defaultCenter={first ? { lat: first.lat, lng: first.lng } : { lat: 20, lng: 0 }}
          defaultZoom={first ? 12 : 2}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          onClick={onClear}
        >
          <Route places={places} selectedId={selectedId} />
          <Pins places={places} selectedId={selectedId} onSelect={onSelect} />
          <Camera places={places} selected={selected} panelOpen={panelOpen} live={live} fitSeq={fitSeq} />
        </Map>
      )}
      {theme && <Controls onFit={() => setFitSeq((n) => n + 1)} />}
    </div>
  );
}
