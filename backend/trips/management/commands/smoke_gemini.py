"""Real-API smoke check: Gemini watches a YouTube video and streams JSON.

    uv run python manage.py smoke_gemini <youtube-url> [--resolutions low,high]
        [--usd-in 0.30 --usd-out 2.50 --inr-per-usd 88] [--skip-agent]

1. Prints the last 4 chars of the Gemini key and vertexai=False, so you can
   confirm it's your personal AfterFrame key.
2. Streams a tiny schema at each resolution, printing chunks as they arrive
   and the token Usage (low should use far fewer input tokens than high).
3. Binds a dummy `echo` tool to the agent model with tool_choice="any"
   (expected: exactly one tool call).
"""

from __future__ import annotations

import json
import os
import time

from django.core.management.base import BaseCommand, CommandError
from langchain_core.tools import tool
from pydantic import BaseModel

from core import llm
from core.agent.models import make_agent_model
from core.config import MissingEnvError
from core.video_url import ParseError, parse_video_url
from core.youtube import MetaError, YouTubeError, get_youtube_meta

PROMPT = (
    "Watch this video. List up to 8 specific things (places, dishes, landmarks or "
    "objects) that are named or shown, in the order they first appear, each with the "
    "MM:SS timestamp of its first appearance."
)


class Thing(BaseModel):
    thing: str
    timestamp: str


@tool
def echo(text: str) -> str:
    """Return the given text unchanged."""
    return text


class Command(BaseCommand):
    help = "Smoke-test Gemini video streaming (low vs high resolution) and the agent model."

    def add_arguments(self, parser):
        parser.add_argument("url", help="A public YouTube video URL")
        parser.add_argument("--resolutions", default="low,high")
        parser.add_argument("--skip-agent", action="store_true")
        parser.add_argument("--usd-in", type=float, help="Paid price, USD per 1M input tokens")
        parser.add_argument("--usd-out", type=float, help="Paid price, USD per 1M output tokens")
        parser.add_argument("--inr-per-usd", type=float, default=88.0)

    def handle(self, *args, **opts):
        out = self.stdout.write
        try:
            client = llm.make_client()
            model = llm.gemini_model()
        except MissingEnvError as exc:
            raise CommandError(str(exc)) from exc

        key = os.environ["GEMINI_API_KEY"].strip()
        vertex = getattr(getattr(client, "_api_client", None), "vertexai", "?")
        out(f"key …{key[-4:]}, vertexai={vertex}, model={model}")
        out("Check those last 4 chars match your key in AI Studio → API keys.\n")

        parsed = parse_video_url(opts["url"])
        if isinstance(parsed, ParseError):
            raise CommandError(f"URL rejected: {parsed.code}")

        duration = None
        try:
            meta = get_youtube_meta(parsed.video_id)
        except (YouTubeError, MissingEnvError) as exc:
            out(self.style.WARNING(f"YouTube metadata skipped: {exc}"))
        else:
            if isinstance(meta, MetaError):
                raise CommandError(f"Video rejected: {meta.code}")
            duration = meta.duration_sec
            out(f"{meta.title!r} by {meta.channel}, {duration // 60}:{duration % 60:02d}\n")

        results: dict[str, llm.Usage] = {}
        for res in [r.strip() for r in opts["resolutions"].split(",") if r.strip()]:
            results[res] = self._stream_once(parsed.canonical_url, res, duration, opts)

        if "low" in results and "high" in results and results["high"].input_tokens:
            ratio = results["low"].input_tokens / results["high"].input_tokens
            out(f"\nlow/high input tokens = {ratio:.2f} (docs suggest about 0.33)")

        if not opts["skip_agent"]:
            self._agent_check()

    def _stream_once(self, url, res, duration, opts) -> llm.Usage:
        out = self.stdout.write
        out(self.style.MIGRATE_HEADING(f"--- resolution={res} ---"))
        usage = llm.Usage()
        start = time.monotonic()
        chunks: list[str] = []
        for chunk in llm.stream_video_json(url, PROMPT, list[Thing], usage, resolution=res):
            chunks.append(chunk)
            out(f"[{time.monotonic() - start:5.1f}s] chunk {len(chunks)}: {chunk!r}")
        elapsed = time.monotonic() - start

        try:
            items = json.loads("".join(chunks))
            out(f"valid JSON: {len(items)} items")
        except json.JSONDecodeError as exc:
            out(self.style.ERROR(f"joined chunks are not valid JSON: {exc}"))

        out(f"{len(chunks)} chunks in {elapsed:.1f}s, {usage}")
        if duration:
            per_20 = 1200 / duration
            in_20 = usage.input_tokens * per_20
            out_20 = usage.output_tokens * per_20
            out(f"≈ per 20-min video: {in_20:,.0f} input + {out_20:,.0f} output tokens")
            if opts["usd_in"] is not None and opts["usd_out"] is not None:
                usd = (in_20 * opts["usd_in"] + out_20 * opts["usd_out"]) / 1_000_000
                out(f"≈ ₹{usd * opts['inr_per_usd']:.2f} per 20-min video at paid rates")
        return usage

    def _agent_check(self):
        out = self.stdout.write
        out(self.style.MIGRATE_HEADING("\n--- agent model: echo tool, tool_choice='any' ---"))
        chat = make_agent_model()
        out(f"vertexai={chat.vertexai}, max_retries={chat.max_retries}")
        msg = chat.bind_tools([echo], tool_choice="any").invoke(
            "Use the echo tool to send back the word 'hello'."
        )
        out(f"{len(msg.tool_calls)} tool call(s): {msg.tool_calls}")
