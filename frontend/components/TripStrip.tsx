"use client";

import type { CSSProperties } from "react";

import { ExtIcon } from "@/components/icons";
import { youtubeUrl, type Category, type VideoOut } from "@/lib/api";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/trip-state";

type Props = {
  video: VideoOut;
  meta: string; // "14 places · 11 verified", or the live progress line
  live: boolean; // announce meta changes to screen readers while mapping
  categories: Category[]; // chips to show (empty = no chips)
  active: Category | "all";
  onFilter: (c: Category | "all") => void;
};

/** One slim row above the map: thumbnail, title, channel + counts, category chips, YouTube link. */
export default function TripStrip({ video, meta, live, categories, active, onFilter }: Props) {
  return (
    <div className="strip">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`} alt="" />
      </div>
      <div className="strip-t">
        <h1>{video.title}</h1>
        <p>
          {video.channel} · <span aria-live={live ? "polite" : undefined}>{meta}</span>
        </p>
      </div>
      {categories.length > 0 && (
        <div className="chips" role="group" aria-label="Filter by category">
          <button type="button" className="chip" aria-pressed={active === "all"} onClick={() => onFilter("all")}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={active === c}
              style={{ "--c": CATEGORY_COLORS[c] } as CSSProperties}
              onClick={() => onFilter(c)}
            >
              <i aria-hidden="true" />
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}
      <a className="yt" href={youtubeUrl(video.video_id)} target="_blank" rel="noopener">
        Watch on YouTube
        <ExtIcon />
      </a>
    </div>
  );
}
