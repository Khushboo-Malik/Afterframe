import { Suspense } from "react";

import DemoPlayer from "@/components/DemoPlayer";
import PasteBox from "@/components/home/PasteBox";
import SlotMeter from "@/components/home/SlotMeter";
import TripChips from "@/components/home/TripChips";
import TripGrid, { GridSkeleton } from "@/components/TripGrid";
import type { GridOut } from "@/lib/api";
import { listTrips } from "@/lib/api-server";

const CHIP_COUNT = 12;

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="s-main home">
      <Suspense fallback={<HomeSkeleton />}>
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
      <Hero q={q} chips={q ? [] : (grid?.results ?? []).slice(0, CHIP_COUNT)} />
      {!q && <DemoPlayer />}
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

function Hero({ q, chips }: { q: string; chips: GridOut["results"] }) {
  return (
    <section className="hx" aria-labelledby="hx-h">
      <h1 id="hx-h" className="hx-h">
        Paste a travel vlog.
        <br />
        Watch it become a <mark>map.</mark>
      </h1>
      <p className="hx-sub">
        Every place in the video, checked on Google Maps and pinned at its timestamp.
      </p>
      <PasteBox key={q} initialQuery={q} />
      <div className="hx-row">
        <SlotMeter />
        <TripChips trips={chips} />
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <>
      <Hero q="" chips={[]} />
      <GridSkeleton />
    </>
  );
}
