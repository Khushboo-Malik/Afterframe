import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import StreetLines from "@/components/StreetLines";
import TripGrid, { GridSkeleton } from "@/components/TripGrid";
import TripSearch from "@/components/TripSearch";
import type { GridOut } from "@/lib/api";
import { listTrips } from "@/lib/api-server";

export const metadata: Metadata = {
  title: "Mapped trips",
  description: "Every travel vlog mapped on AfterFrame so far, newest first.",
};

export default function TripsPage({ searchParams }: PageProps<"/trips">) {
  return (
    <main className="s-main trips">
      <StreetLines />
      <Suspense fallback={<TripsSkeleton />}>
        <TripsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TripsContent({ searchParams }: { searchParams: PageProps<"/trips">["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, 100);

  let grid: GridOut | null = null;
  try {
    grid = await listTrips({ page: 1, q });
  } catch {
    grid = null;
  }
  // A total only when everything fits on one page; otherwise just the order (no invented counts).
  const sub = q
    ? null
    : grid && !grid.has_more
      ? `${grid.results.length} ${grid.results.length === 1 ? "trip" : "trips"} · newest first`
      : "Newest first";

  return (
    <>
      <div className="trips-head">
        <div>
          <h1>{q ? <>Results for ‘{q}’</> : "Mapped trips"}</h1>
          {q ? (
            <p>
              <Link href="/trips">Clear search</Link>
            </p>
          ) : (
            sub && <p>{sub}</p>
          )}
        </div>
        <TripSearch key={q} initialQuery={q} />
      </div>
      {grid ? (
        <TripGrid key={q} initial={grid} q={q} />
      ) : (
        <div className="empty" role="status">
          <b>We couldn&apos;t load the mapped trips right now.</b>
          <span>Try again in a minute.</span>
        </div>
      )}
    </>
  );
}

function TripsSkeleton() {
  return (
    <>
      <div className="trips-head">
        <div>
          <h1>Mapped trips</h1>
        </div>
      </div>
      <GridSkeleton />
    </>
  );
}
