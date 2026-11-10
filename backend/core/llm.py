"""Gemini video calls. Together with core/agent/models.py, the only place Gemini is touched.

The client is built explicitly from GEMINI_API_KEY with vertexai=False. It
never reads GOOGLE_API_KEY, Application Default Credentials or any other
shell variable, so a work key can't be picked up by accident.
Plain Python: no Django imports.
"""

from __future__ import annotations

import os
import threading
from collections.abc import Iterator
from itertools import chain
from typing import Any

from google import genai
from google.genai import errors, types
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from core.config import require_env

RETRY_STATUS = {429, 503}

_RESOLUTIONS = {
    "low": types.MediaResolution.MEDIA_RESOLUTION_LOW,
    "medium": types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    "high": types.MediaResolution.MEDIA_RESOLUTION_HIGH,
}


class Usage:
    """Token totals for one video run. Thread-safe: resolver threads add to it concurrently."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.input_tokens = 0
        self.output_tokens = 0
        self.calls = 0

    def add(self, input: int, output: int) -> None:
        with self._lock:
            self.input_tokens += input or 0
            self.output_tokens += output or 0
            self.calls += 1

    def __repr__(self) -> str:
        return (
            f"Usage(calls={self.calls}, input_tokens={self.input_tokens}, "
            f"output_tokens={self.output_tokens})"
        )


def gemini_model() -> str:
    return require_env("GEMINI_MODEL")


def media_resolution(name: str | None = None) -> types.MediaResolution:
    raw = (name or os.getenv("GEMINI_MEDIA_RESOLUTION", "") or "low").strip().lower()
    if raw not in _RESOLUTIONS:
        raise ValueError(f"GEMINI_MEDIA_RESOLUTION must be low, medium or high, not {raw!r}")
    return _RESOLUTIONS[raw]


def make_client() -> genai.Client:
    return genai.Client(api_key=require_env("GEMINI_API_KEY"), vertexai=False)


def _is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, errors.APIError) and exc.code in RETRY_STATUS


@retry(
    retry=retry_if_exception(_is_retryable),
    wait=wait_exponential_jitter(initial=2, max=16, jitter=1),  # 2s, 4s, 8s, 16s (+ up to 1s)
    stop=stop_after_attempt(5),  # first try + 4 retries
    reraise=True,
)
def _open_stream(client: genai.Client, **request: Any):
    """Start the stream and pull the first chunk, so 429/503 at the start get retried.

    Errors after the first chunk are never retried here: the caller has already
    seen output, and replaying the stream would duplicate it.
    """
    stream = client.models.generate_content_stream(**request)
    first = next(stream, None)
    return first, stream


def stream_video_json(
    video_url: str,
    prompt: str,
    schema: Any,
    usage: Usage,
    *,
    resolution: str | None = None,
    model: str | None = None,
) -> Iterator[str]:
    """Yield raw JSON text chunks as Gemini watches the video.

    `schema` is a Pydantic model or e.g. `list[Model]`; Gemini is constrained to it.
    `resolution` overrides GEMINI_MEDIA_RESOLUTION (low | medium | high).
    `model` overrides GEMINI_MODEL (used to compare models side by side).
    """
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema,
        media_resolution=media_resolution(resolution),
    )
    contents = types.Content(
        role="user",
        parts=[
            types.Part(file_data=types.FileData(file_uri=video_url)),
            types.Part(text=prompt),
        ],
    )
    yield from _stream_chunks(
        model=model or gemini_model(), contents=contents, config=config, usage=usage
    )


def _stream_chunks(*, model: str, contents: Any, config: Any, usage: Usage) -> Iterator[str]:
    # The client must stay referenced for the whole stream: genai.Client.__del__
    # closes its HTTP connection, so a client garbage-collected after the first
    # chunk kills the stream ("ReadError: Bad file descriptor").
    client = make_client()
    last_meta = None
    try:
        first, stream = _open_stream(client, model=model, contents=contents, config=config)
        for chunk in chain([first] if first is not None else [], stream):
            if chunk.usage_metadata:
                last_meta = chunk.usage_metadata
            text = chunk.text
            if text:
                yield text
    finally:
        # Counted even if the caller stops early or the stream breaks midway.
        if last_meta is not None:
            usage.add(
                last_meta.prompt_token_count or 0,
                # Thinking tokens are billed as output.
                (last_meta.candidates_token_count or 0) + (last_meta.thoughts_token_count or 0),
            )
        client.close()
