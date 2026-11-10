import { Suspense } from "react";

import DemoPlayer from "@/components/DemoPlayer";
import TripGrid, { GridSkeleton } from "@/components/TripGrid";
import type { GridOut } from "@/lib/api";
import { listTrips } from "@/lib/api-server";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="s-main">
      <Suspense fallback={<GridSkeleton />}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, 100);

  let grid: GridOut | null = null;
  try {
    grid = await listTrips({ page: 1, q });
  } catch {
    grid = null;
  }

  return (
    <>
      {/* The demo is hidden while searching. */}
      {!q && <DemoPlayer />}
      {grid ? (
        <TripGrid key={q} initial={grid} q={q} />
      ) : (
        <div className="empty" role="status">
          <b>We couldn't load the mapped trips right now.</b>
          <span>Try again in a minute.</span>
        </div>
      )}
    </>
  );
}
