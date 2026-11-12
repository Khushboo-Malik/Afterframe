"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import LoadingScene from "@/components/LoadingScene";
import StateCard from "@/components/StateCard";
import StopPanel from "@/components/StopPanel";
import TripInfo from "@/components/TripInfo";
import TripMap from "@/components/TripMap";
import { Button } from "@/components/ui/button";
import { useTripEvents } from "@/hooks/useTripEvents";
import { submitVideo, videoIdFromKey, youtubeUrl, type Category, type TripOut } from "@/lib/api";
import { getConfirmed, setConfirmed } from "@/lib/confirmed";
import { plural } from "@/lib/format";
import { CATEGORY_ORDER, numberPlaces, STAGE_COPY } from "@/lib/trip-state";

const INFO_CODES = new Set(["instagram_unsupported", "rate_limited", "busy"]);

/**
 * The trip page: the map fills the screen; the trip info floats top-left; opening a stop
 * docks its panel on the right (a bottom sheet on phones) with ‹ Previous / Next stop ›.
 */
export default function TripView({ videoKey, initial }: { videoKey: string; initial: TripOut | null }) {
  const live = initial?.video.status === "processing" && !initial.stale;
  const { state, restart } = useTripEvents(videoKey, initial, live);
  const videoId = state.video?.video_id ?? videoIdFromKey(videoKey);

  const [filter, setFilter] = useState<Category | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmed, setConfirmedIds] = useState<Set<number>>(new Set());
  const [starting, setStarting] = useState(false);

  // The map fills exactly the space under the header, whose height varies (it wraps on phones).
  useEffect(() => {
    const head = document.querySelector<HTMLElement>(".s-head");
    if (!head) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--head-h", `${head.offsetHeight}px`));
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setConfirmedIds(getConfirmed());
  }, []);

  const { mapped, unmatched } = useMemo(() => numberPlaces(state.places), [state.places]);
  const present = CATEGORY_ORDER.filter((c) => state.places.some((p) => p.category === c));
  const shown = useMemo(() => (filter === "all" ? mapped : mapped.filter((p) => p.category === filter)), [mapped, filter]);
  const shownUnmatched = filter === "all" ? unmatched : unmatched.filter((p) => p.category === filter);
  const index = shown.findIndex((p) => p.id === selectedId);
  const selected = index >= 0 ? shown[index] : null;

  const processing = state.status === "processing" && !state.stale && !state.error;
  const broken = state.status === "failed" || state.stale || state.error === "failed" || state.error === "stalled";

  const step = useCallback(
    (d: 1 | -1) => {
      if (index < 0) return;
      const next = shown[index + d];
      if (next) setSelectedId(next.id);
    },
    [index, shown],
  );

  // ← / → walk the route, Esc closes the stop (not while typing in the header search).
  // Capture phase: otherwise Google's map takes the arrow keys to pan once a pin has focus.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") setSelectedId(null);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [selected, step]);

  function onConfirm(id: number) {
    setConfirmed(id, true);
    setConfirmedIds((s) => new Set(s).add(id));
  }

  async function startRun() {
    setStarting(true);
    const res = await submitVideo(youtubeUrl(videoId));
    setStarting(false);
    if (res.ok) {
      setSelectedId(null);
      restart();
    } else if (INFO_CODES.has(res.code)) {
      toast(res.message);
    } else {
      toast.error(res.message);
    }
  }

  // ---- never mapped (404) ----
  if (!state.video && !processing) {
    return (
      <main className="tp">
        <div className="tp-stage">
          <StateCard thumbnailUrl={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} message="This video hasn't been mapped yet.">
            <Button type="button" className="btn" onClick={startRun} disabled={starting}>
              {starting ? "Starting…" : "Map this video"}
            </Button>
          </StateCard>
        </div>
      </main>
    );
  }

  const verified = state.places.filter((p) => p.verification === "verified").length;
  const meta = processing
    ? state.places.length > 0
      ? `${STAGE_COPY[state.stage ?? "verifying"]} · ${plural(state.places.length, "place")} so far`
      : "Finding places…"
    : broken
      ? "Mapping stopped"
      : state.places.length === 0
        ? "0 places"
        : `${plural(state.places.length, "place")} · ${verified} verified`;
  const showChips = !processing && !broken && state.places.length > 0;
  const showMap = !broken && !(processing && mapped.length === 0) && !(!processing && state.places.length === 0);

  return (
    <main className="tp">
      <MapsProvider>
        <div className="tp-stage">
          {processing && mapped.length > 0 && (
            <div className="prog" role="progressbar" aria-label="Mapping in progress">
              <i />
            </div>
          )}

          {broken ? (
            <StateCard tone="bad" message="Something went wrong on our side.">
              <Button type="button" className="btn" onClick={startRun} disabled={starting}>
                {starting ? "Starting…" : "Try again"}
              </Button>
            </StateCard>
          ) : processing && mapped.length === 0 ? (
            <LoadingScene stage={state.stage} found={state.places.length} />
          ) : !processing && state.places.length === 0 ? (
            <StateCard message="No places found in this video — it might not be a travel vlog." />
          ) : (
            <TripMap
              places={shown}
              selectedId={selected?.id ?? null}
              panelOpen={!!selected}
              live={processing}
              onSelect={setSelectedId}
              onClear={() => setSelectedId(null)}
            />
          )}

          {state.video && showMap && (
            <TripInfo
              video={state.video}
              meta={meta}
              live={processing}
              partial={state.status === "partial"}
              categories={showChips ? present : []}
              active={filter}
              onFilter={(c) => {
                setFilter(c);
                setSelectedId(null);
              }}
              unmatched={shownUnmatched}
            />
          )}

          {selected && (
            <StopPanel
              place={selected}
              index={index}
              total={shown.length}
              videoId={videoId}
              confirmed={confirmed.has(selected.id)}
              onConfirm={onConfirm}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </MapsProvider>
    </main>
  );
}

/** Loads the Google Maps JS API once, for the map and Google's place card in the stop panel. */
function MapsProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return apiKey ? <APIProvider apiKey={apiKey}>{children}</APIProvider> : <>{children}</>;
}
