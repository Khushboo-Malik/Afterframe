import Link from "next/link";
import { Suspense } from "react";

import { ExtIcon, LogoMark } from "@/components/icons";
import SearchBar, { SearchBarWithQuery } from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";
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
      {/* The home page has its own big link box: CSS hides this search there and lets the spacer push the nav right. */}
      <span className="s-flex" aria-hidden="true" />
      <nav className="s-nav" aria-label="Site">
        <Link href="/#trips">Mapped trips</Link>
        <Link href="/how-it-works">How it works</Link>
        <a href={SITE.repoUrl} target="_blank" rel="noopener">
          GitHub
          <ExtIcon />
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
