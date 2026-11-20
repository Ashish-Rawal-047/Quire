"""Per-document scratch folders.

Phase 1 never writes document data to disk: uploads are encrypted in memory as they stream in.
These folders exist for Phase 2 document conversion, which must run with `workspace_dir` on a
RAM-backed mount (Linux tmpfs). Purge and the retention sweep remove them either way, so no
temporary file can outlive its document.
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from app.core.config import get_settings


def workspace_path(document_id: uuid.UUID) -> Path:
    return get_settings().workspace_dir / str(document_id)


def remove_workspace(document_id: uuid.UUID) -> bool:
    path = workspace_path(document_id)
    if not path.exists():
        return False
    shutil.rmtree(path)
    return True


def sweep_workspaces(live_document_ids: set[uuid.UUID]) -> int:
    """Remove folders for documents that are no longer stored (e.g. left behind by a crash)."""
    root = get_settings().workspace_dir
    if not root.exists():
        return 0
    removed = 0
    for child in root.iterdir():
        try:
            doc_id = uuid.UUID(child.name)
        except ValueError:
            doc_id = None
        if doc_id in live_document_ids:
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
        removed += 1
    return removed
