# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: interviewers and recruiters** looking at the author's portfolio, usually in a hurry, deciding within seconds whether the project is real and impressive. Success is that they paste a YouTube link themselves out of curiosity instead of only clicking an existing trip. (Confirmed 2026-11-12.)
- **Secondary:** curious visitors and travellers who want a map of a vlog they watched.

## Product Purpose

AfterFrame turns a public YouTube travel vlog into a map of every place in it, each with the moment it appears in the video and a short description. Paste a link, and places appear on the map live as they are found. Already-mapped trips open instantly for everyone.

## Positioning

The AI watches the video itself (Gemini reads the YouTube video by URL; no scraping), then every place is checked against Google Maps by an agent and labelled Verified, Unconfirmed, or not found. Places stream in live, in the order the vlogger visits them, with a timestamp that opens the video at that moment.

## Operating Context

- One action: paste a YouTube link (watch, youtu.be, Shorts or mobile links all work). A new video takes roughly 20–60 seconds; places stream in over Server-Sent Events.
- No accounts and no login. Every mapped trip is public on the home grid.
- The site is a resume project: the live link goes on the author's CV, so first impressions happen in interview situations.

## Capabilities and Constraints

- YouTube videos and Shorts up to 30 minutes, public only. Instagram links answer "coming soon".
- **Site-wide limit: 10 new videos per UTC day** (raised from 5 on 2026-11-12). Viewing is unlimited. The slots-left meter was removed at the user's request: people only see the "slots used up" error when the limit is hit. Re-opening an already-mapped trip uses no slot.
- **The public trip list is curated:** only trips the owner ticks as Featured in /admin appear on the home page and /trips; any trip still opens at its own link.
- Each mapped place can show Google's own place card (photo, star rating, attribution) via the Places UI Kit.
- Light/dark follows the device until the visitor picks a theme with the header toggle (built 2026-11-12); the choice is remembered.

## Brand Commitments

- Name: **AfterFrame** (own project and name; never the original Reddit app's name or branding).
- An approved visual identity exists: `docs/mockups/mockups.html` (approved in sub-plan 01) and its tokens in `frontend/app/globals.css`.

## Evidence on Hand

- Real mapped trips in the database (3 today: Uttarakhand, Kashmir, Tokyo). Must stay visible on the home page.
- Demo video: not recorded yet. The home page keeps a labelled placeholder until `NEXT_PUBLIC_DEMO_YOUTUBE_ID` is set. Must stay visible on the home page.
- Live counts (e.g. places mapped so far) can be computed from the database, but they are small early on, so they must not be a headline.
- No testimonials, users, press, or benchmarks exist. Never fabricate them.

## Product Principles

1. **The paste is the proof.** A visitor should be able to try it within seconds of landing.
2. **Show, don't claim.** Real trips and the real demo carry the persuasion; no invented numbers.
3. **Honest limits.** Show the daily slots left rather than surprising people with a refusal.
4. **The map is the payoff.** Everything leads to the moment pins appear on a map.

## Accessibility & Inclusion

Respect reduced motion, keyboard-reachable controls, `aria-live="polite"` for progress text, decorative emoji hidden from screen readers.
