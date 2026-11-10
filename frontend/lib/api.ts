// Types mirror the API contract in 00-overview.md exactly (snake_case, no conversion),
// plus the browser-side calls. Browser calls use relative /api URLs, which
// next.config.ts rewrites to Django, so the browser only ever talks to this site.

export type Category = "food" | "stay" | "attraction" | "activity" | "shopping" | "other";
export type VideoStatus = "processing" | "done" | "partial" | "failed";
export type Stage = "queued" | "watching" | "verifying" | "finished";
export type Verification = "verified" | "needs_review" | "unmatched";

export interface VideoOut {
  key: string;
  platform: string;
  url: string;
  video_id: string;
  title: string;
  channel: string;
  duration_sec: number;
  thumbnail_url: string;
  status: VideoStatus;
  stage: Stage;
  error_code: string | null;
  place_count: number;
  created_at: string;
}

export interface PlaceOut {
  id: number;
  ord: number;
  name: string;
  category: Category;
  timestamp_sec: number;
  description: string;
  verification: Verification;
  match_score: number;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  maps_url: string | null;
}

export interface TripOut {
  video: VideoOut;
  places: PlaceOut[];
  stale: boolean;
}

export interface GridOut {
  results: VideoOut[];
  has_more: boolean;
}

export type SubmitStatus = "done" | "partial" | "processing";

export type SubmitResult =
  | { ok: true; video_key: string; status: SubmitStatus }
  | { ok: false; code: string; message: string };

// Shown only when the backend didn't send its own {code, message}
// (e.g. a proxy error or DRF's per-minute throttle).
const BUSY_MESSAGE = "We're a bit busy — try again in a minute.";
const FAILED_MESSAGE = "Something went wrong on our side.";

export const VIDEO_KEY_RE = /^yt_[A-Za-z0-9_-]{11}$/;

export async function submitVideo(url: string): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    return { ok: false, code: "busy", message: BUSY_MESSAGE };
  }
  const body = await res.json().catch(() => null);
  if (res.ok && body?.video_key) {
    return { ok: true, video_key: body.video_key, status: body.status };
  }
  if (body?.code && body?.message) {
    return { ok: false, code: body.code, message: body.message };
  }
  if (res.status === 429 || res.status >= 502) {
    return { ok: false, code: "busy", message: BUSY_MESSAGE };
  }
  return { ok: false, code: "failed", message: FAILED_MESSAGE };
}

/** One page of the home grid, fetched from the browser ("Load more"). */
export async function fetchTripsPage({ page, q }: { page: number; q?: string }): Promise<GridOut> {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  const res = await fetch(`/api/videos?${params}`);
  if (!res.ok) throw new Error(`GET /api/videos ${res.status}`);
  return res.json();
}

/** The current trip, fetched from the browser (polling fallback when SSE can't connect). */
export async function fetchTrip(key: string): Promise<TripOut | null> {
  const res = await fetch(`/api/videos/${key}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/videos/${key} ${res.status}`);
  return res.json();
}

export function youtubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeAt(videoId: string, sec: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.max(0, Math.floor(sec))}s`;
}

export function videoIdFromKey(key: string): string {
  return key.replace(/^yt_/, "");
}
