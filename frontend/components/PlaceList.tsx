"use client";

import PlaceDetailsCard, { CategoryChip, TimestampLink } from "@/components/PlaceDetailsCard";
import type { PlaceOut } from "@/lib/api";
import type { NumberedPlace } from "@/lib/trip-state";

type Props = {
  mapped: NumberedPlace[];
  unmatched: PlaceOut[];
  videoId: string;
  selectedId: number | null;
  newIds: Set<number>;
  confirmed: Set<number>;
  onSelect: (id: number) => void;
  onConfirm: (id: number) => void;
};

/** The numbered cards (numbers match the pins), then the collapsible unmatched group. */
export default function PlaceList({ mapped, unmatched, videoId, selectedId, newIds, confirmed, onSelect, onConfirm }: Props) {
  if (mapped.length === 0 && unmatched.length === 0) return null;
  return (
    <section className="plist" aria-label="Places in this video">
      {mapped.length > 0 && (
        <div className="pgrid">
          {mapped.map((p) => (
            <PlaceDetailsCard
              key={p.id}
              place={p}
              videoId={videoId}
              selected={p.id === selectedId}
              isNew={newIds.has(p.id)}
              confirmed={confirmed.has(p.id)}
              onSelect={onSelect}
              onConfirm={onConfirm}
            />
          ))}
        </div>
      )}
      {unmatched.length > 0 && (
        <details className="unm">
          <summary>Mentioned but not found on the map ({unmatched.length})</summary>
          <div className="unm-list">
            {unmatched.map((p) => (
              <div key={p.id} className="unm-i">
                <div className="pc-top">
                  <b>{p.name}</b>
                  <CategoryChip place={p} />
                </div>
                {p.description && <p className="desc">{p.description}</p>}
                <div className="pc-foot">
                  <TimestampLink videoId={videoId} sec={p.timestamp_sec} />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
