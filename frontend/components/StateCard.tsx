import type { ReactNode } from "react";

import { BadIcon, BigPinIcon } from "@/components/icons";

/** A message card over the map area: never mapped, failed/stalled, no places found. */
export default function StateCard({
  tone = "info",
  thumbnailUrl,
  message,
  children,
}: {
  tone?: "info" | "bad" | "none";
  thumbnailUrl?: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="state">
      <div className="state-card" role="status">
        {thumbnailUrl ? (
          <div className="thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt="" />
          </div>
        ) : tone === "bad" ? (
          <span className="state-ic bad"><BadIcon /></span>
        ) : tone === "info" ? (
          <span className="state-ic"><BigPinIcon /></span>
        ) : null}
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}
