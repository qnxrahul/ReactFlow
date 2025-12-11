import re
import uuid

from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Literal, Optional, Tuple

@dataclass
class BlockSiblingGroup:
    leaves: List["Block"]
    ancestors: Tuple["Block", ...]
    group_id: str
    group_key: str

    def to_wire(self, *, include_children: bool = False) -> Dict[str, Any]:
        return {
            "groupId": self.group_id,
            "groupKey": self.group_key,
            "ancestors": Block.ancestors_to_wire(
                self.ancestors, include_children=include_children
            ),
            "leaves": [
                b.to_wire(include_children=include_children)
                for b in self.leaves
            ],
        }

    @classmethod
    def from_wire(cls, d: Dict[str, Any]) -> "BlockSiblingGroup":
        group_id = d.get("groupId")
        group_key = d.get("groupKey") or ""
        ancestors = Block.ancestors_from_wire(d.get("ancestors", []) or [])
        leaves = [Block.from_wire(b) for b in d.get("leaves", []) or []]
        return cls(
            leaves=leaves,
            ancestors=ancestors,
            group_id=group_id,
            group_key=group_key,
        )

@dataclass
class MetaData:
    checklistId: Optional[str] = None
    checklistName: Optional[str] = None
    templateId: Optional[str] = None
    templateName: Optional[str] = None
    framework: Optional[str] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    isScoping: Optional[str] = None
    rootBlockId: Optional[str] = None
    totalBlocks: Optional[str] = None


@dataclass
class Block:
    blockId: str
    blockType: Literal[
        "Section",
        "Information",
        "RadioQuestion",
        "TextQuestion",
        "MultiQuestionContainer",
    ]
    title: str
    responseOptions: List[str]
    guidanceText: str
    blocks: List["Block"]
    parentBlockId: Optional[str] = None
    isAIResponseExpected: Optional[bool] = False

    @staticmethod
    def _strip_all_parens(s: str) -> str:
        """
        Remove all balanced parenthetical segments, including nested ones.
        Repeatedly strips innermost '(... )' until none remain.
        """
        _P_INNER = re.compile(r"\([^()]*\)")
        prev = None
        while s != prev:
            prev = s
            s = _P_INNER.sub("", s)
        return s

    @classmethod
    def _guidance_group_key(cls, text: Optional[str]) -> Optional[str]:
        """
        Canonical guidance key using regex-only processing with iterative
        paren stripping to handle nesting:
          1) remove ALL '(...)' (nested/adjacent),
          2) split on commas,
          3) trim + collapse whitespace,
          4) rejoin with ', '.
        """
        if not text:
            return None
        s = text.strip()
        if not s:
            return None

        # 1) fully remove nested/adjacent parentheses
        s = cls._strip_all_parens(s)

        # 2-4) split/normalize/rejoin
        parts = [re.sub(r"\s+", " ", p).strip() for p in s.split(",")]
        parts = [p for p in parts if p]
        return ", ".join(parts) if parts else None

    def walk_with_ancestors(
        self, ancestors: Tuple["Block", ...] = ()
    ) -> Iterator[Tuple["Block", Tuple["Block", ...]]]:
        """
        DFS that yields (node, ancestors) where `ancestors` excludes `node`
        and is ordered from root -> parent.
        """
        yield self, ancestors   
        for b in self.blocks:
            if b.parentBlockId is None:
                b.parentBlockId = self.blockId
            # pass down the path including `self`
            yield from b.walk_with_ancestors(ancestors + (self,))

    def walk_leaf_groups(
        self, max_group_size: Optional[int] = None
    ) -> Iterator[BlockSiblingGroup]:
        """
        DFS over this subtree, grouping all isAIResponseExpected nodes by their
        immediate parent AND the normalized guidance list. Yields groups in DFS order.

        If max_group_size is provided (> 0), large sibling groups are split into
        consecutive chunks of at most that size (each with a unique group_id).
        """
        # Key: (parentId, normalizedGuidanceKey)
        groups: Dict[
            Tuple[Optional[str], Optional[str]],
            Tuple[
                Tuple["Block", ...], List["Block"], str
            ],  # (ancestors, leaves, group_key)
        ] = {}

        for node, ancestors in self.walk_with_ancestors():
            if not node.isAIResponseExpected:
                continue

            parent_key: Optional[str] = (
                ancestors[-1].blockId if ancestors else None
            )
            guidance_key_opt: Optional[str] = self._guidance_group_key(
                node.guidanceText
            )
            group_key_str = (
                guidance_key_opt or ""
            )  # Store a string for serialization
            key = (parent_key, guidance_key_opt)

            if key not in groups:
                groups[key] = (ancestors, [], group_key_str)
            groups[key][1].append(node)

        limit = (
            max_group_size
            if (isinstance(max_group_size, int) and max_group_size > 0)
            else None
        )

        for _, (ancestors, leaves, group_key_str) in groups.items():
            if not limit:
                yield BlockSiblingGroup(
                    ancestors=ancestors,
                    leaves=list(leaves),
                    group_id=str(uuid.uuid4()),
                    group_key=group_key_str,
                )
            else:
                for i in range(0, len(leaves), limit):
                    yield BlockSiblingGroup(
                        ancestors=ancestors,
                        leaves=leaves[i : i + limit],
                        group_id=str(uuid.uuid4()),
                        group_key=group_key_str,
                    )

    def to_wire(self, *, include_children: bool = False) -> Dict[str, Any]:
        """
        Convert to a JSON-serializable dict for messaging.
        By default, children are omitted to keep payloads small.
        """
        return {
            "blockId": self.blockId,
            "blockType": self.blockType,
            "title": self.title,
            "responseOptions": list(self.responseOptions or []),
            "guidanceText": self.guidanceText,
            "blocks": (
                [
                    b.to_wire(include_children=include_children)
                    for b in self.blocks
                ]
                if include_children
                else []
            ),
            "parentBlockId": self.parentBlockId,
        }

    @classmethod
    def from_wire(cls, d: Dict[str, Any]) -> "Block":
        """
        Rehydrate a Block from a dict produced by `to_wire`.
        """
        children = [cls.from_wire(b) for b in d.get("blocks", []) or []]
        return cls(
            blockId=d["blockId"],
            blockType=d["blockType"],
            isAIResponseExpected=d.get("isAIResponseExpected", False),
            title=d["title"],
            responseOptions=d.get("responseOptions", []) or [],
            guidanceText=d.get("guidanceText", "") or "",
            blocks=children,
            parentBlockId=d.get("parentBlockId"),
        )

    @staticmethod
    def ancestors_to_wire(
        ancestors: Tuple["Block", ...], *, include_children: bool = False
    ) -> List[Dict[str, Any]]:
        return [
            a.to_wire(include_children=include_children) for a in ancestors
        ]

    @classmethod
    def ancestors_from_wire(
        cls, items: List[Dict[str, Any]]
    ) -> Tuple["Block", ...]:
        return tuple(cls.from_wire(i) for i in items or [])

