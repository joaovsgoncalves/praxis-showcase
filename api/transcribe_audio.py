#!/usr/bin/env python3
"""Local STT helper for Praxis voice capture.

Reads an audio path and prints JSON: {"text": "...", "language": "pt"}.
Uses faster-whisper when installed. The Node API owns upload validation,
timeouts and temp-file cleanup.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "audio path is required"}, ensure_ascii=False), file=sys.stderr)
        return 2

    audio_path = Path(sys.argv[1])
    if not audio_path.exists() or not audio_path.is_file():
        print(json.dumps({"error": "audio file not found"}, ensure_ascii=False), file=sys.stderr)
        return 2

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:  # pragma: no cover - environment dependent
        print(json.dumps({"error": f"faster-whisper not available: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 3

    model_name = os.environ.get("FORJA_WHISPER_MODEL", "small")
    device = os.environ.get("FORJA_WHISPER_DEVICE", "cpu")
    compute_type = os.environ.get("FORJA_WHISPER_COMPUTE_TYPE", "int8")

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute_type)
        segments, info = model.transcribe(str(audio_path), language="pt", vad_filter=True, beam_size=1)
        text = " ".join(segment.text.strip() for segment in segments if segment.text and segment.text.strip()).strip()
        if not text:
            print(json.dumps({"error": "empty transcription"}, ensure_ascii=False), file=sys.stderr)
            return 4
        print(json.dumps({"text": text, "language": getattr(info, "language", None) or "pt"}, ensure_ascii=False))
        return 0
    except Exception as exc:  # pragma: no cover - environment dependent
        print(json.dumps({"error": f"transcription failed: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 5


if __name__ == "__main__":
    raise SystemExit(main())
