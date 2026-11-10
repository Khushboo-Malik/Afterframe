"""Name matching helpers. Plain Python: no Django imports."""

from __future__ import annotations

import re
import unicodedata

_PUNCT_RE = re.compile(r"[^\w\s]|_")


def normalize_name(s: str) -> str:
    """'Café de Flore!' -> 'cafe de flore'.

    Lowercase, strip accents (NFKD, drop combining marks), turn punctuation
    and '&' into spaces, collapse whitespace.
    """
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " ")
    s = _PUNCT_RE.sub(" ", s)
    return " ".join(s.split())
