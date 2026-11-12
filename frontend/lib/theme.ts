"use client";

// Light/dark theme (client side). The site follows the device until the visitor picks
// one with the header toggle; the pick is kept in localStorage (see theme-script.ts).
import { useSyncExternalStore } from "react";

import { THEME_KEY } from "./theme-script";

export type Theme = "light" | "dark";

function read(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** The site's current theme; null on the server and during hydration. */
export function useSiteTheme(): Theme | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

export function setSiteTheme(theme: Theme, remember: boolean): void {
  document.documentElement.dataset.theme = theme;
  if (!remember) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode etc.: the theme still applies for this page view.
  }
}
