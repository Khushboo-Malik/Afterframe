"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import GooglePlaceCard from "@/components/GooglePlaceCard";
import { CheckIcon, ChevronIcon, CloseIcon, ExtIcon, PlayIcon, WarnIcon } from "@/components/icons";
import { youtubeAt } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { CATEGORY_COLORS, CATEGORY_LABELS, type NumberedPlace } from "@/lib/trip-state";

type Props = {
  place: NumberedPlace;
  index: number; // 0-based among the places on the map right now
  total: number;
  videoId: string;
  confirmed: boolean;
  onConfirm: (id: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

/**
 * One stop of the trip, docked beside the map (a bottom sheet on phones):
 * Google's photo + rating, the description from the video, the moment to watch, and ‹ › to walk the route.
 */
export default function StopPanel({ place, index, total, videoId, confirmed, onConfirm, onPrev, onNext, onClose }: Props) {
  const color = { "--c": CATEGORY_COLORS[place.category] } as CSSProperties;
  const body = useRef<HTMLDivElement>(null);

  // A new stop starts at the top of the panel.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 }); // returns a Promise in newer browsers; never return it from the effect
  }, [place.id]);

  return (
    <aside className="sp" aria-label={`Stop ${index + 1} of ${total}: ${place.name}`}>
      <div className="sp-head">
        <span className="sp-of" aria-live="polite">
          Stop {index + 1} of {total}
        </span>
        <button type="button" className="sp-x" aria-label="Close" title="Close (Esc)" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <div className="sp-body" ref={body}>
        <h2 className="sp-name">
          <span className={`num${place.verification === "needs_review" ? " hollow" : ""}`} style={color}>
            {place.number}
          </span>
          {place.name}
        </h2>

        <div className="sp-meta">
          <span className="cat" style={color}>
            {CATEGORY_LABELS[place.category]}
          </span>
          {place.verification === "verified" ? (
            <span className="badge ok">
              <CheckIcon />
              Verified
            </span>
          ) : (
            <>
              <span className="badge warn">
                <WarnIcon />
                Unconfirmed
              </span>
              {confirmed ? (
                <span className="badge ok">
                  <CheckIcon />
                  You said it looks right
                </span>
              ) : (
                <button type="button" className="looks" onClick={() => onConfirm(place.id)}>
                  Looks right
                  <CheckIcon />
                </button>
              )}
            </>
          )}
        </div>

        {place.description && <p className="desc">{place.description}</p>}

        <div className="sp-actions">
          <a className="sp-watch" href={youtubeAt(videoId, place.timestamp_sec)} target="_blank" rel="noopener" aria-label={`Watch from ${formatTimestamp(place.timestamp_sec)} on YouTube (opens in a new tab)`}>
            <PlayIcon /> Watch at {formatTimestamp(place.timestamp_sec)}
          </a>
          {place.maps_url && (
            <a className="gm" href={place.maps_url} target="_blank" rel="noopener">
              Open in Google Maps
              <ExtIcon />
            </a>
          )}
        </div>

        {/* What the vlog says comes first; Google's rating and photos back it up.
            Keyed by place: one Google card per opened stop (Google bills each card created). */}
        {place.place_id && <GooglePlaceCard key={place.id} placeId={place.place_id} />}
      </div>

      <div className="sp-nav">
        <button type="button" onClick={onPrev} disabled={index === 0} aria-label="Previous stop">
          <ChevronIcon className="back" /> Previous
        </button>
        <button type="button" className="next" onClick={onNext} disabled={index === total - 1} aria-label="Next stop">
          Next stop <ChevronIcon />
        </button>
      </div>
    </aside>
  );
}
