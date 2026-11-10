"use client";

import type { CSSProperties } from "react";

import { CheckIcon, ExtIcon, PlayIcon, WarnIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { youtubeAt, type PlaceOut } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { CATEGORY_COLORS, CATEGORY_LABELS, type NumberedPlace } from "@/lib/trip-state";

export function CategoryChip({ place }: { place: PlaceOut }) {
  return (
    <Badge className="cat" style={{ "--c": CATEGORY_COLORS[place.category] } as CSSProperties}>
      {CATEGORY_LABELS[place.category]}
    </Badge>
  );
}

export function TimestampLink({ videoId, sec }: { videoId: string; sec: number }) {
  return (
    <a
      className="ts"
      href={youtubeAt(videoId, sec)}
      target="_blank"
      rel="noopener"
      aria-label={`Watch from ${formatTimestamp(sec)} on YouTube (opens in a new tab)`}
      onClick={(e) => e.stopPropagation()}
    >
      <PlayIcon />
      {formatTimestamp(sec)}
    </a>
  );
}

type Props = {
  place: NumberedPlace;
  videoId: string;
  selected: boolean;
  isNew: boolean;
  confirmed: boolean;
  onSelect: (id: number) => void;
  onConfirm: (id: number) => void;
};

/** One numbered place: number + name, category, ▶ timestamp, description, badge, Maps link. */
export default function PlaceDetailsCard({ place, videoId, selected, isNew, confirmed, onSelect, onConfirm }: Props) {
  const color = { "--c": CATEGORY_COLORS[place.category] } as CSSProperties;
  return (
    <Card
      id={`place-${place.id}`}
      className={`pc${selected ? " sel" : ""}${isNew ? " new" : ""}`}
      onClick={() => onSelect(place.id)}
    >
      <div className="pc-top">
        <button
          type="button"
          className="pc-name"
          aria-label={`${place.number}. ${place.name}. Show on map`}
          aria-pressed={selected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(place.id);
          }}
        >
          <span className={`num${place.verification === "needs_review" ? " hollow" : ""}`} style={color}>
            {place.number}
          </span>
          <span>{place.name}</span>
        </button>
        <CategoryChip place={place} />
      </div>
      {place.description && <p className="desc">{place.description}</p>}
      <div className="pc-foot">
        <TimestampLink videoId={videoId} sec={place.timestamp_sec} />
        {place.verification === "verified" ? (
          <span className="badge ok"><CheckIcon />Verified</span>
        ) : (
          <>
            <span className="badge warn"><WarnIcon />Unconfirmed</span>
            {confirmed ? (
              <span className="badge ok"><CheckIcon />You said it looks right</span>
            ) : (
              <button
                type="button"
                className="looks"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm(place.id);
                }}
              >
                Looks right
                <CheckIcon />
              </button>
            )}
          </>
        )}
        {place.maps_url && (
          <a className="gm" href={place.maps_url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
            Open in Google Maps
            <ExtIcon />
          </a>
        )}
      </div>
    </Card>
  );
}
