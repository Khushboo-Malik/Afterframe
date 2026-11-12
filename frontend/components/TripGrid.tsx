"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import TripCard, { TripCardSkeleton } from "@/components/TripCard";
import { Button } from "@/components/ui/button";
import { fetchTripsPage, type GridOut, type VideoOut } from "@/lib/api";

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Page 1 arrives server-rendered; "Load more" fetches the next pages from the browser. */
export default function TripGrid({ initial, q }: { initial: GridOut; q: string }) {
  const [items, setItems] = useState<VideoOut[]>(initial.results);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial.has_more);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const next = await fetchTripsPage({ page: page + 1, q });
      setItems((prev) => {
        const seen = new Set(prev.map((v) => v.key));
        return [...prev, ...next.results.filter((v) => !seen.has(v.key))];
      });
      setPage((p) => p + 1);
      setHasMore(next.has_more);
    } catch {
      toast.error("Couldn't load more trips — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="stack" id="trips" aria-label={q ? `Mapped trips matching ${q}` : "Mapped trips"}>
      {items.length === 0 ? (
        <div className="empty">
          <b>{q ? `No mapped trips match ‘${q}’.` : "No mapped trips yet."}</b>
          <span>
            <Link href="/">Paste a YouTube link on the home page</Link> to map {q ? "a new one" : "the first one"}.
          </span>
        </div>
      ) : (
        <div className="grid">
          {items.map((v) => (
            <TripCard key={v.key} video={v} />
          ))}
          {loading && Array.from({ length: 4 }, (_, i) => <TripCardSkeleton key={`sk${i}`} />)}
        </div>
      )}

      {hasMore && (
        <Button type="button" className="btn ghost more" onClick={loadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </Button>
      )}
    </section>
  );
}
