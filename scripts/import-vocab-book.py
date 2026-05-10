"""
Import local IELTS vocabulary resources from the external learning resource root.

Default input:
  $LEARNING_RESOURCE_ROOT/vocabulary-books

Output:
  data/private/vocabulary.generated.json

Raw books are never copied into the repository.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RESOURCE_ROOT = Path("C:/Users/zhangbinbin/Desktop/学英语")
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "private" / "vocabulary.generated.json"
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}
WORD_RE = re.compile(r"\b[A-Za-z][A-Za-z'’-]{2,}\b")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def normalize_path(value: str) -> Path:
    return Path(value.strip().strip('"')).expanduser().resolve()


def get_resource_root() -> Path:
    configured = os.environ.get("LEARNING_RESOURCE_ROOT")
    return normalize_path(configured) if configured else DEFAULT_RESOURCE_ROOT


def default_input_dir() -> Path:
    root = get_resource_root()
    for name in ("vocabulary-books", "06.雅思词汇"):
        candidate = root / name
        if candidate.exists():
            return candidate
    return root / "vocabulary-books"


def resolve_input_path(explicit: str | None) -> Path:
    path = normalize_path(explicit) if explicit else default_input_dir()
    if not path.exists():
        if explicit:
            raise SystemExit(f"Input path not found: {path}")
        if not os.environ.get("LEARNING_RESOURCE_ROOT"):
            raise SystemExit(
                "LEARNING_RESOURCE_ROOT is not configured. "
                "Please set it to C:/Users/zhangbinbin/Desktop/学英语"
            )
        raise SystemExit(f"Resource folder not found: {path}")
    return path


def discover_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        candidates = [input_path]
    else:
        candidates = [path for path in input_path.rglob("*") if path.is_file()]
    return sorted(path for path in candidates if path.suffix.lower() in SUPPORTED_EXTENSIONS)


def read_pdf_text(path: Path) -> str:
    try:
        import fitz
    except ImportError as exc:
        raise SystemExit("PyMuPDF is required for PDF import. Install it with: pip install pymupdf") from exc

    doc = fitz.open(str(path))
    parts = [page.get_text("text") for page in doc]
    doc.close()
    return "\n".join(parts)


def read_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return read_pdf_text(path)
    return path.read_text(encoding="utf-8-sig", errors="ignore")


def extract_items_from_text(text: str, source_name: str) -> list[dict]:
    lines = [normalize_line(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    items: dict[str, dict] = {}

    for index, line in enumerate(lines):
        words = WORD_RE.findall(line)
        if not words:
            continue
        word = words[0].strip("’'").lower()
        if len(word) < 3 or word in items:
            continue
        window = " ".join(lines[index : index + 3])
        meaning = extract_chinese_meaning(window)
        if not meaning and len(items) > 200:
            continue
        items[word] = build_vocab_item(word, meaning, source_name, line)

    return list(items.values())


def normalize_line(line: str) -> str:
    return re.sub(r"\s+", " ", line.replace("\u00ad", "")).strip()


def extract_chinese_meaning(text: str) -> str:
    if not CJK_RE.search(text):
        return ""
    cjk_part = re.sub(r"^[A-Za-z0-9'’\-\s\[\]/.,;:()]+", "", text).strip()
    cjk_part = re.sub(r"\s+", " ", cjk_part)
    return cjk_part[:180]


def build_vocab_item(word: str, meaning: str, source_name: str, line: str) -> dict:
    return {
        "id": f"local_{slugify(word)}",
        "word": word,
        "partOfSpeech": [],
        "chineseMeaning": meaning or "待人工补充释义",
        "englishDefinition": "",
        "cefrLevel": "B2",
        "topicTags": ["general_academic"],
        "skillTags": ["reading", "listening"] if len(word) >= 8 else ["reading"],
        "sourceLayers": ["topic_vocabulary"],
        "examples": [
            {
                "sentence": line[:240],
                "translation": "",
                "context": "reading",
                "targetWord": word,
            }
        ],
        "synonyms": [],
        "antonyms": [],
        "collocations": [],
        "wordFamily": [word],
        "commonMistakes": [],
        "listeningRisk": {
            "spellingRisk": len(word) >= 8,
            "homophoneRisk": False,
            "weakFormRisk": False,
            "pluralRisk": False,
            "commonWrongSpellings": [],
        },
        "privateSource": {
            "type": "external_resource",
            "sourceName": source_name,
        },
    }


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def write_output(items: list[dict], output_path: Path, source_files: list[Path]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "metadata": {
            "resourceRoot": str(get_resource_root()).replace("\\", "/"),
            "sourceFiles": [str(path).replace("\\", "/") for path in source_files],
            "count": len(items),
            "generatedBy": "scripts/import-vocab-book.py",
            "note": "Private generated data for local study. Do not commit data/private/.",
        },
        "items": items,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import IELTS vocabulary resources from external local folder.")
    parser.add_argument("--input", help="PDF/TXT/MD file or folder. Defaults to $LEARNING_RESOURCE_ROOT/vocabulary-books.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON path.")
    parser.add_argument("--limit", type=int, default=0, help="Optional maximum number of items for testing.")
    args = parser.parse_args()

    input_path = resolve_input_path(args.input)
    files = discover_files(input_path)
    if not files:
        raise SystemExit(f"No supported vocabulary files found in: {input_path}")

    merged: dict[str, dict] = {}
    for file_path in files:
        for item in extract_items_from_text(read_text(file_path), file_path.name):
            merged.setdefault(item["word"].lower(), item)

    items = sorted(merged.values(), key=lambda item: item["word"])
    if args.limit:
        items = items[: args.limit]

    output_path = normalize_path(args.output)
    write_output(items, output_path, files)
    print(f"[OK] Imported {len(items)} vocabulary items")
    print(f"[OK] Input: {input_path}")
    print(f"[OK] Output: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
