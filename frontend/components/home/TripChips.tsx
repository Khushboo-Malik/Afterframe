"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChevronIcon } from "@/components/icons";
import type { VideoOut } from "@/lib/api";

/** "Uttarakhand Tour | Uttarakhand Tourist Places | …" → "Uttarakhand Tour". */
function shortTitle(title: string): string {
  return title.split(/\s[|–—-]\s|\s\|\s?/)[0].trim() || title;
}

/** The newest mapped trips as one sideways-scrolling row, with ‹ › buttons when it overflows. */
export default function TripChips({ trips }: { trips: VideoOut[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  if (trips.length === 0) return null;
  const scroll = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="tchips">
      <span className="tchips-l">Or open one:</span>
      <button type="button" className="tchips-arrow prev" aria-label="Scroll trips left" disabled={edges.start} onClick={() => scroll(-1)}>
        <ChevronIcon />
      </button>
      <div className="tchips-rail" ref={rail}>
        {trips.map((v) => (
          <Link key={v.key} className="tchip" href={`/v/${v.key}`} title={v.title}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumbnail_url || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span>{shortTitle(v.title)}</span>
          </Link>
        ))}
      </div>
      <button type="button" className="tchips-arrow next" aria-label="Scroll trips right" disabled={edges.end} onClick={() => scroll(1)}>
        <ChevronIcon />
      </button>
    </div>
  );
}
