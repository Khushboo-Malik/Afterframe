import Link from "next/link";

import { PinIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { VideoOut } from "@/lib/api";
import { formatTimestamp, plural, timeAgo } from "@/lib/format";

export default function TripCard({ video }: { video: VideoOut }) {
  return (
    <Link className="card" href={`/v/${video.key}`}>
      <div className="thumb">
        {/* Plain <img>: YouTube thumbnails need no resizing, and it avoids image-optimisation usage. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`} alt="" loading="lazy" />
        <span className="dur">{formatTimestamp(video.duration_sec)}</span>
      </div>
      <div className="card-b">
        <h3>{video.title}</h3>
        <p>{video.channel}</p>
        <p className="meta">
          <PinIcon /> {plural(video.place_count, "place")} ·{" "}
          <span suppressHydrationWarning>{timeAgo(video.created_at)}</span>
        </p>
      </div>
    </Link>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton className="thumb" />
      <div className="card-b">
        <Skeleton className="sk-line" />
        <Skeleton className="sk-line s" />
      </div>
    </div>
  );
}
