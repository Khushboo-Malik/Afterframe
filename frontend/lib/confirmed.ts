// "Looks right ✓" is remembered per viewer, on this device only.
// localStorage can be missing or throw (private mode, blocked storage), so every
// access is wrapped and the page works without it.

const STORAGE_KEY = "afterframe:confirmed";

function readAll(): Record<string, true> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Place ids this viewer marked as "looks right". */
export function getConfirmed(): Set<number> {
  return new Set(Object.keys(readAll()).map(Number));
}

export function setConfirmed(placeId: number, confirmed: boolean): void {
  try {
    const all = readAll();
    if (confirmed) all[String(placeId)] = true;
    else delete all[String(placeId)];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: the choice lasts until the page is closed.
  }
}
