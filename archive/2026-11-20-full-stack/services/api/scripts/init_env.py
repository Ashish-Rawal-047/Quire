"""Create services/api/.env from .env.example with a freshly generated development master key.

Usage (from services/api):  python scripts/init_env.py
Refuses to overwrite an existing .env.
"""

from __future__ import annotations

import base64
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXAMPLE = ROOT / ".env.example"
TARGET = ROOT / ".env"


def main() -> int:
    if TARGET.exists():
        print(f"{TARGET} already exists — leaving it unchanged.")
        return 0
    key = base64.b64encode(os.urandom(32)).decode()
    lines = [
        f"QUIRE_MASTER_KEY={key}" if line.startswith("QUIRE_MASTER_KEY=") else line
        for line in EXAMPLE.read_text(encoding="utf-8").splitlines()
    ]
    TARGET.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Created {TARGET} with a new development master key.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
