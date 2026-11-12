---
version: 1
slug: "frontend-app-v-videokey-page-tsx"
primary_target: "frontend/app/v/[videoKey]/page.tsx"
related_targets: []
---

Scope: trip page `/v/<key>`. Visitor mode: Experience (the map is the work), with Operate details in the stop panel.
Audience and job: someone exploring one vlog's places to decide where to go; they need each place's position, photo, rating, description and the moment in the video.
Constraints: Google Maps JS map on our Map ID; Google's Places UI Kit card for photo and rating (billed per card created, so create one card per opened stop, never per pin); ratings and photos are never stored; unmatched places have no coordinates; places stream in live while processing; respect reduced motion.
Memorable moment: Next stop gliding the map along the vlog's route.

## Direction contract
THESIS: The trip is a route you re-walk, not a list you scroll; refuses the small-map-over-card-list default and Google Maps' own red markers and info windows.
OWN-WORLD: same tokens; muted custom map style; numbered category pins (solid verified, hollow unconfirmed; the open stop in the ultramarine accent, user asked for not-yellow on 2026-11-12) with small name labels that hide on collision; thin dotted accent arcs in video order, the hop into the open stop brighter; floating white surfaces with soft offset shadow, Fraunces headings.
STORY: The visitor sees the whole trip with names, clicks a pin or Next; the map glides and zooms there and the stop panel shows photo, rating, description and timestamp; they walk stop by stop and jump into the vlog.
FIRST VIEWPORT: header; map fills the rest of the viewport; floating trip card top-left (thumbnail, title, counts, category chips, Watch on YouTube, "n not found on the map"); stop panel docked right (~380px) with "Stop k of n" and ‹ Previous / Next ›; Show all plus zoom controls; phones get a bottom sheet.
FORM: user-pinned composition "Trip replay" (option C of the explore-map mockups); the user's pin beats the roll. seed:1bb39a280f354971
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
