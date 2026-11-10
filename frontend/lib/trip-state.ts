// Live trip state. Everything that changes a trip on screen goes through
// tripReducer: the server-rendered snapshot, SSE events and the polling fallback.
import type { Category, PlaceOut, Stage, TripOut, VideoOut, VideoStatus } from "./api";

export interface TripState {
  video: VideoOut | null; // null = never mapped (GET returned 404)
  places: PlaceOut[]; // sorted by ord
  status: VideoStatus | null;
  stage: Stage | null;
  stale: boolean;
  error: string | null; // "failed" | "stalled" | "not_found" from SSE
  count: number | null; // final place_count from the done event
}

export type TripEvent =
  | { type: "meta"; video: VideoOut }
  | { type: "stage"; stage: Stage }
  | { type: "place"; place: PlaceOut }
  | { type: "snapshot"; trip: TripOut | null }
  | { type: "done"; status: "done" | "partial"; count: number }
  | { type: "error"; code: string }
  | { type: "restart" }; // [Map this video] / [Try again] started a new run

export function initialTripState(trip: TripOut | null): TripState {
  if (!trip) {
    return { video: null, places: [], status: null, stage: null, stale: false, error: null, count: null };
  }
  return {
    video: trip.video,
    places: sortByOrd(trip.places),
    status: trip.video.status,
    stage: trip.video.stage,
    stale: trip.stale,
    error: null,
    count: trip.video.status === "processing" ? null : trip.video.place_count,
  };
}

function sortByOrd(places: PlaceOut[]): PlaceOut[] {
  return [...places].sort((a, b) => a.ord - b.ord || a.id - b.id);
}

export function tripReducer(state: TripState, ev: TripEvent): TripState {
  switch (ev.type) {
    case "meta":
      // Sent first on every SSE connection, so its status/stage are current.
      return { ...state, video: ev.video, status: ev.video.status, stage: ev.video.stage, error: null };
    case "stage":
      return { ...state, stage: ev.stage };
    case "place": {
      // Upsert by id: reconnects can resend a place the snapshot already had.
      const rest = state.places.filter((p) => p.id !== ev.place.id);
      return { ...state, places: sortByOrd([...rest, ev.place]) };
    }
    case "snapshot":
      return initialTripState(ev.trip);
    case "done":
      return { ...state, status: ev.status, stage: "finished", count: ev.count, stale: false };
    case "error":
      return {
        ...state,
        error: ev.code,
        status: ev.code === "failed" ? "failed" : state.status,
        stale: ev.code === "stalled" ? true : state.stale,
        video: ev.code === "not_found" ? null : state.video,
      };
    case "restart":
      return { ...state, places: [], status: "processing", stage: "queued", stale: false, error: null, count: null };
  }
}

export type NumberedPlace = PlaceOut & { number: number; lat: number; lng: number };

/**
 * Map numbers follow the video's order: verified + needs_review places with
 * coordinates, sorted by ord, numbered from 1. Unmatched places get no number.
 */
export function numberPlaces(places: PlaceOut[]): { mapped: NumberedPlace[]; unmatched: PlaceOut[] } {
  const mapped: NumberedPlace[] = [];
  const unmatched: PlaceOut[] = [];
  for (const p of sortByOrd(places)) {
    if (p.verification !== "unmatched" && p.lat != null && p.lng != null) {
      mapped.push({ ...p, lat: p.lat, lng: p.lng, number: mapped.length + 1 });
    } else {
      unmatched.push(p);
    }
  }
  return { mapped, unmatched };
}

export const CATEGORY_ORDER: Category[] = ["food", "stay", "attraction", "activity", "shopping", "other"];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food",
  stay: "Stay",
  attraction: "Attraction",
  activity: "Activity",
  shopping: "Shopping",
  other: "Other",
};

// CSS variables (defined in globals.css for light and dark) so pins and chips follow the theme.
export const CATEGORY_COLORS: Record<Category, string> = {
  food: "var(--cat-food)",
  stay: "var(--cat-stay)",
  attraction: "var(--cat-attraction)",
  activity: "var(--cat-activity)",
  shopping: "var(--cat-shopping)",
  other: "var(--cat-other)",
};

export const STAGE_COPY: Record<Stage, string> = {
  queued: "Packing your bags…",
  watching: "Watching the vlog for hidden gems…",
  verifying: "Checking each spot on the map…",
  finished: "Checking each spot on the map…",
};
