"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

/**
 * Google's own place card (Places UI Kit "Place Details" element): one Google photo
 * (click → bigger, in Google's lightbox), the star rating, and Google's attribution.
 *
 * - Google fetches the data in the browser and handles the photo credit, so we never
 *   store ratings or photos (Google's terms only allow storing the place ID).
 * - Billing: one "Places UI Kit Query" per card created, so the list keeps cards
 *   mounted (hidden by the category filter) instead of re-creating them.
 * - Needs the "Places UI Kit API" enabled for NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 *   If Google refuses (gmp-error), the card quietly disappears.
 */
export default function GooglePlaceCard({ placeId }: { placeId: string }) {
  const placesLib = useMapsLibrary("places"); // defines the gmp-place-* elements
  const ref = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onError = () => {
      console.warn(
        `Google place card failed for ${placeId}. Is the Places UI Kit API enabled and allowed for the browser key?`,
      );
      setFailed(true);
    };
    el.addEventListener("gmp-error", onError);
    return () => el.removeEventListener("gmp-error", onError);
  }, [placesLib, placeId]);

  if (!placesLib || failed) return null;
  return (
    // Clicks inside Google's card (e.g. opening the photo) shouldn't also pan the map.
    <div className="gcard" onClick={(e) => e.stopPropagation()}>
      <gmp-place-details ref={ref}>
        <gmp-place-details-place-request place={placeId} />
        <gmp-place-media lightbox-preferred="" />
        <gmp-place-rating />
        <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white" />
      </gmp-place-details>
    </div>
  );
}
