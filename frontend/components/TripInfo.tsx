"use client";

import { useId, useState, type CSSProperties } from "react";

import { ChevronIcon, ExtIcon, PlayIcon, WarnIcon } from "@/components/icons";
import { youtubeAt, youtubeUrl, type Category, type PlaceOut, type VideoOut } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/trip-state";

type Props = {
  video: VideoOut;
  meta: string; // "16 places · 11 verified", or the live progress line
  live: boolean; // announce meta changes to screen readers while mapping
  partial: boolean;
  categories: Category[]; // chips to show (empty = no chips)
  active: Category | "all";
  onFilter: (c: Category | "all") => void;
  unmatched: PlaceOut[]; // mentioned in the video but not found on the map
};

/** Floats over the map's top-left corner: what this trip is, the filters, and the places with no pin. */
export default function TripInfo({ video, meta, live, partial, categories, active, onFilter, unmatched }: Props) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <section className="tc" aria-label="Trip">
      <div className="tc-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tc-thumb" src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`} alt="" />
        <div className="tc-t">
          <h1>{video.title}</h1>
          <p>
            {video.channel} · <span aria-live={live ? "polite" : undefined}>{meta}</span>
          </p>
        </div>
      </div>

      {partial && (
        <p className="tc-warn" role="status">
          <WarnIcon /> Some places may be missing — we hit a limit while checking. Try again tomorrow.
        </p>
      )}

      {categories.length > 1 && (
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

      <div className="tc-foot">
        <a className="yt" href={youtubeUrl(video.video_id)} target="_blank" rel="noopener">
          Watch on YouTube
          <ExtIcon />
        </a>
        {unmatched.length > 0 && (
          <button type="button" className={`tc-unm${open ? " open" : ""}`} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
            {unmatched.length} not found on the map
            <ChevronIcon />
          </button>
        )}
      </div>

      {open && unmatched.length > 0 && (
        <ul className="tc-list" id={listId}>
          {unmatched.map((p) => (
            <li key={p.id}>
              <div className="tc-list-t">
                <b>{p.name}</b>
                <a className="ts" href={youtubeAt(video.video_id, p.timestamp_sec)} target="_blank" rel="noopener" aria-label={`Watch from ${formatTimestamp(p.timestamp_sec)} on YouTube (opens in a new tab)`}>
                  <PlayIcon />
                  {formatTimestamp(p.timestamp_sec)}
                </a>
              </div>
              {p.description && <p>{p.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
