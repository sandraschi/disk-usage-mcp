import logging

logger = logging.getLogger(__name__)

_README_ONLY = {"readonly": True}
_MUTATING = {}


def _error_response(error: str, error_type: str = "general", **kwargs) -> dict:
    """Auto-logging error response — traceback logged before returning to caller."""
    logger.exception("Tool error: %s [%s]", error, error_type)
    return {
        "success": False,
        "error": error,
        "error_type": error_type,
        **kwargs,
    }
