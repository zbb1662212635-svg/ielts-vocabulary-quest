"""
Import a local IELTS vocabulary ebook into the app's private VocabularyItem JSON.

The script reads private source files from private/raw and writes only structured
learning data to data/private/vocabulary.generated.json. The raw ebook and the
generated private JSON are ignored by git.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "private" / "raw"
OUTPUT_PATH = ROOT / "data" / "private" / "vocabulary.generated.json"
SUPPORTED_EXTENSIONS = {".pdf", ".txt"}

ENTRY_START_RE = re.compile(
    r"^(?P<word>[A-Za-z][A-Za-z'’.\-]*(?:\s+[A-Za-z][A-Za-z'’.\-]*)?\*?)\s+"
    r"\[(?P<phonetic>[^\]]{1,80})\](?:\s*(?P<trailing>.*))?$"
)
POS_RE = re.compile(
    r"^(?P<pos>(?:prep|conj|pron|adj|adv|num|int|vt|vi|n|v)\.?(?:/(?:prep|conj|pron|adj|adv|num|int|vt|vi|n|v)\.?)*)\s*(?P<body>.*)$",
    re.IGNORECASE,
)
MARKER_RE = re.compile(r"^(记|例|搭|派|同|反|辨|考)\s*")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


@dataclass
class RawEntry:
    word: str
    phonetic: str
    lines: list[str] = field(default_factory=list)
    page: int | None = None


def read_pdf_lines(path: Path) -> Iterable[tuple[int, str]]:
    try:
        import fitz
    except ImportError as exc:
        raise SystemExit("PyMuPDF is required. Install it with: pip install pymupdf") from exc

    doc = fitz.open(str(path))
    for page_index, page in enumerate(doc, 1):
        text = page.get_text("text")
        for line in text.splitlines():
            cleaned = normalize_line(line)
            if cleaned:
                yield page_index, cleaned
    doc.close()


def read_txt_lines(path: Path) -> Iterable[tuple[int, str]]:
    text = path.read_text(encoding="utf-8-sig", errors="ignore")
    for index, line in enumerate(text.splitlines(), 1):
        cleaned = normalize_line(line)
        if cleaned:
            yield index, cleaned


def normalize_line(line: str) -> str:
    line = line.replace("\u00ad", "")
    line = re.sub(r"\s+", " ", line).strip()
    if not line:
        return ""
    if re.fullmatch(r"\d+", line):
        return ""
    if line in {"音频", "扫码获取", "CONTENTS"}:
        return ""
    if line.startswith("Word List ") or line.startswith("版权信息") or line.startswith("目录"):
        return ""
    return line


def choose_input_file(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit)
        if not path.is_absolute():
            path = ROOT / path
        if not path.exists():
            raise SystemExit(f"Input file not found: {path}")
        return path

    files = [p for p in RAW_DIR.glob("*") if p.suffix.lower() in SUPPORTED_EXTENSIONS]
    if not files:
        raise SystemExit(f"No supported ebook found in {RAW_DIR}. Put a PDF or TXT there first.")
    return sorted(files, key=lambda p: p.stat().st_size, reverse=True)[0]


def iter_lines(path: Path) -> Iterable[tuple[int, str]]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return read_pdf_lines(path)
    if suffix == ".txt":
        return read_txt_lines(path)
    raise SystemExit(f"Unsupported file type: {suffix}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")


def parse_raw_entries(path: Path) -> list[RawEntry]:
    entries: list[RawEntry] = []
    current: RawEntry | None = None

    for page, line in iter_lines(path):
        match = ENTRY_START_RE.match(line)
        if match and looks_like_word(match.group("word")):
            if current and is_valid_entry(current):
                entries.append(current)
            current = RawEntry(
                word=match.group("word").replace("*", "").strip(),
                phonetic=match.group("phonetic").strip(),
                page=page,
            )
            trailing = (match.group("trailing") or "").strip()
            if trailing:
                current.lines.append(trailing)
            continue

        if current:
            current.lines.append(line)

    if current and is_valid_entry(current):
        entries.append(current)

    deduped: dict[str, RawEntry] = {}
    for entry in entries:
        key = entry.word.lower()
        if key not in deduped or len(entry.lines) > len(deduped[key].lines):
            deduped[key] = entry
    return list(deduped.values())


def looks_like_word(word: str) -> bool:
    word = word.replace("*", "").strip()
    if len(word) < 2 or len(word) > 42:
        return False
    if any(char.isdigit() for char in word):
        return False
    return bool(re.fullmatch(r"[A-Za-z][A-Za-z'’.\-\s]*", word))


def is_valid_entry(entry: RawEntry) -> bool:
    joined = " ".join(entry.lines[:4])
    return bool(POS_RE.search(joined)) and any(CJK_RE.search(line) for line in entry.lines[:8])


def consume_marker_blocks(lines: list[str]) -> dict[str, list[str]]:
    blocks: dict[str, list[str]] = {}
    current_key = "definition"
    blocks[current_key] = []

    for line in lines:
        marker = MARKER_RE.match(line)
        if marker:
            current_key = marker.group(1)
            content = MARKER_RE.sub("", line).strip()
            blocks.setdefault(current_key, [])
            if content:
                blocks[current_key].append(content)
        else:
            blocks.setdefault(current_key, []).append(line)
    return blocks


def parse_definition(lines: list[str]) -> tuple[list[str], str]:
    if not lines:
        return ["unknown"], ""

    first = lines[0]
    match = POS_RE.match(first)
    if not match:
        return ["unknown"], cleanup_chinese(" ".join(lines[:2]))

    pos = normalize_pos(match.group("pos"))
    body_parts = [match.group("body").strip()]
    for line in lines[1:]:
        if MARKER_RE.match(line):
            break
        if POS_RE.match(line):
            break
        body_parts.append(line)
    return pos, cleanup_chinese(" ".join(body_parts))


def normalize_pos(pos_text: str) -> list[str]:
    raw_parts = re.split(r"[/、]", pos_text.replace("．", "."))
    mapping = {
        "n": "noun",
        "v": "verb",
        "vt": "verb",
        "vi": "verb",
        "adj": "adjective",
        "adv": "adverb",
        "prep": "preposition",
        "conj": "conjunction",
        "pron": "pronoun",
        "num": "number",
        "int": "interjection",
    }
    result = []
    for raw in raw_parts:
        key = raw.strip().strip(".").lower()
        if key in mapping and mapping[key] not in result:
            result.append(mapping[key])
    return result or ["unknown"]


def cleanup_chinese(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([；，。])", r"\1", text)
    return text[:220]


def parse_collocations(blocks: dict[str, list[str]]) -> list[str]:
    text = " ".join(blocks.get("搭", []))
    if not text:
        return []
    parts = re.split(r"[；;，,]", text)
    result = []
    for part in parts:
        part = re.sub(r"\s+", " ", part).strip(" .。")
        if not part:
            continue
        if CJK_RE.search(part) and not re.search(r"[A-Za-z]", part):
            continue
        result.append(part[:90])
    return dedupe(result)[:6]


def parse_synonyms(blocks: dict[str, list[str]]) -> list[str]:
    text = " ".join(blocks.get("同", []))
    if not text:
        return []
    text = re.sub(r"同义词?", "", text)
    parts = re.split(r"[,，;；/、]", text)
    return dedupe([p.strip(" .。") for p in parts if re.search(r"[A-Za-z]", p)])[:8]


def parse_word_family(blocks: dict[str, list[str]], word: str) -> list[str]:
    text = " ".join(blocks.get("派", []))
    candidates = re.findall(r"\b[A-Za-z][A-Za-z'’.\-]{2,}\b", text)
    family = [word, *candidates]
    return dedupe(family)[:8]


def parse_examples(blocks: dict[str, list[str]], word: str) -> list[dict]:
    example_text = " ".join(blocks.get("例", []))
    if not example_text:
        return []

    split_index = None
    for match in CJK_RE.finditer(example_text):
        prefix = example_text[: match.start()]
        if len(prefix) > 12 and re.search(r"[A-Za-z]", prefix):
            split_index = match.start()
            break

    if split_index is None:
        sentence = example_text.strip()
        translation = ""
    else:
        sentence = example_text[:split_index].strip()
        translation = example_text[split_index:].strip()

    sentence = re.sub(r"\s+", " ", sentence).strip()
    translation = re.sub(r"\s+", " ", translation).strip()
    if len(sentence) < 8:
        return []
    return [
        {
            "sentence": sentence[:260],
            "translation": translation[:260] if translation else "",
            "context": infer_context(sentence + " " + translation),
            "targetWord": word,
        }
    ]


def infer_context(text: str) -> str:
    lower = text.lower()
    if any(key in lower for key in ["listen", "hear", "interview", "conversation", "appointment", "reservation"]):
        return "listening"
    return "reading"


def infer_topics(text: str) -> list[str]:
    lower = text.lower()
    cjk = text
    topics = []
    rules = {
        "environment": ["pollution", "climate", "soil", "rainfall", "wildlife", "环境", "污染", "气候"],
        "education": ["student", "school", "university", "class", "course", "teacher", "学生", "大学", "课程"],
        "technology": ["computer", "electronic", "technology", "battery", "device", "技术", "电子"],
        "health": ["disease", "health", "wound", "doctor", "drug", "smoking", "疾病", "健康"],
        "business": ["market", "industry", "tourist", "account", "money", "business", "市场", "工业"],
        "government": ["government", "law", "legal", "king", "political", "政府", "法律"],
    }
    for topic, keywords in rules.items():
        if any(keyword in lower or keyword in cjk for keyword in keywords):
            topics.append(topic)
    return topics or ["general_academic"]


def infer_cefr(word: str, meaning: str) -> str:
    if len(word) <= 5:
        return "B1"
    if len(word) >= 12 or "学术" in meaning:
        return "C1"
    return "B2"


def build_listening_risk(word: str, pos: list[str]) -> dict:
    spelling_risk = len(word) >= 9 or bool(re.search(r"([a-z])\1", word.lower())) or "-" in word
    plural_risk = "noun" in pos
    wrong = []
    if re.search(r"([a-z])\1", word.lower()):
        wrong.append(re.sub(r"([a-z])\1", r"\1", word.lower(), count=1))
    return {
        "spellingRisk": spelling_risk,
        "homophoneRisk": False,
        "weakFormRisk": False,
        "pluralRisk": plural_risk,
        "commonWrongSpellings": dedupe(wrong)[:3],
    }


def to_vocabulary_item(entry: RawEntry) -> dict:
    blocks = consume_marker_blocks(entry.lines)
    pos, meaning = parse_definition(blocks.get("definition", []))
    examples = parse_examples(blocks, entry.word)
    collocations = parse_collocations(blocks)
    synonyms = parse_synonyms(blocks)
    searchable = " ".join([entry.word, meaning, " ".join(collocations), " ".join(x.get("sentence", "") for x in examples)])
    topics = infer_topics(searchable)
    listening_risk = build_listening_risk(entry.word, pos)
    source_layers = ["academic_word_list"]
    if topics != ["general_academic"]:
        source_layers.insert(0, "topic_vocabulary")
    if collocations:
        source_layers.append("collocation")
    if listening_risk["spellingRisk"]:
        source_layers.append("listening_survival")

    skill_tags = ["reading"]
    if listening_risk["spellingRisk"] or "listening" in [ex.get("context") for ex in examples]:
        skill_tags.append("listening")

    return {
        "id": "book_" + slugify(entry.word),
        "word": entry.word,
        "partOfSpeech": pos,
        "chineseMeaning": meaning,
        "englishDefinition": "",
        "cefrLevel": infer_cefr(entry.word, meaning),
        "topicTags": topics,
        "skillTags": skill_tags,
        "sourceLayers": dedupe(source_layers),
        "examples": examples,
        "synonyms": synonyms,
        "antonyms": [],
        "collocations": collocations,
        "wordFamily": parse_word_family(blocks, entry.word),
        "commonMistakes": listening_risk.get("commonWrongSpellings", []),
        "listeningRisk": listening_risk,
        "privateSource": {
            "type": "local_ebook",
            "page": entry.page,
        },
    }


def slugify(word: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", word.lower()).strip("_")


def dedupe(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        cleaned = item.strip()
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            result.append(cleaned)
    return result


def write_output(items: list[dict], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "metadata": {
            "source": "private local ebook",
            "count": len(items),
            "generatedBy": "scripts/import-vocab-book.py",
            "note": "For personal local study only. Do not publish this generated private dataset without rights clearance.",
        },
        "items": items,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a local IELTS vocabulary ebook.")
    parser.add_argument("--input", help="Path to PDF/TXT. Defaults to largest supported file in private/raw.")
    parser.add_argument("--output", default=str(OUTPUT_PATH), help="Output JSON path.")
    parser.add_argument("--limit", type=int, default=0, help="Optional maximum number of entries for testing.")
    args = parser.parse_args()

    input_path = choose_input_file(args.input)
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = ROOT / output_path

    raw_entries = parse_raw_entries(input_path)
    items = [to_vocabulary_item(entry) for entry in raw_entries]
    items = [item for item in items if item["word"] and item["chineseMeaning"]]
    items.sort(key=lambda item: item["word"].lower())
    if args.limit:
        items = items[: args.limit]

    write_output(items, output_path)
    print(f"[OK] Imported {len(items)} vocabulary items")
    print(f"[OK] Source: {input_path}")
    print(f"[OK] Output: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
