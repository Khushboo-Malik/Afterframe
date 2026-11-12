// JSX types for the Google Places UI Kit web components used by components/GooglePlaceCard.tsx.
// The elements themselves come from the Maps JS "places" library (loaded at runtime).
import type { DetailedHTMLProps, HTMLAttributes } from "react";

type GmpElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gmp-place-details": GmpElement;
      "gmp-place-details-place-request": GmpElement & { place?: string };
      "gmp-place-media": GmpElement & { "lightbox-preferred"?: "" };
      "gmp-place-rating": GmpElement;
      "gmp-place-attribution": GmpElement & { "light-scheme-color"?: string; "dark-scheme-color"?: string };
    }
  }
}
