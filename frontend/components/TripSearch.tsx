"use client";

import { useId } from "react";

import { SearchIcon, SpinIcon } from "@/components/icons";
import { INFO_CODES, useLinkSubmit } from "@/components/SearchBar";

/** The Mapped trips page's own search: words filter the trips (a pasted link still maps it). */
export default function TripSearch({ initialQuery }: { initialQuery: string }) {
  const errorId = useId();
  const { value, busy, error, onChange, onSubmit } = useLinkSubmit(initialQuery);
  return (
    <form className="tsearch" role="search" onSubmit={onSubmit}>
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label="Search mapped trips"
        aria-describedby={error ? errorId : undefined}
        placeholder="Search mapped trips…"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" aria-label="Search" disabled={busy}>
        {busy ? <SpinIcon /> : <SearchIcon />}
      </button>
      {error && (
        <p id={errorId} className={`s-err${INFO_CODES.has(error.code) ? " info" : ""}`} role="alert">
          {error.message}
        </p>
      )}
    </form>
  );
}
