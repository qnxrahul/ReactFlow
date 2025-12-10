from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set


@dataclass(frozen=True)
class AuditDomain:
    id: str
    label: str
    category: Optional[str]
    synonyms: Set[str]
    intent_examples: Set[str]
    related_domains: Set[str]
    knowledge_ref: Optional[str]

    @classmethod
    def from_dict(cls, payload: Dict[str, object]) -> "AuditDomain":
        return cls(
            id=str(payload.get("id")),
            label=str(payload.get("label")),
            category=payload.get("category"),
            synonyms={syn.lower() for syn in payload.get("synonyms", [])},
            intent_examples={intent.lower() for intent in payload.get("intentExamples", [])},
            related_domains=set(payload.get("relatedDomains", [])),
            knowledge_ref=payload.get("knowledgeRef"),
        )

    def matches(self, value: str) -> bool:
        candidate = value.strip().lower()
        return candidate == self.label.lower() or candidate in self.synonyms


class AuditTaxonomy:
    def __init__(self, definitions: Iterable[AuditDomain]):
        self._domains: List[AuditDomain] = list(definitions)
        self._by_id: Dict[str, AuditDomain] = {domain.id: domain for domain in self._domains}

    def canonicalize(self, value: Optional[str]) -> Optional[str]:
        if not value or not value.strip():
            return None
        for domain in self._domains:
            if domain.matches(value):
                return domain.label
        return None

    def resolve_by_label(self, label: Optional[str]) -> Optional[AuditDomain]:
        canonical = self.canonicalize(label)
        if not canonical:
            return None
        for domain in self._domains:
            if domain.label == canonical:
                return domain
        return None

    def canonicalize_list(self, values: Iterable[str]) -> Set[str]:
        result: Set[str] = set()
        for value in values:
            canonical = self.canonicalize(value)
            if canonical:
                result.add(canonical)
        return result


@lru_cache
def load_taxonomy(path: Path) -> AuditTaxonomy:
    data = json.loads(path.read_text())
    domains = [AuditDomain.from_dict(entry) for entry in data]
    return AuditTaxonomy(domains)
