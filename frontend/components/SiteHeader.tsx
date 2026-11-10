import Link from "next/link";
import { Suspense } from "react";

import { ExtIcon, LogoMark } from "@/components/icons";
import SearchBar, { SearchBarWithQuery } from "@/components/SearchBar";
import { SITE } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="s-head">
      <Link className="s-logo" href="/">
        <LogoMark />
        <span>AfterFrame</span>
      </Link>
      {/* The query-aware bar reads search params at request time; the plain bar is the static fallback. */}
      <Suspense fallback={<SearchBar />}>
        <SearchBarWithQuery />
      </Suspense>
      <nav className="s-nav" aria-label="Site">
        <Link href="/how-it-works">How it works</Link>
        <a href={SITE.repoUrl} target="_blank" rel="noopener">
          GitHub
          <ExtIcon />
        </a>
      </nav>
    </header>
  );
}
