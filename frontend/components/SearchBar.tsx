"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { SearchIcon, SpinIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { submitVideo } from "@/lib/api";

const PLACEHOLDER = "Paste a YouTube or Instagram link — or search mapped trips";
const LINK_RE = /^(https?:\/\/|www\.)|youtu|instagram/i;
// Blue (informational) instead of red: not a problem with the link itself.
export const INFO_CODES = new Set(["instagram_unsupported", "rate_limited", "busy"]);

export function looksLikeLink(text: string): boolean {
  return LINK_RE.test(text.trim());
}

/**
 * Shared by the header search and the home page's big link box: a link is
 * submitted for mapping (200/202 → its trip page), plain text searches the grid.
 */
export function useLinkSubmit(initialQuery: string) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || busy) return;
    setError(null);
    if (!looksLikeLink(text)) {
      router.push(`/trips?q=${encodeURIComponent(text)}`);
      return;
    }
    setBusy(true);
    const res = await submitVideo(text);
    setBusy(false);
    if (res.ok) {
      setValue("");
      router.push(`/v/${res.video_key}`);
    } else {
      setError({ code: res.code, message: res.message });
    }
  }

  function onChange(next: string) {
    setValue(next);
    if (error) setError(null);
  }

  return { value, busy, error, onChange, onSubmit };
}

function Bar({ initialQuery }: { initialQuery: string }) {
  const errorId = useId();
  const { value, busy, error, onChange, onSubmit } = useLinkSubmit(initialQuery);

  return (
    <form className="s-search" role="search" onSubmit={onSubmit}>
      <div className={`s-sbox${busy ? " busy" : ""}`}>
        <Input
          type="text"
          inputMode="url"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          aria-label="Paste a YouTube or Instagram link, or search mapped trips"
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error && !INFO_CODES.has(error.code) ? true : undefined}
          placeholder={PLACEHOLDER}
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="submit" disabled={busy} aria-label={busy ? "Mapping, please wait" : "Go"} aria-busy={busy || undefined}>
          {busy ? <SpinIcon /> : <SearchIcon />}
        </button>
      </div>
      {error && (
        <p id={errorId} className={`s-err${INFO_CODES.has(error.code) ? " info" : ""}`} role="alert">
          {error.message}
        </p>
      )}
    </form>
  );
}

/** Reads ?q= so a text search stays in the bar. Must sit inside <Suspense>. */
export function SearchBarWithQuery() {
  const q = useSearchParams().get("q") ?? "";
  return <Bar key={q} initialQuery={q} />;
}

export default function SearchBar() {
  return <Bar initialQuery="" />;
}
