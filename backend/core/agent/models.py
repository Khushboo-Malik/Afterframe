"""LangChain chat-model factory for the place-checking agent.

Built explicitly from GEMINI_API_KEY with vertexai=False, never from shell env
or Application Default Credentials. Plain Python: no Django imports.
"""

from __future__ import annotations

from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import require_env


def make_agent_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=require_env("GEMINI_MODEL"),
        google_api_key=require_env("GEMINI_API_KEY"),
        vertexai=False,
        max_retries=4,
    )
