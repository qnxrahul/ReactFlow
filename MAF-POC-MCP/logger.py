"""Package-wide logging configuration."""
import logging
import sys
from pathlib import Path
from rich.logging import RichHandler

def setup_logger(log_level=logging.INFO):
    """Set up package-wide logger configuration."""
    # Create logger
    logger = logging.getLogger("extraction_tool")
    logger.setLevel(log_level)

    # Create handlers
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)

    # Create logs directory if it doesn't exist
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / "extraction_tool.log")
    file_handler.setLevel(log_level)

    # Create formatters
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


def get_logger(name: str = "rag_ingestion") -> logging.Logger:
    """Get or create a logger with a consistent format and stream handler."""
    logger = logging.getLogger(name)

    # Avoid adding multiple handlers if already configured
    if not logger.handlers:
        handler = RichHandler(rich_tracebacks=True, show_time=True, show_level=True, show_path=True, markup=True,level=logging.INFO)
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S" 
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger