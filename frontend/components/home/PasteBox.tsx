"use client";

import { useId } from "react";

import { ArrowRightIcon, SpinIcon, YouTubeMark } from "@/components/icons";
import { INFO_CODES, useLinkSubmit } from "@/components/SearchBar";

/** The home page's primary action: one big link box. Plain text searches mapped trips instead. */
export default function PasteBox({ initialQuery }: { initialQuery: string }) {
  const errorId = useId();
  const { value, busy, error, onChange, onSubmit } = useLinkSubmit(initialQuery);

  return (
    <form className="paste" onSubmit={onSubmit}>
      <div className={`paste-box${busy ? " busy" : ""}`}>
        <YouTubeMark className="paste-yt" />
        <input
          type="text"
          inputMode="url"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          aria-label="Paste a YouTube travel vlog link, or search mapped trips"
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error && !INFO_CODES.has(error.code) ? true : undefined}
          placeholder="Paste a YouTube link — youtube.com/watch?v=…"
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="submit" className="paste-go" disabled={busy} aria-busy={busy || undefined}>
          {busy ? (
            <>
              <SpinIcon /> Mapping…
            </>
          ) : (
            <>
              Map it <ArrowRightIcon />
            </>
          )}
        </button>
      </div>
      {error && (
        <p id={errorId} className={`paste-err${INFO_CODES.has(error.code) ? " info" : ""}`} role="alert">
          {error.message}
        </p>
      )}
    </form>
  );
}
