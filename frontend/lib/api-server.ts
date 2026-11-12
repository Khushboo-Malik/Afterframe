// Server-side reads, run by Next.js server components against BACKEND_URL directly
// (not through the rewrite). Env is read lazily so builds and CI need no secrets.
import { cacheLife } from "next/cache";

import type { GridOut, TripOut } from "./api";

function backendUrl(): string {
  return process.env.BACKEND_URL ?? "http://localhost:8000";
}

/**
 * The trip, or null when the backend says 404 (never mapped, or hidden).
 * Not cached: the trip page shows live state, and a cached "failed" or
 * "never mapped" snapshot would hide a run that was just started.
 */
export async function getTrip(key: string): Promise<TripOut | null> {
  const res = await fetch(`${backendUrl()}/api/videos/${key}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/videos/${key} ${res.status}`);
  return res.json();
}

const FEATURED_MIN_PLACES = 5;

/**
 * The trip the home page replays: FEATURED_TRIP_KEY when set, otherwise the newest
 * trip on the grid with at least FEATURED_MIN_PLACES places. Cached for 5 minutes.
 */
export async function getFeaturedTrip(newest: GridOut["results"]): Promise<TripOut | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  const pinned = process.env.FEATURED_TRIP_KEY;
  const key = pinned || newest.find((v) => v.place_count >= FEATURED_MIN_PLACES)?.key;
  if (!key) return null;
  const res = await fetch(`${backendUrl()}/api/videos/${key}`);
  if (!res.ok) return null;
  return res.json();
}

/** One page of the home grid, cached for 60 seconds per (page, q). */
export async function listTrips({ page, q }: { page: number; q?: string }): Promise<GridOut> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  const res = await fetch(`${backendUrl()}/api/videos?${params}`);
  if (!res.ok) throw new Error(`GET /api/videos ${res.status}`);
  return res.json();
}
