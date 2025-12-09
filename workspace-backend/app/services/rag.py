from __future__ import annotations

import json
import math
from pathlib import Path
from typing import List, Sequence


class KnowledgeBaseEntry(dict):
    @property
    def text(self) -> str:
        return f"{self.get('title', '')}\n{self.get('content', '')}".lower()


class RAGService:
    def __init__(self, path: Path):
        self._path = path
        if path.exists():
            data = json.loads(path.read_text())
        else:
            data = []
        self._entries: List[KnowledgeBaseEntry] = [KnowledgeBaseEntry(entry) for entry in data]

    def retrieve(self, domain: str, intent: str, top_k: int = 3) -> List[KnowledgeBaseEntry]:
        if not self._entries:
            return []
        query_terms = self._tokenize(f"{domain} {intent}")
        if not query_terms:
            return self._entries[:top_k]

        scored = []
        for entry in self._entries:
            entry_terms = self._tokenize(entry.text)
            overlap = len(query_terms & entry_terms)
            score = overlap / math.sqrt(len(entry_terms) or 1)
            if domain.lower() in entry.get("domain", "").lower():
                score += 1.0
            scored.append((score, entry))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [entry for score, entry in scored[:top_k] if score > 0]

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        tokens = {token for token in text.lower().replace('\n', ' ').split(' ') if token.strip()}
        return tokens
