from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import httpx


class OpenRouterClient:
    """Thin wrapper around the OpenRouter chat completions API."""

    def __init__(
        self,
        api_key: Optional[str],
        model: str,
        base_url: str = "https://openrouter.ai/api/v1",
        timeout: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def generate(  # type: ignore[override]
        self,
        messages: List[Dict[str, Any]],
        response_schema: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
    ) -> str:
        if not self.enabled:
            raise RuntimeError("OpenRouter API key is not configured")

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "HTTP-Referer": "https://fast-agent.ai",
            "X-Title": "Workspace Workflow Generator",
        }
        payload: Dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_schema:
            payload["response_format"] = {"type": "json_schema", "json_schema": response_schema}

        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(f"{self._base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content")
        )
        if not content:
            raise ValueError("OpenRouter response did not include content")

        # Some models return a list of content segments; normalize to string
        if isinstance(content, list):
            content = "".join(
                segment.get("text", "") if isinstance(segment, dict) else str(segment) for segment in content
            )

        # When response_format is enforced the content is already JSON. Otherwise the response might include
        # Markdown fences; strip them for convenience.
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```", 2)[1]
            # drop optional json identifier like ```json
            content = content.split("\n", 1)[1] if "\n" in content else content

        # Validate JSON
        json.loads(content)
        return content
