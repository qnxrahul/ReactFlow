import os
import json
import logging
from service.config_service import ConfigService

logger = logging.getLogger("CheckpointService")
CHECKPOINT_DIR = ConfigService.get("CHECKPOINT_DIR", "checkpoints")
if not os.path.exists(CHECKPOINT_DIR):
    os.makedirs(CHECKPOINT_DIR)

class CheckpointService:
    @staticmethod
    def load_checkpoint(request_id, resume):
        checkpoint_path = os.path.join(CHECKPOINT_DIR, f"{request_id}.json")
        if resume and os.path.exists(checkpoint_path):
            with open(checkpoint_path, "r") as f:
                checkpoint_data = json.load(f)
            logger.info(f"Resuming from checkpoint {request_id} at step {checkpoint_data.get('step_index', 0)}")
            return (
                checkpoint_data.get("results", {}),
                checkpoint_data.get("last_result", None),
                checkpoint_data.get("step_index", 0)
            )
        logger.info("Starting new workflow execution")
        return {}, None, 0

    @staticmethod
    def save_checkpoint(request_id, results, last_result, step_index):
        checkpoint_path = os.path.join(CHECKPOINT_DIR, f"{request_id}.json")
        checkpoint_data = {
            "results": results,
            "last_result": last_result,
            "step_index": step_index
        }
        with open(checkpoint_path, "w") as f:
            json.dump(checkpoint_data, f)
        logger.info(f"Checkpoint saved at step {step_index} for id {request_id}")
