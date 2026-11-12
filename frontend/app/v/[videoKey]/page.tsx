import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import StateCard from "@/components/StateCard";
import TripView from "@/components/TripView";
import { Skeleton } from "@/components/ui/skeleton";
import { VIDEO_KEY_RE, type TripOut } from "@/lib/api";
import { getTrip } from "@/lib/api-server";

export async function generateMetadata({ params }: PageProps<"/v/[videoKey]">): Promise<Metadata> {
  const { videoKey } = await params;
  if (!VIDEO_KEY_RE.test(videoKey)) return { title: "Not found" };
  const trip = await getTrip(videoKey).catch(() => null);
  if (!trip) return { title: "Map this video" };
  const { video } = trip;
  return {
    title: video.title,
    description: `${video.place_count} places from ${video.channel || "this travel vlog"}, on a map with a timestamp for each spot.`,
    openGraph: { title: video.title, images: video.thumbnail_url ? [video.thumbnail_url] : [] },
  };
}

// params is runtime data (any key can be requested), so it is read inside <Suspense>.
export default function TripPage({ params }: PageProps<"/v/[videoKey]">) {
  return (
    <Suspense fallback={<TripSkeleton />}>
      <TripLoader params={params} />
    </Suspense>
  );
}

async function TripLoader({ params }: { params: PageProps<"/v/[videoKey]">["params"] }) {
  const { videoKey } = await params;
  if (!VIDEO_KEY_RE.test(videoKey)) notFound();

  let trip: TripOut | null;
  try {
    trip = await getTrip(videoKey);
  } catch {
    return (
      <main>
        <StateCard tone="bad" message="Something went wrong on our side.">
          <a className="btn" href={`/v/${videoKey}`}>Try again</a>
        </StateCard>
      </main>
    );
  }
  return <TripView videoKey={videoKey} initial={trip} />;
}

function TripSkeleton() {
  return (
    <main className="tp" aria-busy="true">
      <div className="tp-stage">
        <Skeleton className="tp-map rounded-none" />
      </div>
    </main>
  );
}
