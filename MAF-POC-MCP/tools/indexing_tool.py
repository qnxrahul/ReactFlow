import asyncio
from math import ceil
from datetime import datetime
from beartype import beartype
from typing import List
from common_server.cognitive_service.search_service import ChunkIndexer
from common_server.schemas.cognitive_service import ChunkModel
from models.checklist_request import SearchConfig

BATCH_SIZE = 100

class IndexChunksTool:
    """Tool for indexing text chunks into the search service."""
    @classmethod
    # @beartype
    async def index_chunks(
        cls,
        search_config: SearchConfig,
        request_id: str,
        extracted_chunks: List[dict]
    ):
        indexer = ChunkIndexer(search_config=search_config)

        # Convert dicts → ChunkModel objects
        chunks = [
            ChunkModel(
                **chunk,
                created_at=datetime.utcnow().isoformat(),
                request_id=request_id
            )
            for chunk in extracted_chunks
        ]

        total = len(chunks)
        batches = [
            chunks[i : i + BATCH_SIZE] for i in range(0, total, BATCH_SIZE)
        ]

        print(f"Indexing {total} chunks in {len(batches)} batch(es)...")

        async def process_batch(batch, batch_num):
            """Inner coroutine for processing a single batch safely."""
            try:
                result = await indexer.index_chunks(chunks=batch, request_id=request_id)
                print(f"✅ Batch {batch_num}/{len(batches)} indexed successfully ({len(batch)} chunks).")
                return {"batch": batch_num, "status": "success", "result": result}
            except Exception as e:
                print(f"❌ Batch {batch_num}/{len(batches)} failed: {e}")
                return {"batch": batch_num, "status": "failed", "error": str(e)}

        # Run all batches concurrently
        tasks = [
            process_batch(batch, batch_num + 1)
            for batch_num, batch in enumerate(batches)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten results and handle any exceptions returned directly by gather
        final_report = []
        for res in results:
            if isinstance(res, Exception):
                print(f"⚠️ Unexpected task-level error: {res}")
                final_report.append({"status": "failed", "error": str(res)})
            else:
                final_report.append(res)

        # Summary
        success = sum(1 for r in final_report if r["status"] == "success")
        failed = sum(1 for r in final_report if r["status"] == "failed")

        print(f"\n📊 Indexing completed: {success} succeeded, {failed} failed.\n")

        # Optional: retry failed batches
        if failed > 0:
            print("🔁 Retrying failed batches once...")
            failed_batches = [
                batches[r["batch"] - 1]
                for r in final_report if r["status"] == "failed"
            ]
            retry_tasks = [
                process_batch(batch, i + 1)
                for i, batch in enumerate(failed_batches)
            ]
            retry_results = await asyncio.gather(*retry_tasks, return_exceptions=True)
            print("✅ Retry attempt finished.")

        return final_report