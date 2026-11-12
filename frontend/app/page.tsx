import { Suspense } from "react";

import DemoPlayer from "@/components/DemoPlayer";
import PasteBox from "@/components/home/PasteBox";
import TripChips from "@/components/home/TripChips";
import StreetLines from "@/components/StreetLines";
import type { GridOut } from "@/lib/api";
import { listTrips } from "@/lib/api-server";

const CHIP_COUNT = 12;

// Home: the link box, today's free slots, the newest trips as chips, and the demo video.
// The full list lives on /trips ("Mapped trips" in the header).
export default function Home() {
  return (
    <main className="s-main home">
      <StreetLines />
      <Suspense fallback={<Hero chips={[]} />}>
        <HeroWithChips />
      </Suspense>
      <DemoPlayer />
    </main>
  );
}

async function HeroWithChips() {
  let chips: GridOut["results"] = [];
  try {
    chips = (await listTrips({ page: 1 })).results.slice(0, CHIP_COUNT);
  } catch {
    chips = [];
  }
  return <Hero chips={chips} />;
}

function Hero({ chips }: { chips: GridOut["results"] }) {
  return (
    <section className="hx" aria-labelledby="hx-h">
      <h1 id="hx-h" className="hx-h">
        Paste a travel vlog.
        <br />
        Watch it become a <mark>map.</mark>
      </h1>
      <p className="hx-sub">Every place in the video, checked on Google Maps and pinned at its timestamp.</p>
      <PasteBox initialQuery="" />
      <div className="hx-row">
        <TripChips trips={chips} />
      </div>
    </section>
  );
}
