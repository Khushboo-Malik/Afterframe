"""Hands-on AI checks. Never writes to the database.

    uv run python manage.py try_ai extract <youtube-url> [--model X] [--usd-in 0.30 --usd-out 2.50]
    uv run python manage.py try_ai resolve "<place name>" [--city X] [--country Y]
        [--category food] [--description "..."] [--title "..."] [--model X]
"""

from __future__ import annotations

import time
from functools import partial

from django.core.management.base import BaseCommand, CommandError

from core import llm
from core.agent.extract import (
    ExtractionError,
    ExtractionPartialError,
    extract_candidates,
    format_timestamp,
)
from core.agent.resolve_graph import (
    AgentBudget,
    PlaceResult,
    SearchBudget,
    make_resolver_model,
    resolve_candidate,
)
from core.agent.schemas import Candidate
from core.config import MAX_SEARCHES_PER_VIDEO, MissingEnvError
from core.places import search_places
from core.video_url import ParseError, parse_video_url
from core.youtube import MetaError, YouTubeError, get_youtube_meta


class Command(BaseCommand):
    help = "Try the AI pipeline by hand (no database writes)."

    def add_arguments(self, parser):
        sub = parser.add_subparsers(dest="subcommand", required=True)
        extract = sub.add_parser("extract", help="Stream candidate places from a YouTube video")
        extract.add_argument("url")
        extract.add_argument("--model", help="Override GEMINI_MODEL for this run")
        extract.add_argument("--usd-in", type=float, help="USD per 1M input tokens (cost line)")
        extract.add_argument("--usd-out", type=float, help="USD per 1M output tokens (cost line)")
        extract.add_argument("--inr-per-usd", type=float, default=88.0)

        resolve = sub.add_parser("resolve", help="Check one place against Google Maps, step by step")
        resolve.add_argument("name", help="The place's name as said in the video")
        resolve.add_argument("--city")
        resolve.add_argument("--country")
        resolve.add_argument(
            "--category",
            default="other",
            choices=["food", "stay", "attraction", "activity", "shopping", "other"],
        )
        resolve.add_argument("--description", default="", help="What the video says about it")
        resolve.add_argument("--title", default="", help="The video's title")
        resolve.add_argument("--model", help="Override GEMINI_MODEL for this run")

    def handle(self, *args, **opts):
        handler = {"extract": self._extract, "resolve": self._resolve}[opts["subcommand"]]
        handler(opts)

    def _result_line(self, r: PlaceResult) -> str:
        style = {
            "verified": self.style.SUCCESS,
            "needs_review": self.style.WARNING,
            "unmatched": self.style.ERROR,
        }[r.verification]
        line = style(f"{r.verification:<12}") + f" via {r.resolved_by:<6} score {r.match_score:.3f}"
        if r.hit:
            line += f"  → {r.hit.name} · {r.hit.address}"
        flags = [f for f in ("places_error", "budget_exhausted") if getattr(r, f)]
        return line + (f"  [{', '.join(flags)}]" if flags else "")

    def _resolve(self, opts):
        out = self.stdout.write
        c = Candidate(
            ord=0,
            name=opts["name"],
            category=opts["category"],
            city=opts["city"],
            country=opts["country"],
            timestamp_sec=0,
            description=opts["description"],
        )
        try:
            model = make_resolver_model(opts["model"])
        except MissingEnvError as exc:
            raise CommandError(str(exc)) from exc

        budget, usage = SearchBudget(MAX_SEARCHES_PER_VIDEO), llm.Usage()
        start = time.monotonic()
        r = resolve_candidate(
            c,
            title=opts["title"],
            search=search_places,
            agent_model=model,
            budget=budget,
            agent_budget=AgentBudget(),
            usage=usage,
            log=lambda line: out(f"[{time.monotonic() - start:5.1f}s] {line}"),
        )
        out("\n" + self._result_line(r))
        if r.hit:
            out(f"{'':12}https://www.google.com/maps/place/?q=place_id:{r.hit.place_id}")
        out(
            f"\nPlaces searches: {MAX_SEARCHES_PER_VIDEO - budget.remaining} · "
            f"Gemini {usage} · {time.monotonic() - start:.1f}s"
        )

    def _extract(self, opts):
        out = self.stdout.write
        parsed = parse_video_url(opts["url"])
        if isinstance(parsed, ParseError):
            raise CommandError(f"URL rejected: {parsed.code}")
        try:
            meta = get_youtube_meta(parsed.video_id)
            model = opts["model"] or llm.gemini_model()
        except (YouTubeError, MissingEnvError) as exc:
            raise CommandError(str(exc)) from exc
        if isinstance(meta, MetaError):
            raise CommandError(f"Video rejected: {meta.code}")

        out(f"{meta.title!r} by {meta.channel}, {format_timestamp(meta.duration_sec)} · {model}\n")

        usage = llm.Usage()
        stream_fn = partial(llm.stream_video_json, model=opts["model"]) if opts["model"] else (
            llm.stream_video_json
        )
        start = time.monotonic()
        found = 0
        try:
            for c in extract_candidates(
                parsed.canonical_url,
                meta.title,
                meta.description,
                meta.duration_sec,
                stream_fn=stream_fn,
                usage=usage,
            ):
                found += 1
                where = ", ".join(p for p in (c.city, c.country) if p)
                out(
                    f"[{time.monotonic() - start:5.1f}s] #{c.ord:<2} "
                    f"{format_timestamp(c.timestamp_sec):>7}  {c.category:<10} "
                    + self.style.SUCCESS(c.name)
                    + (f"  ({where})" if where else "")
                )
                out(f"{'':12}{c.description}")
                out(f"{'':12}https://youtu.be/{parsed.video_id}?t={c.timestamp_sec}")
        except ExtractionPartialError as exc:
            out(self.style.WARNING(f"\nStopped early: {exc} ({exc.__cause__})"))
        except ExtractionError as exc:
            raise CommandError(str(exc)) from exc

        out(f"\n{found} place(s) in {time.monotonic() - start:.1f}s · {usage}")
        if opts["usd_in"] is not None and opts["usd_out"] is not None:
            usd = (usage.input_tokens * opts["usd_in"] + usage.output_tokens * opts["usd_out"]) / 1e6
            out(f"≈ ${usd:.4f} (₹{usd * opts['inr_per_usd']:.2f})")
