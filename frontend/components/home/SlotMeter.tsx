"use client";

import { useEffect, useState } from "react";

type Limits = { limit: number; used: number; remaining: number; resets_at: string };

/**
 * "3 of 5 free maps left today": one cell per daily slot, used ones left as faint
 * outlines. Read live from /api/limits on every visit; hidden if it can't be read.
 */
export default function SlotMeter() {
  const [limits, setLimits] = useState<Limits | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/limits", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Limits | null) => alive && d && setLimits(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!limits) return <div className="slots" aria-hidden="true" />;

  const resets = new Date(limits.resets_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div className="slots" title="Opening a trip that's already mapped is always free.">
      <span className="slot-cells" aria-hidden="true">
        {Array.from({ length: limits.limit }, (_, i) => (
          <i key={i} className={i < limits.remaining ? "on" : undefined} />
        ))}
      </span>
      {limits.remaining > 0 ? (
        <span>
          <b>
            {limits.remaining} of {limits.limit}
          </b>{" "}
          free maps left today
        </span>
      ) : (
        <span>
          <b>Today&apos;s free maps are used up</b> · more at {resets}
        </span>
      )}
    </div>
  );
}
