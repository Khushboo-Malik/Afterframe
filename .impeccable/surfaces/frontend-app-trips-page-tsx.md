---
version: 1
slug: "frontend-app-trips-page-tsx"
primary_target: "frontend/app/trips/page.tsx"
related_targets: []
---

Scope: Mapped trips page `/trips` (opened from "Mapped trips" in the header; home-page text searches land here). Visitor mode: Operate (find and open a trip).
Audience and job: a visitor or interviewer browsing what has been mapped; scan thumbnails, search by title, open a trip.
Constraints: no invented counts (a total only when everything fits on one page); 24 per page with Load more; follows light/dark.
Memorable moment: the list sitting on a quiet street map, so even the index feels like a map.

## Direction contract
THESIS: An index that still reads as a map: the trips grid over faint street lines and a dotted route; refuses a plain white gallery page.
OWN-WORLD: AfterFrame tokens; faint street lines in --af-line with a 30% accent dotted route and stops, fixed behind the page; plain thumbnail cards (no panels); Fraunces page title, Inter text; pill search field with accent button.
STORY: The visitor lands on "Mapped trips", sees the newest first, searches by title if needed, and opens a trip.
FIRST VIEWPORT: header (Mapped trips active, no header search); Fraunces "Mapped trips" title with "N trips · newest first" on the left, the search pill on the right; the 4-column trip grid below; street lines behind everything.
FORM: user-pinned option B ("Faint street lines") from the trips-page background mockups; the user's pin beats the roll. seed:a7d2c3e60a6fe7ff
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
