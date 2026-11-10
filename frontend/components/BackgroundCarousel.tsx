"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

// 8 Unsplash photos in public/backgrounds (≤ 250 KB .webp each), credited in CREDITS.md.
// Until a file exists, its soft colour field (from the mockups) shows instead.
export const BACKGROUNDS: { file: string; photographer: string; url: string }[] = [
  { file: "1.webp", photographer: "", url: "" },
  { file: "2.webp", photographer: "", url: "" },
  { file: "3.webp", photographer: "", url: "" },
  { file: "4.webp", photographer: "", url: "" },
  { file: "5.webp", photographer: "", url: "" },
  { file: "6.webp", photographer: "", url: "" },
  { file: "7.webp", photographer: "", url: "" },
  { file: "8.webp", photographer: "", url: "" },
];

const FALLBACKS = [
  "radial-gradient(38% 30% at 70% 30%,#ffe7a8,transparent 70%),radial-gradient(70% 45% at 25% 82%,#1f7c93,transparent 70%),linear-gradient(#f39a64,#f6c08c 44%,#3d98ad 56%,#1d6a80)",
  "radial-gradient(40% 30% at 30% 22%,#fff6e3,transparent 70%),radial-gradient(80% 50% at 62% 88%,#2c4756,transparent 70%),linear-gradient(#9cc9e7,#dcecf5 48%,#5a7c8f)",
  "radial-gradient(36% 30% at 76% 24%,#ffdcab,transparent 70%),radial-gradient(64% 46% at 24% 76%,#c4503a,transparent 70%),linear-gradient(#ffcd9c,#ee9f76 55%,#a3402c)",
  "radial-gradient(34% 26% at 34% 76%,#f2e2b4,transparent 70%),radial-gradient(64% 46% at 76% 28%,#c3f1ea,transparent 70%),linear-gradient(#55c2d5,#19a1a1 55%,#09686f)",
];

const SWITCH_MS = 6000;

/** Crossfades the photos every 6s with a slow zoom. With reduced motion: one still photo. */
export default function BackgroundCarousel() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % BACKGROUNDS.length), SWITCH_MS);
    return () => clearInterval(t);
  }, [reduce]);

  const current = BACKGROUNDS[idx];
  return (
    <>
      {BACKGROUNDS.map((b, i) => (
        <div
          key={b.file}
          className={`photo${i === idx ? " on" : ""}`}
          aria-hidden="true"
          style={{ backgroundImage: `url(/backgrounds/${b.file}), ${FALLBACKS[i % FALLBACKS.length]}` }}
        />
      ))}
      {current.photographer && (
        <span className="photo-tag">
          Photo:{" "}
          <a href={current.url} target="_blank" rel="noopener">
            {current.photographer}
          </a>{" "}
          / Unsplash
        </span>
      )}
    </>
  );
}
