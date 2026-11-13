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

/**
 * One page of the home grid, cached for 60 seconds per (page, q).
 *
 * `next build` prerenders "/" and calls this. If the backend can't be reached
 * then (CI has none; on Vercel it may be redeploying), return an empty list
 * instead of throwing: a throw inside "use cache" fails the whole build even
 * though the page catches it. The page refills within 60 s. Outside the build,
 * errors still throw, so a failed refresh never caches an empty list.
 */
export async function listTrips({ page, q }: { page: number; q?: string }): Promise<GridOut> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  try {
    const res = await fetch(`${backendUrl()}/api/videos?${params}`);
    if (!res.ok) throw new Error(`GET /api/videos ${res.status}`);
    return await res.json();
  } catch (err) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw err;
    console.warn(`listTrips: backend unreachable during build, prerendering an empty list (${err})`);
    return { results: [], has_more: false };
  }
}
