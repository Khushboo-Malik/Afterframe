"""Pull complete objects out of a JSON array while it is still streaming.

Gemini sends `[{...}, {...}, ...]` in arbitrary text chunks, often cut mid-string.
`iter_array_objects` yields each top-level object the moment its closing brace
arrives, so the first place shows up long before the array is finished.
Plain Python: no Django imports.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Iterator


def iter_array_objects(chunks: Iterable[str]) -> Iterator[dict]:
    """Yield each complete top-level `{...}` of a streamed JSON array.

    - Text before the first `[` is ignored; `[]` yields nothing.
    - Braces inside strings ("x}y") and escaped quotes don't count.
    - A nested object only ever yields as part of its top-level parent.
    - An element that isn't valid JSON is skipped.
    """
    started = False  # seen the opening "["
    depth = 0  # brace depth; 1 = inside a top-level object
    in_string = False
    escaped = False
    buf: list[str] = []

    for chunk in chunks:
        for ch in chunk:
            if not started:
                started = ch == "["
                continue
            if depth > 0:
                buf.append(ch)

            if in_string:
                if escaped:
                    escaped = False
                elif ch == "\\":
                    escaped = True
                elif ch == '"':
                    in_string = False
                continue

            if ch == '"':
                in_string = True
            elif ch == "{":
                if depth == 0:
                    buf = ["{"]
                depth += 1
            elif ch == "}" and depth > 0:
                depth -= 1
                if depth == 0:
                    try:
                        obj = json.loads("".join(buf))
                    except json.JSONDecodeError:
                        continue
                    if isinstance(obj, dict):
                        yield obj
            elif ch == "]" and depth == 0:
                return
