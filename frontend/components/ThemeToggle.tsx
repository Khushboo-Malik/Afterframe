"use client";

import { useEffect } from "react";

import { MoonIcon, SunIcon } from "@/components/icons";
import { setSiteTheme, storedTheme, useSiteTheme } from "@/lib/theme";

/** Header button: switches light/dark and remembers the choice. Both icons render; CSS shows the right one. */
export default function ThemeToggle() {
  const theme = useSiteTheme();

  // Until the visitor picks a theme, keep following the device if it changes (e.g. at sunset).
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (!storedTheme()) setSiteTheme(mq.matches ? "dark" : "light", false);
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const label = theme ? `Switch to ${next} mode` : "Switch colour theme";
  return (
    <button type="button" className="tt" aria-label={label} title={label} onClick={() => setSiteTheme(next, true)}>
      <MoonIcon className="tt-moon" />
      <SunIcon className="tt-sun" />
    </button>
  );
}
