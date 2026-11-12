"use client";

import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

import { ArrowRightIcon, PlayIcon } from "@/components/icons";
import type { TripOut } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { CATEGORY_COLORS, CATEGORY_LABELS, numberPlaces, type NumberedPlace } from "@/lib/trip-state";

const PLAY_MS = 14000; // the whole video timeline replays in 14s…
const HOLD_MS = 2800; // …then the finished map holds before it starts again
const PAD = { top: 76, right: 72, bottom: 112, left: 72 }; // keeps pins clear of the tags and the timeline
const MIN_GAP = 34; // px between pin centres after spreading tight clusters

type Pt = { x: number; y: number };

const noop = () => () => {};

/** Real coordinates → stage pixels (equirectangular, fitted to the box), then nudge overlapping pins apart. */
function layout(places: NumberedPlace[], w: number, h: number): Pt[] {
  if (places.length === 0 || w < 50) return [];
  const lat0 = places.reduce((s, p) => s + p.lat, 0) / places.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const raw = places.map((p) => ({ x: p.lng * k, y: -p.lat }));
  const minX = Math.min(...raw.map((r) => r.x)), maxX = Math.max(...raw.map((r) => r.x));
  const minY = Math.min(...raw.map((r) => r.y)), maxY = Math.max(...raw.map((r) => r.y));
  const bw = w - PAD.left - PAD.right, bh = h - PAD.top - PAD.bottom;
  let s = Math.min(bw / Math.max(maxX - minX, 1e-9), bh / Math.max(maxY - minY, 1e-9));
  if (!Number.isFinite(s)) s = 1;
  const ox = PAD.left + (bw - (maxX - minX) * s) / 2, oy = PAD.top + (bh - (maxY - minY) * s) / 2;
  const pts = raw.map((r) => ({ x: ox + (r.x - minX) * s, y: oy + (r.y - minY) * s }));
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        let dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= MIN_GAP) continue;
        if (d < 0.01) [dx, dy, d] = [1, 0.3, 1.04];
        const push = (MIN_GAP - d) / 2;
        pts[i].x -= (dx / d) * push; pts[i].y -= (dy / d) * push;
        pts[j].x += (dx / d) * push; pts[j].y += (dy / d) * push;
      }
    }
    for (const p of pts) {
      p.x = Math.min(Math.max(p.x, PAD.left / 2), w - PAD.right / 2);
      p.y = Math.min(Math.max(p.y, PAD.top - 20), h - PAD.bottom + 24);
    }
  }
  return pts;
}

/** A gentle arc between two stops, so the route reads as a journey, not driving directions. */
function arc(a: Pt, b: Pt): string {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const cx = mx - (b.y - a.y) * 0.16, cy = my + (b.x - a.x) * 0.16;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function shortTitle(title: string): string {
  return title.split(/\s[|–—-]\s|\s\|\s?/)[0].trim() || title;
}

/** The home page's proof: a real mapped trip pinning itself along the video's timeline. */
export default function ReplayStage({ trip }: { trip: TripOut }) {
  const { video } = trip;
  const hasDemo = Boolean(process.env.NEXT_PUBLIC_DEMO_YOUTUBE_ID); // no button promising a video that isn't there yet
  const places = useMemo(() => numberPlaces(trip.places).mapped, [trip.places]);
  const box = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [playT, setT] = useState(0); // 0…1 through the video
  // Only honour reduced motion after hydration, so the server and first client render match.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const reduceMotion = useReducedMotion() === true && hydrated;
  const t = reduceMotion ? 1 : playT; // reduced motion: the finished map, still

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || reduceMotion) return;
    let visible = false, elapsed = 0, prev = performance.now(), last = -1, raf = 0;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (visible && !document.hidden) elapsed += Math.min(now - prev, 100);
      prev = now;
      const p = Math.min((elapsed % (PLAY_MS + HOLD_MS)) / PLAY_MS, 1);
      if (Math.abs(p - last) > 0.002 || (p === 1 && last !== 1)) {
        last = p;
        setT(p);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduceMotion]);

  const pts = useMemo(() => layout(places, size.w, size.h), [places, size.w, size.h]);
  const duration = Math.max(video.duration_sec, 1);
  const sec = t * duration;
  const shown = places.filter((p) => p.timestamp_sec <= sec);
  const cur = shown.length - 1;
  const curPlace = shown[cur];
  const curPt = pts[cur];

  return (
    <section className="rp" ref={box} aria-labelledby="rp-l">
      <div className="rp-vis" aria-hidden="true">
        <MapArt />
        {size.w > 0 && (
          <svg className="rp-route" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
            {shown.slice(1).map((p, i) => (
              <path key={p.id} d={arc(pts[i], pts[i + 1])} className={i + 1 === cur ? "now" : undefined} />
            ))}
          </svg>
        )}
        {pts.length > 0 &&
          shown.map((p, i) => (
            <span
              key={p.id}
              className={`rp-pin${p.verification === "needs_review" ? " hollow" : ""}${i === cur ? " now" : ""}`}
              style={{ left: pts[i].x, top: pts[i].y, "--c": CATEGORY_COLORS[p.category] } as CSSProperties}
            >
              {p.number}
            </span>
          ))}
        {curPlace && curPt && (
          <span
            className="rp-call"
            style={{
              left: curPt.x > size.w - 280 ? curPt.x - 252 : curPt.x + 26,
              top: curPt.y > 170 ? curPt.y - 92 : curPt.y + 22,
            }}
          >
            <b>
              {curPlace.number} · {curPlace.name}
            </b>
            <span className="rp-call-m">
              {CATEGORY_LABELS[curPlace.category]} · <span className="rp-ts"><PlayIcon /> {formatTimestamp(curPlace.timestamp_sec)}</span>
            </span>
            {curPlace.verification === "needs_review" && <span className="rp-unc">Unconfirmed</span>}
          </span>
        )}
        <div className="rp-tl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rp-thumb" src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`} alt="" />
          <span className="rp-tt">
            <b>{shortTitle(video.title)}</b>
            {video.channel} · {formatTimestamp(video.duration_sec)}
          </span>
          <span className="rp-track">
            <i className="rp-fill" style={{ width: `${t * 100}%` }} />
            {places.map((p) => (
              <i key={p.id} className={`rp-tick${p.timestamp_sec <= sec ? " on" : ""}`} style={{ left: `${(p.timestamp_sec / duration) * 100}%` }} />
            ))}
            <i className="rp-head" style={{ left: `${t * 100}%` }} />
          </span>
          <span className="rp-time">
            {formatTimestamp(sec)} / {formatTimestamp(video.duration_sec)}
          </span>
        </div>
      </div>
      <Link className="rp-tag" href={`/v/${video.key}`} id="rp-l">
        Replay of a real trip · <b>{shown.length} of {trip.places.length} places</b> pinned
        <ArrowRightIcon />
      </Link>
      {hasDemo && (
        <a className="rp-demo" href="#demo">
          <PlayIcon /> Watch the demo video
        </a>
      )}
      <p className="sr-only">
        A replay of the mapped trip “{video.title}”: {places.length} of its {trip.places.length} places pinned on a map in the order they appear in the video.
      </p>
    </section>
  );
}

/** Our own illustrated streets (not a Google map): colours come from the --map-* tokens. */
function MapArt() {
  return (
    <svg className="rp-art" viewBox="0 0 1376 400" preserveAspectRatio="xMidYMid slice">
      <rect width="1376" height="400" className="ma-land" />
      <path className="ma-water" d="M1376 18C1240 92 1150 142 1078 232S958 362 900 430" strokeWidth="42" fill="none" />
      <path className="ma-water" d="M-20 352C150 322 262 386 430 352" strokeWidth="22" fill="none" />
      <rect className="ma-park" x="560" y="122" width="172" height="92" rx="28" />
      <rect className="ma-park" x="58" y="148" width="152" height="122" rx="32" />
      <rect className="ma-park" x="880" y="20" width="112" height="62" rx="20" />
      <g className="ma-edge" fill="none" strokeWidth="14">
        <path d="M0 98 1376 140" /><path d="M300 0C330 140 290 260 340 400" /><path d="M780 0 820 400" /><path d="M0 252C400 230 800 260 1376 236" />
      </g>
      <g className="ma-road" fill="none" strokeWidth="9">
        <path d="M0 98 1376 140" /><path d="M300 0C330 140 290 260 340 400" /><path d="M780 0 820 400" /><path d="M0 252C400 230 800 260 1376 236" />
      </g>
      <g className="ma-street" fill="none" strokeWidth="3">
        <path d="M420 20v320M470 20v320M520 20v320M900 160v180M950 160v180M1000 160v180M380 60h170M380 300h200M880 300h200M1120 60v260M1180 60v260M1240 60v260M60 320h200M120 290v100" />
      </g>
    </svg>
  );
}
