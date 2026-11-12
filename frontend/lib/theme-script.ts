// Shared by the server layout and the client theme helpers (no React here).
export const THEME_KEY = "af-theme";

// Runs in <head> before the first paint and sets <html data-theme>: the visitor's
// saved choice, otherwise the device setting. So there is never a flash of the wrong theme.
export const THEME_SCRIPT = `(function(){var r=document.documentElement;try{var s=localStorage.getItem("${THEME_KEY}");r.dataset.theme=s==="dark"||(s!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}catch(e){r.dataset.theme="light"}})()`;
