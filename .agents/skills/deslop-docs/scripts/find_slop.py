#!/usr/bin/env python3
"""Flag likely AI filler in Markdown files and code comments.

Usage: find_slop.py [paths...]   (defaults to the current directory)
Output: path:line: [rule] text    Exit code 1 if anything was flagged.
"""
import os
import re
import sys

SKIP_DIRS = {".git", "node_modules", "dist", "coverage", "build", ".venv", "__pycache__"}
DOC_EXT = {".md", ".mdx", ".rst", ".txt"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".rs", ".java",
            ".kt", ".swift", ".c", ".h", ".cpp", ".cs", ".rb", ".sh", ".css", ".glsl"}

WORDS = [
    "comprehensive", "robust", "seamless(?:ly)?", "powerful", "cutting-edge",
    "state-of-the-art", "leverag(?:e|es|ing)", "utiliz(?:e|es|ing)", "elevate",
    "delve", "crucial", "vital", "effortless(?:ly)?", "best-in-class",
    "world-class", "supercharge", "unlock", "empower", "streamline",
    "meticulous(?:ly)?", "holistic", "game-chang(?:er|ing)", "blazing(?:ly)? fast",
]
PHRASES = [
    r"it'?s worth noting", r"it is important to note", r"in order to",
    r"this (?:document|section|file|guide) (?:outlines|describes|provides)",
    r"in this (?:section|guide|document),? (?:we|you) will", r"in summary",
    r"by following these", r"rest assured", r"whether you'?re",
    r"\bsimply\b", r"\beasily\b", r"plays a (?:key|crucial|vital) role",
    r"is responsible for", r"a wide (?:range|variety) of", r"various edge cases",
    r"(?:updated|changed|modified|new:) (?:to|the)\b",
]
RULES = [("hype", re.compile(r"\b(?:%s)\b" % "|".join(WORDS), re.I)),
         ("filler", re.compile("|".join(PHRASES), re.I)),
         ("emoji", re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2705]"))]

# Comment that just names the next construct: "// Constructor", "# Imports".
RESTATE = re.compile(r"^(?:imports?|constructor|getters?|setters?|helpers?|"
                     r"constants?|variables?|main function|return(?: result)?|"
                     r"initiali[sz]e(?: variables)?|increment \w+)\.?$", re.I)
BANNER = re.compile(r"^[=\-*#/~]{5,}|[=\-*#~]{5,}$")
COMMENT = re.compile(r"^\s*(?://+|#(?!!)|/\*+|\*(?!/)|--)\s?(.*?)\s*(?:\*/)?$")


def comment_text(line, ext):
    if ext == ".py" and line.strip().startswith(('"""', "'''")):
        return line.strip().strip("\"'")
    m = COMMENT.match(line)
    if not m:
        return None
    if ext not in {".py", ".sh", ".rb"} and line.lstrip().startswith("#"):
        return None  # e.g. CSS ids, C preprocessor
    return m.group(1)


def scan(path):
    ext = os.path.splitext(path)[1].lower()
    is_doc = ext in DOC_EXT
    if not is_doc and ext not in CODE_EXT:
        return []
    hits = []
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
    except (UnicodeDecodeError, OSError):
        return []
    in_fence = False
    for n, raw in enumerate(lines, 1):
        line = raw.rstrip("\n")
        if is_doc:
            if line.lstrip().startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            text = line
        else:
            text = comment_text(line, ext)
            if text is None:
                continue
            if RESTATE.match(text.strip()):
                hits.append((n, "restates-code", line.strip()))
            elif BANNER.search(text.strip()):
                hits.append((n, "banner", line.strip()))
        for name, rx in RULES:
            if rx.search(text):
                hits.append((n, name, line.strip()))
                break
    return hits


def walk(paths):
    for p in paths:
        if os.path.isfile(p):
            yield p
            continue
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                yield os.path.join(root, f)


def main():
    total = 0
    for path in walk(sys.argv[1:] or ["."]):
        for n, rule, text in scan(path):
            print(f"{path}:{n}: [{rule}] {text[:140]}")
            total += 1
    print(f"\n{total} hit(s)", file=sys.stderr)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
