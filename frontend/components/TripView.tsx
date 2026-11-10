"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { WarnIcon } from "@/components/icons";
import LoadingScene from "@/components/LoadingScene";
import PlaceList from "@/components/PlaceList";
import StateCard from "@/components/StateCard";
import TripMap, { type MapFocus } from "@/components/TripMap";
import TripStrip from "@/components/TripStrip";
import { Button } from "@/components/ui/button";
import { useTripEvents } from "@/hooks/useTripEvents";
import { submitVideo, videoIdFromKey, youtubeUrl, type Category, type TripOut } from "@/lib/api";
import { getConfirmed, setConfirmed } from "@/lib/confirmed";
import { plural } from "@/lib/format";
import { CATEGORY_ORDER, numberPlaces, STAGE_COPY } from "@/lib/trip-state";

const INFO_CODES = new Set(["instagram_unsupported", "rate_limited", "busy"]);

export default function TripView({ videoKey, initial }: { videoKey: string; initial: TripOut | null }) {
  const live = initial?.video.status === "processing" && !initial.stale;
  const { state, restart } = useTripEvents(videoKey, initial, live);
  const reduceMotion = useReducedMotion();
  const videoId = state.video?.video_id ?? videoIdFromKey(videoKey);

  const [filter, setFilter] = useState<Category | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focus, setFocus] = useState<MapFocus>(null);
  const [confirmed, setConfirmedIds] = useState<Set<number>>(new Set());
  const [starting, setStarting] = useState(false);

  useEffect(() => setConfirmedIds(getConfirmed()), []);

  // Places that arrived after the first render get the "rise" animation.
  const seen = useRef<Set<number> | null>(null);
  if (seen.current === null) seen.current = new Set(state.places.map((p) => p.id));
  const newIds = useMemo(
    () => new Set(state.places.filter((p) => !seen.current!.has(p.id)).map((p) => p.id)),
    [state.places],
  );

  const { mapped, unmatched } = useMemo(() => numberPlaces(state.places), [state.places]);
  const present = CATEGORY_ORDER.filter((c) => state.places.some((p) => p.category === c));
  const shown = filter === "all" ? mapped : mapped.filter((p) => p.category === filter);
  const shownUnmatched = filter === "all" ? unmatched : unmatched.filter((p) => p.category === filter);

  const processing = state.status === "processing" && !state.stale && !state.error;
  const broken = state.status === "failed" || state.stale || state.error === "failed" || state.error === "stalled";

  function selectFromPin(id: number) {
    setSelectedId(id);
    document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }
  function selectFromCard(id: number) {
    setSelectedId(id);
    setFocus((f) => ({ id, seq: (f?.seq ?? 0) + 1 }));
  }
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
      setFocus(null);
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
      <main>
        <StateCard thumbnailUrl={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} message="This video hasn't been mapped yet.">
          <Button type="button" className="btn" onClick={startRun} disabled={starting}>
            {starting ? "Starting…" : "Map this video"}
          </Button>
        </StateCard>
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

  return (
    <main>
      {processing && mapped.length > 0 && (
        <div className="prog" role="progressbar" aria-label="Mapping in progress">
          <i />
        </div>
      )}
      {state.status === "partial" && (
        <div className="banner" role="status">
          <WarnIcon /> Some places may be missing — we hit a limit while checking. Try again tomorrow.
        </div>
      )}
      {state.video && (
        <TripStrip
          video={state.video}
          meta={meta}
          live={processing}
          categories={showChips ? present : []}
          active={filter}
          onFilter={(c) => {
            setFilter(c);
            setFocus(null);
          }}
        />
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
          selectedId={selectedId}
          focus={focus}
          onPinClick={selectFromPin}
          onShowAll={() => setFocus(null)}
        />
      )}

      {!broken && (
        <PlaceList
          mapped={shown}
          unmatched={shownUnmatched}
          videoId={videoId}
          selectedId={selectedId}
          newIds={newIds}
          confirmed={confirmed}
          onSelect={selectFromCard}
          onConfirm={onConfirm}
        />
      )}
    </main>
  );
}
