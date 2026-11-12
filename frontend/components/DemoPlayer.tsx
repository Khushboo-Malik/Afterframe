"use client";

import { useState } from "react";

import { PlayIcon } from "@/components/icons";

/** Lazy YouTube embed: just a thumbnail until clicked. A labelled placeholder until the demo exists. */
export default function DemoPlayer() {
  const id = process.env.NEXT_PUBLIC_DEMO_YOUTUBE_ID;
  const [playing, setPlaying] = useState(false);
  if (!id) {
    return (
      <section className="demo" id="demo" aria-label="Demo video">
        <div className="demo-v demo-ph">
          <span className="demo-ph-play" aria-hidden="true">
            <PlayIcon />
          </span>
          <span className="demo-ph-txt">
            <b className="demo-ph-t">Demo video</b>
            <span className="demo-ph-s">Coming soon · a short walk-through of AfterFrame</span>
          </span>
        </div>
        <p className="demo-cap">See AfterFrame in action</p>
      </section>
    );
  }

  return (
    <section className="demo" id="demo" aria-label="Demo video">
      {playing ? (
        <div className="demo-v">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title="See AfterFrame in action"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button type="button" className="demo-v" onClick={() => setPlaying(true)} aria-label="Play the demo video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
          <span className="demo-shade" />
          <span className="play"><PlayIcon /></span>
        </button>
      )}
      <p className="demo-cap">See AfterFrame in action</p>
    </section>
  );
}
