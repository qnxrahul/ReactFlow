# text_chunker.py
import re
from typing import List, Dict
from tiktoken import encoding_for_model
from beartype import beartype

class TextChunker:
    """
    Splits large texts into manageable chunks for embedding.
    Keeps metadata such as page number and paragraph number.
    """

    def __init__(self, model_name: str = "text-embedding-3-large", max_tokens: int = 500, overlap: int = 50):
        self.model_name = model_name
        self.max_tokens = max_tokens
        self.overlap = overlap
        try:
            self.encoder = encoding_for_model(model_name)
        except Exception as e:
            print(f"Error initializing encoder for model {model_name}: {e}")
            self.encoder = None

    def _count_tokens(self, text: str) -> int:
        if self.encoder:
            return len(self.encoder.encode(text))
        return 0

    def _split_text(self, text: str) -> List[str]:
        """
        Splits text intelligently into smaller chunks based on token limit.
        """
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks, current_chunk, current_tokens = [], "", 0

        for sentence in sentences:
            tokens = self._count_tokens(sentence)
            if current_tokens + tokens > self.max_tokens:
                chunks.append(current_chunk.strip())
                # start new chunk with overlap
                overlap_text = " ".join(current_chunk.split()[-self.overlap:])
                current_chunk = overlap_text + " " + sentence
                current_tokens = self._count_tokens(current_chunk)
            else:
                current_chunk += " " + sentence
                current_tokens += tokens

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    @beartype
    def chunk_documents(self, docs: List[Dict]) -> List[Dict]:
        """
        Takes a list of documents with metadata and returns chunked documents.

        Input example:
        [
            {"page_number": 1, "paragraph_number": 2, "text": "..."}
        ]

        Output example:
        [
            {
                "page_number": 1,
                "paragraph_number": 2,
                "chunk_index": 0,
                "chunk_text": "This is part of the text...",
                "tokens": 452
            }
        ]
        """
        
        chunked_docs = []
        
        for doc in docs:
            text = doc.get("text", "").strip() or doc.get("content", "").strip()
            if not text:
                continue

            text_chunks = self._split_text(text)
            for idx, chunk in enumerate(text_chunks):
                chunked_docs.append({
                    "page_number": doc.get("page_number"),
                    "paragraph_number": doc.get("paragraph_number"),
                    "chunk_index": idx,
                    "text": chunk,
                    "tokens": self._count_tokens(chunk),
                })
    
        return chunked_docs
