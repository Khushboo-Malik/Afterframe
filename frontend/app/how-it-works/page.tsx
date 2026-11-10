import type { Metadata } from "next";

import { ExtIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description: "Architecture, the place-checking agent, accuracy and cost controls behind AfterFrame.",
};

function Box({ x, y, w, title, sub, ai }: { x: number; y: number; w: number; title: string; sub: string; ai?: boolean }) {
  return (
    <g>
      <rect className={`bx${ai ? " ai" : ""}`} x={x} y={y} width={w} height={54} rx={10} />
      <text className="bt" x={x + w / 2} y={y + 23} textAnchor="middle">{title}</text>
      <text className="bs" x={x + w / 2} y={y + 41} textAnchor="middle">{sub}</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line className="ar" x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#ah)" />;
}

function Architecture() {
  return (
    <svg
      viewBox="0 0 940 272"
      role="img"
      aria-label="Your browser talks to the Next.js site on Vercel, which forwards /api to Nginx and Django on EC2. Django reads PostgreSQL on Supabase and queues jobs in Redis. A Celery worker calls Gemini and Google Places and saves places to PostgreSQL. Live updates stream back to the browser over Server-Sent Events."
    >
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="ah" d="M0 0L10 5L0 10z" />
        </marker>
        <marker id="ahs" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="ahs" d="M0 0L10 5L0 10z" />
        </marker>
      </defs>
      <path className="sse" d="M520 40 C520 6 85 6 85 38" markerEnd="url(#ahs)" />
      <text className="al acc" x="302" y="31" textAnchor="middle">live updates (Server-Sent Events)</text>
      <Box x={10} y={44} w={150} title="Your browser" sub="any device" />
      <Box x={215} y={44} w={165} title="Vercel" sub="Next.js site · HTTPS" />
      <Box x={435} y={44} w={170} title="EC2: Nginx + Django" sub="REST API · Swagger" />
      <Box x={765} y={44} w={160} title="PostgreSQL" sub="Supabase" />
      <Box x={435} y={178} w={150} title="Redis" sub="job queue · limits" />
      <Box x={615} y={178} w={150} title="Celery worker" sub="maps one video" ai />
      <Box x={795} y={148} w={130} title="Gemini" sub="watches the vlog" ai />
      <Box x={795} y={214} w={130} title="Google Places" sub="checks each spot" ai />
      <Arrow x1={160} y1={71} x2={212} y2={71} />
      <text className="al" x="407" y="62" textAnchor="middle">/api</text>
      <Arrow x1={380} y1={71} x2={432} y2={71} />
      <Arrow x1={605} y1={71} x2={762} y2={71} />
      <text className="al" x="684" y="62" textAnchor="middle">reads trips</text>
      <Arrow x1={520} y1={98} x2={520} y2={175} />
      <text className="al" x="528" y="141">queues a job</text>
      <Arrow x1={585} y1={205} x2={612} y2={205} />
      <Arrow x1={765} y1={196} x2={792} y2={176} />
      <Arrow x1={765} y1={214} x2={792} y2={238} />
      <Arrow x1={706} y1={176} x2={815} y2={100} />
      <text className="al" x="742" y="128" textAnchor="end">saves places</text>
    </svg>
  );
}

const EVAL_COLUMNS = ["Video resolution", "Precision", "Recall", "F1", "Timestamp error", "Verified precision", "Agent share", "Cost per video"];

export default function HowItWorks() {
  return (
    <main className="hiw">
      <div>
        <h1>How AfterFrame works</h1>
        <p>
          Paste a travel vlog link. Gemini watches the video, an AI agent checks every place against Google Maps,
          and you get a map with a timestamp for each spot.
        </p>
      </div>

      <section>
        <h2>Architecture</h2>
        <div className="arch"><Architecture /></div>
      </section>

      <section>
        <h2>The place-checking agent</h2>
        <ol className="flow">
          <li><b>Watch</b>Gemini watches the vlog from its YouTube link and streams out each place with a category, timestamp and short description.</li>
          <li><b>Look up</b>Each place gets one direct Google Places search.</li>
          <li className="key"><b>Ask the agent</b>Vague names like “a tiny fado bar” go to a LangGraph agent: Gemini with a search tool, at most 2 searches and 4 turns.</li>
          <li><b>Label</b>Code scores each match and labels it Verified, Needs review or Unmatched.</li>
          <li><b>Stream</b>Places are saved and sent to your screen as they&apos;re found.</li>
        </ol>
      </section>

      <section>
        <h2>How accurate is it?</h2>
        <div className="tbl">
          <table>
            <thead>
              <tr>{EVAL_COLUMNS.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {["Low", "Medium"].map((r) => (
                <tr key={r}>
                  <td>{r}</td>
                  {EVAL_COLUMNS.slice(1).map((c) => <td key={c}>—</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cap">Filled in after the evals: 8 hand-labeled vlogs, matched by Google place ID.</p>
      </section>

      <section>
        <h2>Cost controls</h2>
        <ul className="costs">
          <li><b>5 new videos a day</b> across the whole site</li>
          <li><b>Videos up to 30 minutes</b></li>
          <li><b>At most 26 Places searches</b> per video</li>
          <li><b>The agent checks at most 6 places</b> per video</li>
          <li><b>A daily cap on Gemini requests</b>, plus budget alerts at ₹500 and ₹1,000</li>
          <li><b>Mapped trips cost nothing</b> to view again; they load from the database</li>
        </ul>
      </section>

      <section>
        <h2>Why no scraping</h2>
        <p>
          AfterFrame uses official Google APIs only. The YouTube Data API checks that a video is public and short
          enough, Gemini reads public YouTube videos straight from the link, and Google Places confirms each location.
          Nothing scrapes YouTube pages, comments or other websites.
        </p>
      </section>

      <div className="links">
        <a className="btn" href={SITE.repoUrl} target="_blank" rel="noopener">
          Code on GitHub <ExtIcon />
        </a>
        <a className="btn ghost" href="/api/docs" target="_blank" rel="noopener">
          API docs (Swagger) <ExtIcon />
        </a>
      </div>
    </main>
  );
}
