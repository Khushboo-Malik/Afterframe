---
version: 1
slug: "frontend-app-page-tsx"
primary_target: "frontend/app/page.tsx"
related_targets: []
---

Scope: home page `/`. Visitor mode: Persuade.
Audience and job: interviewers in a hurry (PRODUCT.md); success is that they paste their own YouTube link within seconds. Proof on hand: the demo video (a labelled 16:9 placeholder until NEXT_PUBLIC_DEMO_YOUTUBE_ID) and the real trip list. The animated trip replay was removed at the user's request on 2026-11-12: one demo video only. Constraints: no slots meter (removed at the user's request; the limit, now 10/day, only shows as an error); never invent counts; the trip chips are the owner's Featured trips.
Memorable moment: the big link box, with the demo right under it.

## Direction contract
THESIS: The link box is the page, with one demo video right under it; refuses the category default of a video grid behind a small header search.
OWN-WORLD: AfterFrame tokens (site #f8faf9, ink #15212b, ultramarine #2443d0, highlighter #ffd23f, category pin colours); Fraunces display over Inter text; illustrated map ground (sage land, soft-blue water, park green, white roads); round numbered pins; thin dotted accent route; dark ink timeline bar.
STORY: One headline; the visitor pastes a link, or opens a mapped trip from the chip strip; the demo video shows the result. The full list lives on /trips (header "Mapped trips"), not on the home page (user's request, 2026-11-12).
FIRST VIEWPORT: header (logo, Mapped trips, How it works, GitHub, light/dark toggle, no search); centred two-line Fraunces headline ~62px with "map." highlighted; one-line subline; ~780px ink-outlined link box with "Map it"; a sideways-scrolling strip of the owner's featured trips with ‹ › arrows; then the 16:9 demo video (max ~1100px) starting inside the first viewport.
FORM: dealt structure "Trip replay", my #5 of 7. seed:fa2c19f8073f9160
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
