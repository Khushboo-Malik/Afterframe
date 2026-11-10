import BackgroundCarousel from "@/components/BackgroundCarousel";
import FactTicker from "@/components/FactTicker";
import FloatingEmojis from "@/components/FloatingEmojis";
import { PinIcon } from "@/components/icons";
import type { Stage } from "@/lib/api";
import { plural } from "@/lib/format";
import { STAGE_COPY } from "@/lib/trip-state";

const STEP: Record<Stage, number> = { queued: 1, watching: 2, verifying: 3, finished: 3 };

/** Covers the map area while a trip is processing and no pin is on the map yet. */
export default function LoadingScene({ stage, found }: { stage: Stage | null; found: number }) {
  const s = stage ?? "queued";
  return (
    <div className="scene">
      <BackgroundCarousel />
      <FloatingEmojis />
      <div className="scene-in">
        <p className="stage" aria-live="polite">{STAGE_COPY[s]}</p>
        <ol className="steps" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <li key={n} className={n <= STEP[s] ? "on" : undefined} />
          ))}
        </ol>
        <p className="count" aria-live="polite">
          <PinIcon /> {plural(found, "place")} found
        </p>
        <FactTicker />
      </div>
    </div>
  );
}
