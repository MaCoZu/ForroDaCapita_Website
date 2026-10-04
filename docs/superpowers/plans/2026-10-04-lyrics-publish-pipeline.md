# Lyrics Publish Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ForroLyrics/songs/finished/` the single source of truth for published lyrics, with an opt-in, validated, one-way `publish` command that projects songs into `ForroDaCapita/public/lyrics/` and refuses to overwrite content it cannot account for.

**Architecture:** One canonical draft-07 JSON Schema lives in ForroLyrics and is vendored into the website by the publish command itself. `validate.py` enforces the schema plus cross-field rules; `publish.py` copies archive bytes verbatim (minus the `publish:` line, plus a generated header) into the site, tracked by a manifest of sha256 hashes that turns a hand-edited site file into a hard abort instead of silent data loss. The website validates every lyrics file with ajv inside its `build` script, so a bad projection fails the Vercel build.

**Tech Stack:** Python 3.13, uv, typer, PyYAML, jsonschema (draft-07), pytest · Node 22, Astro 7, ajv, js-yaml, node:test

**Spec:** `docs/superpowers/specs/2026-10-04-lyrics-publish-pipeline-design.md` (ForroDaCapita repo, commit `2112b95`)

**Working directories:** both repos are used directly, no worktree. ForroLyrics' `songs/finished/` is mid-refactor with uncommitted changes (a deleted Fagner file, two untracked Venâncio files), and the migration in Chunk 4 must run against that real state.

**Phase gates:** Chunk 1 → Chunk 2 → Chunk 3 are code-only and safe to land as they are finished. Chunk 4 is the real migration: it touches tracked site lyrics and the dirty archive, so stop after each of its steps and show the operator the diff before continuing.

---

## Chunk 1: Canonical schema and validation

## File Structure (whole plan)

**ForroLyrics** (`/home/mz/code/ForroLyrics`)

- `schemas/song.schema.json` — canonical draft-07 schema, the single definition of a song's shape
- `forrolyrics/validate.py` — schema validation + cross-field rules R1–R4, returns `Issue` lists
- `forrolyrics/publish.py` — projection, manifest, phase A/B/C orchestration, `publish()` and `check()`
- `forrolyrics/cli.py` — adds the `publish` subcommand
- `pyproject.toml` — declares the `jsonschema` dependency
- `tests/test_validate.py` — schema and cross-field rule tests
- `tests/test_publish.py` — projection, manifest, and end-to-end publish tests
- `.vscode/settings.json` — points the YAML extension at the canonical schema
- `.vscode/extensions.json` — recommends Red Hat YAML
- `README.md` — documents the publish workflow

**ForroDaCapita** (`/home/mz/code/Websites/ForroDaCapita`)

- `src/schemas/song.schema.json` — vendored copy, written by publish, never hand-edited
- `scripts/check-lyrics.mjs` — ajv validation of every file in `public/lyrics/`, wired into `build`
- `tests/lyrics-schema.test.mjs` — node:test coverage for the gate
- `src/integrations/lyrics.js` — build-time reader, fails loudly instead of writing an empty map
- `package.json` — `check:lyrics`, `test`, ajv dependency, build gate
- `src/pages/README-lyrics.md` — drops the marker-parity rule, documents the one-way flow
- `.vscode/settings.json` — points the YAML extension at the vendored schema
- `.vscode/extensions.json` — recommends Red Hat YAML
- `public/lyrics/*.yaml`, `songs/.published.json` — touched only by Chunk 4

Responsibilities are split one per file: schema shape (`schemas/`), rules (`validate.py`), publishing (`publish.py`), site gate (`check-lyrics.mjs`). Nothing holds two of those.

---

### Task 1: Canonical schema plus a `jsonschema` dependency

**Files:**
- Create: `/home/mz/code/ForroLyrics/schemas/song.schema.json`
- Create: `/home/mz/code/ForroLyrics/forrolyrics/validate.py`
- Create: `/home/mz/code/ForroLyrics/tests/test_validate.py`
- Modify: `/home/mz/code/ForroLyrics/pyproject.toml` (dependencies list)

- [ ] **Step 1: Write the failing test**

Create `/home/mz/code/ForroLyrics/tests/test_validate.py`:

```python
"""Tests for forrolyrics.validate — schema and cross-field rules."""

from __future__ import annotations

from pathlib import Path

import yaml
from jsonschema import Draft7Validator

from forrolyrics import validate

ARCHIVE_DIR = Path(__file__).resolve().parent.parent / "songs" / "finished"


def _song(**overrides):
    doc = {
        "title": "Asa Branca",
        "artist": "Luiz Gonzaga",
        "languages": [
            {
                "code": "pt",
                "name": "Português",
                "lines": "Quando olhei a terra\nE perguntei",
            },
            {
                "code": "en",
                "name": "English",
                "lines": "When I saw the land\nAnd I asked",
            },
        ],
        "footnotes": [{"id": 1, "term": "judiação", "explanation_en": "hardship"}],
    }
    doc.update(overrides)
    return doc


def test_schema_is_valid_draft7():
    Draft7Validator.check_schema(validate.load_schema())


def test_every_archived_song_validates():
    files = sorted(ARCHIVE_DIR.glob("*.yaml"))
    assert files, "no archived songs found — the guard would be vacuous"
    for path in files:
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert validate.validate_song(doc, filename=path.name) == []


def test_missing_title_is_rejected():
    issues = validate.validate_song(_song(title=""), filename="x.yaml")
    assert any("title" in issue.path for issue in issues)


def test_unknown_top_level_key_is_rejected():
    issues = validate.validate_song(_song(surprise="x"), filename="x.yaml")
    assert issues
    assert any("surprise" in issue.message for issue in issues)


def test_null_pdf_url_is_accepted():
    assert validate.validate_song(_song(pdf_url=None), filename="x.yaml") == []
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_validate.py -v`

Expected: collection error, `ModuleNotFoundError: No module named 'forrolyrics.validate'`

- [ ] **Step 3: Declare the dependency and install it**

In `/home/mz/code/ForroLyrics/pyproject.toml`, insert `"jsonschema>=4.26.0",` into `dependencies` immediately after the `beautifulsoup4` entry so the list stays alphabetical. Do not touch the `beautifulsoup4` line itself.

Run: `cd /home/mz/code/ForroLyrics && uv sync`

Expected: `jsonschema` and its deps resolved and installed; no other package removed.

- [ ] **Step 4: Write the canonical schema**

Run: `mkdir -p /home/mz/code/ForroLyrics/schemas`

Create `/home/mz/code/ForroLyrics/schemas/song.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://forrolyrics.dev/schemas/song.schema.json",
  "title": "ForroLyrics song",
  "description": "A single song translation: metadata, one or more language versions, and footnotes. This schema is canonical in ForroLyrics and vendored into ForroDaCapita by 'forrolyrics publish'.",
  "type": "object",
  "additionalProperties": false,
  "required": ["title", "artist", "languages"],
  "properties": {
    "title": {
      "description": "Song title, shared across languages.",
      "type": "string",
      "minLength": 1
    },
    "artist": {
      "description": "Performing artist or ensemble, as credited.",
      "type": "string",
      "minLength": 1
    },
    "description": {
      "description": "Free-form note about the song, shown on the site.",
      "type": "string"
    },
    "pdf_url": {
      "description": "Link to a PDF of the original lyrics. Empty means none.",
      "type": ["string", "null"]
    },
    "intro": {
      "description": "Prose shown above the lyrics on the site.",
      "type": "string"
    },
    "publish": {
      "description": "Opt in to publication. Stripped from the published copy.",
      "type": "boolean"
    },
    "languages": {
      "description": "One entry per language version, in display order.",
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "name", "lines"],
        "properties": {
          "code": {
            "description": "Short language tag used in URLs and styles.",
            "type": "string",
            "pattern": "^[a-z]{2,3}$"
          },
          "name": {
            "description": "Human-readable language name.",
            "type": "string",
            "minLength": 1
          },
          "lines": {
            "description": "The verse text, newline separated.",
            "type": "string",
            "minLength": 1
          },
          "width": {
            "description": "Optional typographic width hint for rendering.",
            "type": "number",
            "minimum": 0.5,
            "maximum": 3
          }
        }
      }
    },
    "footnotes": {
      "description": "Footnote definitions referenced from lines as [n].",
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "term", "explanation_en"],
        "properties": {
          "id": {
            "type": "integer",
            "minimum": 1
          },
          "term": {
            "type": "string",
            "minLength": 1
          },
          "explanation_en": {
            "type": "string",
            "minLength": 1
          },
          "explanation_de": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

- [ ] **Step 5: Write `validate.py` with schema validation only**

Create `/home/mz/code/ForroLyrics/forrolyrics/validate.py`:

```python
"""Validation for song YAML documents.

`validate_song` returns every problem it finds instead of raising on the first,
so callers can report all issues for a file in one pass.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "schemas" / "song.schema.json"


@dataclass(frozen=True)
class Issue:
    path: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


@lru_cache(maxsize=1)
def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _schema_issues(doc: Any) -> list[Issue]:
    validator = Draft7Validator(load_schema())
    errors = sorted(
        validator.iter_errors(doc),
        key=lambda err: [str(part) for part in err.absolute_path],
    )
    issues = []
    for error in errors:
        path = "/".join(str(part) for part in error.absolute_path) or "<root>"
        issues.append(Issue(path, error.message))
    return issues


def validate_song(doc: Any, *, filename: str = "<song>") -> list[Issue]:
    """Return schema violations for a song document, ordered by path."""
    return _schema_issues(doc)
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_validate.py -v`

Expected: 5 passed.

- [ ] **Step 7: Commit**

```bash
cd /home/mz/code/ForroLyrics
git add pyproject.toml uv.lock schemas/song.schema.json forrolyrics/validate.py tests/test_validate.py
git commit -m "feat(validate): add canonical song schema and draft-07 validation"
```

### Task 2: Cross-field rules R1–R4

The schema cannot express these, so `validate.py` checks them after the schema passes. Footnote markers are `[n]` where `n` is digits only, so a section header like `[Canto I]` is not a marker.

**Files:**
- Modify: `/home/mz/code/ForroLyrics/forrolyrics/validate.py`
- Modify: `/home/mz/code/ForroLyrics/tests/test_validate.py`

- [ ] **Step 1: Write the failing tests**

Append to `/home/mz/code/ForroLyrics/tests/test_validate.py`:

```python
def test_unequal_line_counts_are_rejected():
    doc = _song()
    doc["languages"][0]["lines"] = "only one line"
    issues = validate.validate_song(doc, filename="x.yaml")
    assert any("line count" in issue.message for issue in issues)


def test_resolvable_markers_are_accepted():
    doc = _song()
    lines = "Quando olhei a terra [1]\nE perguntei"
    doc["languages"][0]["lines"] = lines
    doc["languages"][1]["lines"] = lines
    assert validate.validate_song(doc, filename="x.yaml") == []


def test_section_headers_are_not_markers():
    doc = _song()
    lines = "[Canto I]\nQuando olhei a terra"
    doc["languages"][0]["lines"] = lines
    doc["languages"][1]["lines"] = lines
    assert validate.validate_song(doc, filename="x.yaml") == []


def test_unresolvable_marker_is_rejected():
    doc = _song()
    lines = "Quando olhei a terra [9]\nE perguntei"
    doc["languages"][0]["lines"] = lines
    doc["languages"][1]["lines"] = lines
    issues = validate.validate_song(doc, filename="x.yaml")
    assert any("[9]" in issue.message for issue in issues)


def test_duplicate_footnote_ids_are_rejected():
    doc = _song(
        footnotes=[
            {"id": 1, "term": "a", "explanation_en": "x"},
            {"id": 1, "term": "b", "explanation_en": "y"},
        ]
    )
    issues = validate.validate_song(doc, filename="x.yaml")
    assert any("duplicate footnote id" in issue.message for issue in issues)


def test_duplicate_language_codes_are_rejected():
    doc = _song()
    doc["languages"][1]["code"] = "pt"
    issues = validate.validate_song(doc, filename="x.yaml")
    assert any("duplicate language code" in issue.message for issue in issues)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_validate.py -v`

Expected: 4 failures — `test_unequal_line_counts_are_rejected`, `test_unresolvable_marker_is_rejected`, `test_duplicate_footnote_ids_are_rejected`, and `test_duplicate_language_codes_are_rejected` all report no issues. `test_resolvable_markers_are_accepted` and `test_section_headers_are_not_markers` already pass.

- [ ] **Step 3: Add the cross-field checks**

In `/home/mz/code/ForroLyrics/forrolyrics/validate.py`, add `import re` after `import json`, add the module constant after `SCHEMA_PATH`:

```python
_MARKER = re.compile(r"\[(\d+)\]")
```

Then replace the `validate_song` function with the schema-then-cross-field version and add the helper above it:

```python
def _cross_field_issues(doc: dict[str, Any]) -> list[Issue]:
    issues: list[Issue] = []
    languages = doc["languages"]

    counts = {lang["code"]: len(lang["lines"].splitlines()) for lang in languages}
    if len(set(counts.values())) > 1:
        detail = ", ".join(f"{code}={count}" for code, count in counts.items())
        issues.append(
            Issue("languages", f"every language must have the same line count ({detail})")
        )

    footnote_ids = [footnote["id"] for footnote in doc.get("footnotes", [])]
    repeated_ids = sorted({i for i in footnote_ids if footnote_ids.count(i) > 1})
    if repeated_ids:
        issues.append(
            Issue(
                "footnotes",
                f"duplicate footnote id(s): {', '.join(str(i) for i in repeated_ids)}",
            )
        )

    known = set(footnote_ids)
    for index, language in enumerate(languages):
        markers = sorted({int(m) for m in _MARKER.findall(language["lines"])})
        for marker in markers:
            if marker not in known:
                issues.append(
                    Issue(
                        f"languages/{index}/lines",
                        f"footnote marker [{marker}] has no matching footnote",
                    )
                )

    codes = [language["code"] for language in languages]
    repeated_codes = sorted({code for code in codes if codes.count(code) > 1})
    if repeated_codes:
        issues.append(
            Issue("languages", f"duplicate language code(s): {', '.join(repeated_codes)}")
        )
    return issues


def validate_song(doc: Any, *, filename: str = "<song>") -> list[Issue]:
    """Return every schema and cross-field problem in a song document."""
    schema_issues = _schema_issues(doc)
    if schema_issues:
        return schema_issues
    return _cross_field_issues(doc)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_validate.py -v`

Expected: 11 passed. `test_every_archived_song_validates` is the important one: the four real archive files must still pass all four cross-field rules.

- [ ] **Step 5: Commit**

```bash
cd /home/mz/code/ForroLyrics
git add forrolyrics/validate.py tests/test_validate.py
git commit -m "feat(validate): enforce line-count, marker, and uniqueness rules"
```

## Chunk 2: Publish engine, CLI, and ForroLyrics docs

### Task 4: Projection, atomic writes, and the manifest

**Files:**
- Create: `/home/mz/code/ForroLyrics/forrolyrics/publish.py`
- Create: `/home/mz/code/ForroLyrics/tests/test_publish.py`

- [ ] **Step 1: Write the failing tests**

Create `/home/mz/code/ForroLyrics/tests/test_publish.py` with this content:

```python
"""Tests for forrolyrics.publish — projection, manifest, and the write phases."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from forrolyrics import publish

SONG_NAME = "Asa Branca - Luiz Gonzaga.yaml"
GOOD_YAML = """\
title: Asa Branca
artist: Luiz Gonzaga
publish: true
languages:
  - code: pt
    name: Português
    lines: |
      Quando olhei a terra
      E perguntei
  - code: en
    name: English
    lines: |
      When I saw the land
      And I asked
footnotes:
  - id: 1
    term: judiação
    explanation_en: hardship
"""


def _archive(tmp_path: Path, *files: tuple[str, str]) -> Path:
    archive = tmp_path / "songs" / "finished"
    archive.mkdir(parents=True, exist_ok=True)
    for name, text in files:
        (archive / name).write_text(text, encoding="utf-8")
    return archive


def _site(tmp_path: Path) -> Path:
    site = tmp_path / "site"
    (site / "public" / "lyrics").mkdir(parents=True)
    (site / "package.json").write_text("{}\n", encoding="utf-8")
    return site


def _manifest_path(tmp_path: Path) -> Path:
    return tmp_path / "songs" / ".published.json"


def _canonical_schema(tmp_path: Path) -> Path:
    path = tmp_path / "canonical.schema.json"
    path.write_text('{"type": "object"}\n', encoding="utf-8")
    return path


def _run(tmp_path, site, archive, *, canonical=None, **kwargs):
    return publish.publish(
        site_root=site,
        archive_dir=archive,
        manifest_path=_manifest_path(tmp_path),
        canonical_schema=canonical or _canonical_schema(tmp_path),
        **kwargs,
    )


def test_project_strips_publish_line_and_prepends_header():
    out = publish.project(SONG_NAME, GOOD_YAML.encode("utf-8"))
    assert out.startswith("# Generated by 'forrolyrics publish'")
    assert "publish:" not in out
    assert out.endswith("title: Asa Branca\nartist: Luiz Gonzaga\n" + GOOD_YAML.split("publish: true\n", 1)[1])


def test_load_manifest_missing_file_is_empty(tmp_path):
    assert publish.load_manifest(tmp_path / "nope.json") == {"version": 1, "songs": {}}


def test_manifest_round_trip_preserves_unicode(tmp_path):
    path = _manifest_path(tmp_path)
    publish.save_manifest(
        {"version": 1, "songs": {SONG_NAME: {"sha256": "x", "source_sha256": "y"}}},
        path,
    )
    assert json.loads(path.read_text(encoding="utf-8"))["songs"][SONG_NAME]["sha256"] == "x"
    assert publish.load_manifest(path)["songs"][SONG_NAME]["source_sha256"] == "y"


def test_resolve_site_root_requires_a_site_checkout(tmp_path):
    with pytest.raises(publish.UsageError):
        publish.resolve_site_root(tmp_path)


def test_resolve_site_root_accepts_a_site_checkout(tmp_path):
    site = _site(tmp_path)
    assert publish.resolve_site_root(site) == site
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_publish.py -v`

Expected: collection error, `ModuleNotFoundError: No module named 'forrolyrics.publish'`

- [ ] **Step 3: Write the module skeleton with projection and manifest I/O**

Create `/home/mz/code/ForroLyrics/forrolyrics/publish.py`:

```python
"""One-way publication of finished songs into the ForroDaCapita website.

`songs/finished/` is the source of truth. A published song is a verbatim
projection of its archive file — the archive bytes minus the `publish:` line,
plus a generated header — recorded in a manifest of sha256 hashes so a
hand-edited site file aborts the run instead of being silently overwritten.
"""

from __future__ import annotations

import difflib
import hashlib
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from forrolyrics.validate import validate_song

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE_DIR = ROOT / "songs" / "finished"
MANIFEST_PATH = ROOT / "songs" / ".published.json"
CANONICAL_SCHEMA = ROOT / "schemas" / "song.schema.json"
DEFAULT_SITE_ROOT = ROOT.parent / "Websites" / "ForroDaCapita"

SITE_LYRICS_DIR = Path("public") / "lyrics"
SITE_SCHEMA_PATH = Path("src") / "schemas" / "song.schema.json"

PUBLISH_LINE = re.compile(r"^publish\s*:.*(?:\n|$)", re.MULTILINE)
HEADER = (
    "# Generated by 'forrolyrics publish' from songs/finished/{name}.\n"
    "# Edit the archive copy and re-run the command; do not edit this file.\n"
)
MANIFEST_VERSION = 1


class PublishError(RuntimeError):
    """A run that must not write anything, with an optional per-song diff."""

    def __init__(self, message: str, diffs: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.diffs = diffs or {}


class UsageError(PublishError):
    """An unusable flag combination or site root."""


@dataclass(frozen=True)
class Drift:
    kind: str
    name: str
    detail: str


@dataclass
class Result:
    written: list[str] = field(default_factory=list)
    unchanged: list[str] = field(default_factory=list)
    restored: list[str] = field(default_factory=list)
    pruned: list[str] = field(default_factory=list)
    removed_orphans: list[str] = field(default_factory=list)
    stale: list[str] = field(default_factory=list)
    hand_edited: list[str] = field(default_factory=list)
    adopted: list[str] = field(default_factory=list)
    vendored_schema: bool = False
    warnings: list[str] = field(default_factory=list)
    drift: list[Drift] = field(default_factory=list)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def strip_publish_line(text: str) -> str:
    return PUBLISH_LINE.sub("", text, count=1)


def project(name: str, archive_bytes: bytes) -> str:
    """Return the exact text the site copy must hold for an archive file."""
    body = strip_publish_line(archive_bytes.decode("utf-8"))
    return HEADER.format(name=name) + body


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".publish-tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def load_manifest(path: Path | None = None) -> dict[str, Any]:
    target = Path(path) if path else MANIFEST_PATH
    if not target.exists():
        return {"version": MANIFEST_VERSION, "songs": {}}
    data = json.loads(target.read_text(encoding="utf-8"))
    data.setdefault("songs", {})
    return data


def save_manifest(manifest: dict[str, Any], path: Path | None = None) -> None:
    target = Path(path) if path else MANIFEST_PATH
    payload = json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True)
    atomic_write(target, (payload + "\n").encode("utf-8"))


def resolve_site_root(site_root: Path | None = None) -> Path:
    root = Path(site_root).expanduser() if site_root else DEFAULT_SITE_ROOT
    if not (root / "package.json").is_file() or not (root / SITE_LYRICS_DIR).is_dir():
        raise UsageError(f"not a ForroDaCapita checkout: {root}")
    return root
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_publish.py -v`

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
cd /home/mz/code/ForroLyrics
git add forrolyrics/publish.py tests/test_publish.py
git commit -m "feat(publish): add projection, atomic writes, and manifest I/O"
```

### Task 5: Classification and the phase A guards

**Files:**
- Modify: `/home/mz/code/ForroLyrics/forrolyrics/publish.py` (append)
- Modify: `/home/mz/code/ForroLyrics/tests/test_publish.py` (append)

- [ ] **Step 1: Write the failing tests**

Append to `/home/mz/code/ForroLyrics/tests/test_publish.py`:

```python
def test_song_without_publish_is_not_published(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML.replace("publish: true\n", "")))
    site = _site(tmp_path)

    result = _run(tmp_path, site, archive)

    assert result.written == []
    assert list((site / "public" / "lyrics").glob("*.yaml")) == []


def test_invalid_opted_in_song_blocks_every_write(tmp_path):
    broken = GOOD_YAML.replace("      E perguntei\n", "")
    archive = _archive(
        tmp_path,
        (SONG_NAME, GOOD_YAML),
        ("Broken - Artist.yaml", broken),
    )
    site = _site(tmp_path)

    with pytest.raises(publish.PublishError) as excinfo:
        _run(tmp_path, site, archive)

    assert "Broken - Artist.yaml" in str(excinfo.value)
    assert list((site / "public" / "lyrics").glob("*.yaml")) == []
    assert not _manifest_path(tmp_path).exists()


def test_archive_edit_republishes_over_an_untouched_site_copy(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)

    edited = GOOD_YAML.replace("      When I saw the land\n", "      When I saw the dry land\n")
    (archive / SONG_NAME).write_text(edited, encoding="utf-8")
    result = _run(tmp_path, site, archive)

    assert result.written == [SONG_NAME]
    published = (site / "public" / "lyrics" / SONG_NAME).read_text(encoding="utf-8")
    assert "When I saw the dry land" in published
    assert "publish:" not in published


def test_republishing_is_idempotent(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    first = (site / "public" / "lyrics" / SONG_NAME).read_bytes()

    result = _run(tmp_path, site, archive)

    assert result.unchanged == [SONG_NAME]
    assert (site / "public" / "lyrics" / SONG_NAME).read_bytes() == first


def test_deleted_site_copy_is_restored(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    (site / "public" / "lyrics" / SONG_NAME).unlink()

    result = _run(tmp_path, site, archive)

    assert result.restored == [SONG_NAME]
    assert (site / "public" / "lyrics" / SONG_NAME).exists()


def test_hand_edited_site_copy_aborts_with_a_diff(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    site_copy = site / "public" / "lyrics" / SONG_NAME
    site_copy.write_text(
        site_copy.read_text(encoding="utf-8").replace("hardship", "a trial"),
        encoding="utf-8",
    )

    with pytest.raises(publish.PublishError) as excinfo:
        _run(tmp_path, site, archive)

    assert SONG_NAME in excinfo.value.diffs
    assert "hardship" in excinfo.value.diffs[SONG_NAME]
    assert "a trial" in (site_copy).read_text(encoding="utf-8")


def test_untracked_site_copy_requires_adopt(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    site_copy = site / "public" / "lyrics" / SONG_NAME
    site_copy.write_text("title: Something else\n", encoding="utf-8")

    with pytest.raises(publish.PublishError) as excinfo:
        _run(tmp_path, site, archive)

    assert SONG_NAME in str(excinfo.value)
    assert site_copy.read_text(encoding="utf-8") == "title: Something else\n"
    assert not _manifest_path(tmp_path).exists()


def test_adopt_records_a_hand_edited_site_copy_without_rewriting_it(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    site_copy = site / "public" / "lyrics" / SONG_NAME
    edited = site_copy.read_text(encoding="utf-8").replace("hardship", "a trial")
    site_copy.write_text(edited, encoding="utf-8")

    result = _run(tmp_path, site, archive, adopt=True)

    assert result.adopted == [SONG_NAME]
    assert result.written == []
    assert site_copy.read_text(encoding="utf-8") == edited
    record = publish.load_manifest(_manifest_path(tmp_path))["songs"][SONG_NAME]
    assert record["sha256"] == publish.sha256_hex(edited.encode("utf-8"))

    follow_up = _run(tmp_path, site, archive)

    assert follow_up.written == [SONG_NAME]
    assert "hardship" in site_copy.read_text(encoding="utf-8")


def test_opting_out_retains_the_site_copy(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    (archive / SONG_NAME).write_text(
        GOOD_YAML.replace("publish: true\n", ""), encoding="utf-8"
    )

    result = _run(tmp_path, site, archive)

    assert result.stale == [SONG_NAME]
    assert (site / "public" / "lyrics" / SONG_NAME).exists()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_publish.py -v`

Expected: failures — `publish()` does not exist (`AttributeError: module 'forrolyrics.publish' has no attribute 'publish'`).

- [ ] **Step 3: Append classification and analysis to `publish.py`**

Append to `/home/mz/code/ForroLyrics/forrolyrics/publish.py`:

```python
@dataclass(frozen=True)
class Entry:
    name: str
    state: str
    projection: str = ""


@dataclass
class Analysis:
    root: Path
    archive: Path
    site_dir: Path
    opted_in: list[str]
    entries: list[Entry]
    orphans: list[str]
    parse_errors: dict[str, str]
    schema_stale: bool
    records: dict[str, Any]


def read_archive(archive_dir: Path) -> tuple[dict[str, Any], dict[str, str]]:
    """Return parsed archive documents plus parse errors, keyed by filename."""
    docs: dict[str, Any] = {}
    errors: dict[str, str] = {}
    for path in sorted(archive_dir.glob("*.yaml")):
        try:
            doc = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as exc:
            errors[path.name] = str(exc).replace("\n", " ")
            continue
        if not isinstance(doc, dict):
            errors[path.name] = "top level is not a mapping"
            continue
        docs[path.name] = doc
    return docs, errors


def classify(
    name: str,
    record: dict[str, Any] | None,
    archive_dir: Path,
    site_dir: Path,
) -> Entry:
    """Decide one song's state. A missing manifest entry is not a conflict:
    it means the file predates the manifest, which is reported as `untracked`
    rather than treated as a hand edit."""
    archive = archive_dir / name
    site = site_dir / name
    if not archive.exists():
        return Entry(name, "stale" if site.exists() else "stale-absent")
    projection = project(name, archive.read_bytes())
    if not site.exists():
        return Entry(name, "restored", projection)
    current = site.read_text(encoding="utf-8")
    if record is None:
        return Entry(name, "unchanged" if current == projection else "untracked", projection)
    if record.get("sha256") != sha256_hex(current.encode("utf-8")):
        return Entry(name, "hand-edited", projection)
    return Entry(name, "unchanged" if current == projection else "written", projection)


def unified_diff(name: str, site_text: str, projection: str) -> str:
    return "".join(
        difflib.unified_diff(
            site_text.splitlines(keepends=True),
            projection.splitlines(keepends=True),
            fromfile=f"site/public/lyrics/{name}",
            tofile=f"archive/songs/finished/{name}",
        )
    )


def _validate_opted_in(opted_in: dict[str, Any]) -> None:
    failures = []
    for name, doc in sorted(opted_in.items()):
        failures.extend(f"{name}: {issue}" for issue in validate_song(doc, filename=name))
    if failures:
        raise PublishError(
            "validation failed; nothing was written:\n" + "\n".join(failures)
        )


def analyze(
    *,
    site_root: Path | None = None,
    archive_dir: Path | None = None,
    manifest_path: Path | None = None,
    canonical_schema: Path | None = None,
    adopt: bool = False,
) -> Analysis:
    """Read both sides and decide what each song's state is. Writes nothing."""
    archive = Path(archive_dir) if archive_dir else ARCHIVE_DIR
    manifest_file = Path(manifest_path) if manifest_path else MANIFEST_PATH
    schema_file = Path(canonical_schema) if canonical_schema else CANONICAL_SCHEMA
    if not archive.is_dir():
        raise UsageError(f"archive directory not found: {archive}")
    if not schema_file.is_file():
        raise UsageError(f"canonical schema not found: {schema_file}")
    root = resolve_site_root(site_root)
    site_dir = root / SITE_LYRICS_DIR

    docs, parse_errors = read_archive(archive)
    opted_in = {name: doc for name, doc in docs.items() if doc.get("publish") is True}
    _validate_opted_in(opted_in)

    records = load_manifest(manifest_file).get("songs", {})
    entries = [
        classify(name, records.get(name), archive, site_dir)
        for name in sorted(opted_in)
    ]
    for name in sorted(records):
        if name in opted_in:
            continue
        if (archive / name).exists():
            entries.append(Entry(name, "opted-out"))
        else:
            site = site_dir / name
            entries.append(Entry(name, "stale" if site.exists() else "stale-absent"))

    orphans = sorted(
        path.name
        for path in site_dir.glob("*.yaml")
        if path.name not in records and not (archive / path.name).exists()
    )
    vendored = root / SITE_SCHEMA_PATH
    schema_stale = (
        not vendored.exists() or vendored.read_bytes() != schema_file.read_bytes()
    )
    return Analysis(
        root=root,
        archive=archive,
        site_dir=site_dir,
        opted_in=sorted(opted_in),
        entries=entries,
        orphans=orphans,
        parse_errors=parse_errors,
        schema_stale=schema_stale,
        records=records,
    )
```

- [ ] **Step 4: Append `publish()` to `publish.py`**

Append to `/home/mz/code/ForroLyrics/forrolyrics/publish.py`:

```python
def publish(
    *,
    site_root: Path | None = None,
    dry_run: bool = False,
    prune: bool = False,
    remove_orphans: bool = False,
    adopt: bool = False,
    archive_dir: Path | None = None,
    manifest_path: Path | None = None,
    canonical_schema: Path | None = None,
) -> Result:
    """Project opted-in songs into the site repo, or write nothing at all."""
    if prune and remove_orphans:
        raise UsageError("--prune and --remove-orphans cannot be combined")
    analysis = analyze(
        site_root=site_root,
        archive_dir=archive_dir,
        manifest_path=manifest_path,
        canonical_schema=canonical_schema,
        adopt=adopt,
    )
    site_dir = analysis.site_dir
    archive = analysis.archive
    result = Result(
        warnings=[f"{n}: {m}" for n, m in sorted(analysis.parse_errors.items())]
    )

    untracked = [e for e in analysis.entries if e.state == "untracked"]
    if untracked and not adopt:
        raise PublishError(
            "these site copies have no manifest entry, so nothing knows where "
            "they came from. Delete them to have publish recreate them, or pass "
            "--adopt to record them exactly as they are:\n"
            + "\n".join(f"  {entry.name}" for entry in untracked)
        )

    conflicts = [e for e in analysis.entries if e.state == "hand-edited"]
    if conflicts and not adopt:
        diffs = {
            entry.name: unified_diff(
                entry.name,
                (site_dir / entry.name).read_text(encoding="utf-8"),
                entry.projection,
            )
            for entry in conflicts
        }
        raise PublishError(
            "a site copy no longer matches its manifest hash. Fold the edits back "
            "into songs/finished/ and re-run, or pass --adopt to record the site "
            "copy exactly as it is:\n"
            + "\n".join(f"  {name}" for name in diffs),
            diffs=diffs,
        )

    writes: list[tuple[Path, bytes]] = []
    deletes: list[Path] = []
    next_records = dict(analysis.records)

    for entry in analysis.entries:
        if entry.state == "hand-edited" or entry.state == "untracked":
            if adopt:
                current = (site_dir / entry.name).read_bytes()
                next_records[entry.name] = {
                    "source_sha256": sha256_hex(
                        strip_publish_line(
                            (archive / entry.name).read_text(encoding="utf-8")
                        ).encode("utf-8")
                    ),
                    "sha256": sha256_hex(current),
                    "published_at": utc_now(),
                }
                result.adopted.append(entry.name)
            else:
                result.hand_edited.append(entry.name)
            continue

        if entry.state == "stale-absent":
            next_records.pop(entry.name, None)

        if entry.state in ("written", "restored", "unchanged"):
            payload = entry.projection.encode("utf-8")
            writes.append((site_dir / entry.name, payload))
            new_sha = sha256_hex(payload)
            previous = next_records.get(entry.name)
            if not previous or previous.get("sha256") != new_sha:
                next_records[entry.name] = {
                    "source_sha256": sha256_hex(
                        strip_publish_line(
                            (archive / entry.name).read_text(encoding="utf-8")
                        ).encode("utf-8")
                    ),
                    "sha256": new_sha,
                    "published_at": utc_now(),
                }
            bucket = {
                "written": result.written,
                "restored": result.restored,
                "unchanged": result.unchanged,
            }[entry.state]
        else:
            bucket = result.stale
        bucket.append(entry.name)

    if prune:
        for entry in analysis.entries:
            if entry.state == "stale" and (site_dir / entry.name).exists():
                deletes.append(site_dir / entry.name)
                result.pruned.append(entry.name)
                next_records.pop(entry.name, None)
                if entry.name in result.stale:
                    result.stale.remove(entry.name)
    if remove_orphans:
        for name in analysis.orphans:
            deletes.append(site_dir / name)
            result.removed_orphans.append(name)
    result.vendored_schema = analysis.schema_stale

    if dry_run:
        return result

    for path, data in writes:
        atomic_write(path, data)
    for path in deletes:
        path.unlink()
    if analysis.schema_stale:
        atomic_write(
            analysis.root / SITE_SCHEMA_PATH,
            (Path(canonical_schema or CANONICAL_SCHEMA)).read_bytes(),
        )
    save_manifest(
        {"version": MANIFEST_VERSION, "songs": next_records},
        Path(manifest_path) if manifest_path else MANIFEST_PATH,
    )
    return result
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_publish.py -v`

Expected: 14 passed.

- [ ] **Step 6: Run the whole suite to confirm nothing regressed**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests -q`

Expected: all tests pass, no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/mz/code/ForroLyrics
git add forrolyrics/publish.py tests/test_publish.py
git commit -m "feat(publish): classify songs, guard phase A, write phase B"
```

### Task 6: Deletes, drift checking, and the CLI

**Files:**
- Modify: `/home/mz/code/ForroLyrics/forrolyrics/publish.py` (append `check()`)
- Modify: `/home/mz/code/ForroLyrics/forrolyrics/cli.py`
- Modify: `/home/mz/code/ForroLyrics/tests/test_publish.py` (append)
- Create: `/home/mz/code/ForroLyrics/tests/test_cli_publish.py`

- [ ] **Step 1: Write the failing tests for prune, orphans, and drift**

Append to `/home/mz/code/ForroLyrics/tests/test_publish.py`:

```python
def test_stale_site_copy_is_retained_until_pruned(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    (archive / SONG_NAME).unlink()

    retained = _run(tmp_path, site, archive)
    assert retained.stale == [SONG_NAME]
    assert (site / "public" / "lyrics" / SONG_NAME).exists()

    pruned = _run(tmp_path, site, archive, prune=True)
    assert pruned.pruned == [SONG_NAME]
    assert not (site / "public" / "lyrics" / SONG_NAME).exists()
    assert SONG_NAME not in publish.load_manifest(_manifest_path(tmp_path))["songs"]


def test_orphan_site_copy_is_retained_until_removed(tmp_path):
    archive = _archive(tmp_path)
    site = _site(tmp_path)
    orphan = site / "public" / "lyrics" / "Gone - Artist.yaml"
    orphan.write_text("title: Gone\n", encoding="utf-8")

    retained = _run(tmp_path, site, archive)
    assert retained.removed_orphans == []
    assert orphan.exists()

    removed = _run(tmp_path, site, archive, remove_orphans=True)
    assert removed.removed_orphans == ["Gone - Artist.yaml"]
    assert not orphan.exists()


def test_publish_vendors_the_canonical_schema(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    canonical = _canonical_schema(tmp_path)

    result = _run(tmp_path, site, archive, canonical=canonical)

    vendored = site / "src" / "schemas" / "song.schema.json"
    assert result.vendored_schema is True
    assert vendored.read_bytes() == canonical.read_bytes()
    assert _run(tmp_path, site, archive, canonical=canonical).vendored_schema is False


def test_check_is_clean_after_publishing(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)

    result = _check(tmp_path, site, archive)

    assert result.drift == []


def test_check_reports_an_unpublished_archive_edit(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    (archive / SONG_NAME).write_text(
        GOOD_YAML.replace("hardship", "hardship and trial"), encoding="utf-8"
    )

    drift = _check(tmp_path, site, archive)

    assert [d.kind for d in drift.drift] == ["source-changed"]
    assert drift.drift[0].name == SONG_NAME


def test_check_reports_a_hand_edited_site_copy(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    _run(tmp_path, site, archive)
    site_copy = site / "public" / "lyrics" / SONG_NAME
    site_copy.write_text(
        site_copy.read_text(encoding="utf-8") + "extra: line\n", encoding="utf-8"
    )

    drift = _check(tmp_path, site, archive)

    assert [d.kind for d in drift.drift] == ["site-edited"]


def test_check_reports_missing_site_copy_orphan_and_stale_schema(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    (site / "public" / "lyrics" / "Orphan - Artist.yaml").write_text(
        "title: Orphan\n", encoding="utf-8"
    )

    drift = _check(tmp_path, site, archive)

    kinds = sorted(d.kind for d in drift.drift)
    assert kinds == ["missing-site", "schema", "untracked"]


def test_check_reports_a_site_copy_with_no_manifest_entry(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)
    (site / "public" / "lyrics" / SONG_NAME).write_text(GOOD_YAML, encoding="utf-8")

    drift = _check(tmp_path, site, archive)

    assert any(item.kind == "untracked-site" for item in drift.drift)


def test_dry_run_writes_nothing(tmp_path):
    archive = _archive(tmp_path, (SONG_NAME, GOOD_YAML))
    site = _site(tmp_path)

    result = _run(tmp_path, site, archive, dry_run=True)

    assert result.written == [SONG_NAME]
    assert result.vendored_schema is True
    assert list((site / "public" / "lyrics").glob("*.yaml")) == []
    assert not _manifest_path(tmp_path).exists()
```

Also add the `_check` helper next to `_run` in the same file:

```python
def _check(tmp_path, site, archive):
    return publish.check(
        site_root=site,
        archive_dir=archive,
        manifest_path=_manifest_path(tmp_path),
        canonical_schema=_canonical_schema(tmp_path),
    )
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_publish.py -v`

Expected: failures — `AttributeError: module 'forrolyrics.publish' has no attribute 'check'`.

- [ ] **Step 3: Append `check()` to `publish.py`**

Append to `/home/mz/code/ForroLyrics/forrolyrics/publish.py`:

```python
def check(
    *,
    site_root: Path | None = None,
    archive_dir: Path | None = None,
    manifest_path: Path | None = None,
    canonical_schema: Path | None = None,
) -> Result:
    """Report drift between the archive, the site copies, and the manifest."""
    analysis = analyze(
        site_root=site_root,
        archive_dir=archive_dir,
        manifest_path=manifest_path,
        canonical_schema=canonical_schema,
    )
    result = Result(
        warnings=[f"{n}: {m}" for n, m in sorted(analysis.parse_errors.items())]
    )
    if analysis.schema_stale:
        result.drift.append(
            Drift(
                "schema",
                SITE_SCHEMA_PATH.as_posix(),
                "vendored schema is missing or out of date",
            )
        )
    for name, message in sorted(analysis.parse_errors.items()):
        result.drift.append(Drift("parse-error", name, message))
    for entry in analysis.entries:
        if entry.state == "restored":
            result.drift.append(
                Drift("missing-site", entry.name, "opted in but not published yet")
            )
        elif entry.state == "hand-edited":
            result.drift.append(
                Drift("site-edited", entry.name, "site copy does not match the manifest")
            )
        elif entry.state == "untracked":
            result.drift.append(
                Drift(
                    "untracked-site",
                    entry.name,
                    "site copy has no manifest entry; run publish or publish --adopt",
                )
            )
        elif entry.state == "written":
            result.drift.append(
                Drift("source-changed", entry.name, "archive changed since the last publish")
            )
        elif entry.state == "opted-out":
            result.drift.append(
                Drift("opted-out", entry.name, "no longer has publish: true; site copy kept")
            )
        elif entry.state == "stale":
            result.drift.append(
                Drift("stale", entry.name, "archive file is gone; site copy kept")
            )
    for name in analysis.orphans:
        result.drift.append(
            Drift("untracked", name, "site copy has neither an archive file nor a manifest entry")
        )
    return result
```

- [ ] **Step 4: Run the publish tests to verify they pass**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_publish.py -v`

Expected: 23 passed.

- [ ] **Step 5: Write the failing CLI tests**

First make `tests/` importable so the CLI test can reuse the fixtures from `test_publish.py`. Replace `/home/mz/code/ForroLyrics/tests/conftest.py` with:

```python
"""Pytest configuration for ForroLyrics tests."""

import sys
from pathlib import Path

# Add project root to Python path for all tests
sys.path.insert(0, str(Path(__file__).parent.parent))
# Add the tests directory so test modules can share fixtures with each other
sys.path.insert(0, str(Path(__file__).parent))
```

Then create `/home/mz/code/ForroLyrics/tests/test_cli_publish.py`:

```python
"""Tests for the `forrolyrics publish` command."""

from __future__ import annotations

from typer.testing import CliRunner

from forrolyrics import publish as publish_module
from forrolyrics.cli import app
from test_publish import GOOD_YAML, SONG_NAME

runner = CliRunner()


def _wire(monkeypatch, tmp_path, *files):
    archive = tmp_path / "songs" / "finished"
    archive.mkdir(parents=True)
    for name, text in files:
        (archive / name).write_text(text, encoding="utf-8")
    site = tmp_path / "site"
    (site / "public" / "lyrics").mkdir(parents=True)
    (site / "package.json").write_text("{}\n", encoding="utf-8")
    monkeypatch.setattr(publish_module, "ARCHIVE_DIR", archive)
    monkeypatch.setattr(
        publish_module, "MANIFEST_PATH", tmp_path / "songs" / ".published.json"
    )
    return site


def test_publish_writes_the_site_copy(monkeypatch, tmp_path):
    site = _wire(monkeypatch, tmp_path, (SONG_NAME, GOOD_YAML))

    result = runner.invoke(app, ["publish", "--site", str(site)])

    assert result.exit_code == 0
    assert (site / "public" / "lyrics" / SONG_NAME).exists()
    assert "written: 1" in result.output


def test_dry_run_reports_without_writing(monkeypatch, tmp_path):
    site = _wire(monkeypatch, tmp_path, (SONG_NAME, GOOD_YAML))

    result = runner.invoke(app, ["publish", "--site", str(site), "--dry-run"])

    assert result.exit_code == 0
    assert "Nothing was written" in result.output
    assert not (site / "public" / "lyrics" / SONG_NAME).exists()


def test_check_exits_one_when_drift_exists(monkeypatch, tmp_path):
    site = _wire(monkeypatch, tmp_path, (SONG_NAME, GOOD_YAML))

    result = runner.invoke(app, ["publish", "--site", str(site), "--check"])

    assert result.exit_code == 1
    assert "missing-site" in result.output


def test_check_exits_zero_when_in_sync(monkeypatch, tmp_path):
    site = _wire(monkeypatch, tmp_path, (SONG_NAME, GOOD_YAML))
    runner.invoke(app, ["publish", "--site", str(site)])

    result = runner.invoke(app, ["publish", "--site", str(site), "--check"])

    assert result.exit_code == 0


def test_conflicting_delete_flags_exit_two(monkeypatch, tmp_path):
    site = _wire(monkeypatch, tmp_path)

    result = runner.invoke(
        app, ["publish", "--site", str(site), "--prune", "--remove-orphans"]
    )

    assert result.exit_code == 2


def test_validation_failure_exits_one(monkeypatch, tmp_path):
    site = _wire(
        monkeypatch, tmp_path, (SONG_NAME, GOOD_YAML.replace("      E perguntei\n", ""))
    )

    result = runner.invoke(app, ["publish", "--site", str(site)])

    assert result.exit_code == 1
    assert not (site / "public" / "lyrics" / SONG_NAME).exists()
```

- [ ] **Step 6: Run the CLI tests to verify they fail**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_cli_publish.py -v`

Expected: failure — `No such command 'publish'`.

- [ ] **Step 7: Add the `publish` command to the CLI**

In `/home/mz/code/ForroLyrics/forrolyrics/cli.py`, add the import next to the existing one:

```python
from forrolyrics import pipeline
from forrolyrics import publish as publish_module
```

Then append this command after the `reviewed` command:

```python
@app.command()
def publish(
    site: Path = typer.Option(
        None, "--site", help="Path to the ForroDaCapita checkout."
    ),
    dry_run: bool = typer.Option(False, "--dry-run", help="Report changes; write nothing."),
    check: bool = typer.Option(False, "--check", help="Report drift; exit 1 if any."),
    prune: bool = typer.Option(
        False, "--prune", help="Delete site copies whose archive file is gone."
    ),
    remove_orphans: bool = typer.Option(
        False, "--remove-orphans", help="Delete site copies with no archive file."
    ),
    adopt: bool = typer.Option(
        False,
        "--adopt",
        help="Record hand-edited or untracked site copies as the baseline, unchanged.",
    ),
) -> None:
    """Publish opted-in finished songs into the ForroDaCapita website."""
    try:
        if check:
            result = publish_module.check(site_root=site)
        else:
            result = publish_module.publish(
                site_root=site,
                dry_run=dry_run,
                prune=prune,
                remove_orphans=remove_orphans,
                adopt=adopt,
            )
    except publish_module.UsageError as exc:
        typer.echo(f"\n[error] {exc}", err=True)
        raise typer.Exit(2)
    except publish_module.PublishError as exc:
        typer.echo(f"\n[error] {exc}", err=True)
        for name, diff in exc.diffs.items():
            typer.echo(f"\n--- {name} ---\n{diff}", err=True)
        raise typer.Exit(1)

    if check:
        typer.echo(f"Drift: {len(result.drift)}")
        for item in result.drift:
            typer.echo(f"  {item.kind}: {item.name} — {item.detail}")
    else:
        rows = [
            ("written", result.written),
            ("restored", result.restored),
            ("unchanged", result.unchanged),
            ("pruned", result.pruned),
            ("removed orphans", result.removed_orphans),
            ("adopted", result.adopted),
            ("stale (kept)", result.stale),
        ]
        prefix = "[dry-run] " if dry_run else ""
        for label, names in rows:
            if names:
                typer.echo(f"{prefix}{label}: {len(names)} — {', '.join(names)}")
        if result.vendored_schema:
            typer.echo(f"{prefix}schema: vendored into the site repo")
        typer.echo(
            "[dry-run] Nothing was written."
            if dry_run
            else "Done. Commit and push the site repo to deploy."
        )
    for warning in result.warnings:
        typer.echo(f"warning: {warning}", err=True)
    if check and result.drift:
        raise typer.Exit(1)
```

Also add a fourth step to the `WELCOME` string so the workflow is discoverable:

```
  4. To update the website with songs that carry publish: true:
       forrolyrics publish
```

- [ ] **Step 8: Run the CLI tests to verify they pass**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_cli_publish.py -v`

Expected: 6 passed.

- [ ] **Step 9: Run the whole suite**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests -q`

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
cd /home/mz/code/ForroLyrics
git add forrolyrics/publish.py forrolyrics/cli.py tests/conftest.py tests/test_publish.py tests/test_cli_publish.py
git commit -m "feat(cli): add publish, --check, --prune, --remove-orphans, --adopt"
```

### Task 7: Document the workflow and wire up the editor

**Files:**
- Modify: `/home/mz/code/ForroLyrics/README.md` (after `## Publishing a finished song`)
- Modify: `/home/mz/code/ForroLyrics/.vscode/settings.json`
- Create: `/home/mz/code/ForroLyrics/.vscode/extensions.json`

- [ ] **Step 1: Document the publish workflow**

In `/home/mz/code/ForroLyrics/README.md`, insert a new section immediately before `## What gets better each translation`:

```markdown
## Publishing to the website

`reviewed` archives a song locally. To also push finished songs to
ForroDaCapita, mark them with `publish: true` and run:

```
uv run forrolyrics publish --dry-run   # report what would change
uv run forrolyrics publish             # write the site copies + manifest
```

Each published song is copied verbatim into the site's `public/lyrics/`
(the `publish:` line is stripped and a generated header is added) and recorded
in `songs/.published.json` by sha256. The flow is one-way: the archive is the
source of truth, so later edits there reach the site on the next publish, and
the site repo is never committed for you — commit and push it to deploy.

Guards:

- `forrolyrics publish --check` — drift report, exits 1 if the archive, the
  site copies, and the manifest disagree
- a site copy edited by hand, or one that predates the manifest, aborts the run
  with a diff and writes nothing. `--adopt` records such a file as the baseline
  exactly as it is, still without rewriting it
- `--prune` deletes site copies whose archive file is gone, `--remove-orphans`
  deletes site copies with no archive file. Neither is implied
- every opted-in song is validated against `schemas/song.schema.json` plus the
  cross-field rules (equal line counts, resolvable `[n]` footnote markers)
  before anything is written

`publish` never commits or pushes, and a running `astro dev` must be restarted
to pick up new site copies.
```

- [ ] **Step 2: Point the YAML extension at the canonical schema**

Replace `/home/mz/code/ForroLyrics/.vscode/settings.json` with:

```json
{
  "python.envFile": "${workspaceFolder}/.env",
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.terminal.useEnvFile": true,
  "yaml.schemas": {
    "./schemas/song.schema.json": ["songs/finished/*.yaml", "songs/new/*.yaml"]
  }
}
```

- [ ] **Step 3: Recommend the YAML extension**

Create `/home/mz/code/ForroLyrics/.vscode/extensions.json`:

```json
{
  "recommendations": ["redhat.vscode-yaml"]
}
```

- [ ] **Step 4: Verify both JSON files parse**

Run: `cd /home/mz/code/ForroLyrics && python3 -m json.tool .vscode/settings.json > /dev/null && python3 -m json.tool .vscode/extensions.json > /dev/null && echo OK`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
cd /home/mz/code/ForroLyrics
git add README.md .vscode/settings.json .vscode/extensions.json
git commit -m "docs: describe the publish workflow and schema wiring"
```

## Chunk 3: Site-side validation gate and docs

Everything in this chunk lands in `/home/mz/code/Websites/ForroDaCapita`. Code style follows `.prettierrc`: no semicolons, single quotes, 80-column width.

### Task 8: The lyrics validation gate

**Files:**
- Create: `/home/mz/code/Websites/ForroDaCapita/scripts/check-lyrics.mjs`
- Create: `/home/mz/code/Websites/ForroDaCapita/tests/fixtures/minimal-song.schema.json`
- Create: `/home/mz/code/Websites/ForroDaCapita/tests/lyrics-schema.test.mjs`
- Modify: `/home/mz/code/Websites/ForroDaCapita/package.json`

A top-level `scripts/` directory is created here. It is distinct from the existing `src/scripts/`, which holds browser-side helpers: `scripts/` is build-time Node tooling, like `astro.config.mjs` at the repo root.

- [ ] **Step 1: Add ajv as a dev dependency**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm add -D ajv@^8.17.1`

Expected: `ajv` appears under `devDependencies` in `package.json` and `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Write the gate fixture schema**

Create `/home/mz/code/Websites/ForroDaCapita/tests/fixtures/minimal-song.schema.json`. This is a deliberately small schema used to test the gate mechanism; the real schema is vendored from ForroLyrics and is not duplicated here.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Minimal song, for testing the gate",
  "type": "object",
  "additionalProperties": false,
  "required": ["title", "artist", "languages"],
  "properties": {
    "title": { "type": "string", "minLength": 1 },
    "artist": { "type": "string", "minLength": 1 },
    "languages": { "type": "array", "minItems": 1 }
  }
}
```

- [ ] **Step 3: Write the failing gate test**

Create `/home/mz/code/Websites/ForroDaCapita/tests/lyrics-schema.test.mjs`:

```js
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { checkLyrics } from '../scripts/check-lyrics.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_SCHEMA = join(HERE, 'fixtures', 'minimal-song.schema.json')

const VALID_SONG = `title: Asa Branca
artist: Luiz Gonzaga
languages:
  - code: pt
    name: Português
    lines: |
      Quando olhei a terra
`

const makeLyricsDir = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'lyrics-gate-'))
  mkdirSync(join(dir, 'lyrics'), { recursive: true })
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, 'lyrics', name), text, 'utf8')
  }
  return join(dir, 'lyrics')
}

describe('checkLyrics', () => {
  it('passes when every file matches the schema', () => {
    const lyricsDir = makeLyricsDir({ 'Asa Branca.yaml': VALID_SONG })

    const result = checkLyrics({ lyricsDir, schemaPath: FIXTURE_SCHEMA })

    assert.equal(result.failures.length, 0)
    assert.equal(result.checked, 1)
  })

  it('reports a file with an unknown top-level key', () => {
    const lyricsDir = makeLyricsDir({
      'Asa Branca.yaml': `${VALID_SONG}surprise: yes\n`,
    })

    const result = checkLyrics({ lyricsDir, schemaPath: FIXTURE_SCHEMA })

    assert.equal(result.checked, 1)
    assert.equal(result.failures.length, 1)
    assert.match(result.failures[0], /Asa Branca\.yaml/)
    assert.match(result.failures[0], /surprise/)
  })

  it('reports unparseable YAML', () => {
    const lyricsDir = makeLyricsDir({ 'Broken.yaml': 'a: [unclosed\n' })

    const result = checkLyrics({ lyricsDir, schemaPath: FIXTURE_SCHEMA })

    assert.match(result.failures[0], /Broken\.yaml: invalid YAML/)
  })

  it('ignores files that are not YAML', () => {
    const lyricsDir = makeLyricsDir({ 'notes.txt': 'hello' })

    const result = checkLyrics({ lyricsDir, schemaPath: FIXTURE_SCHEMA })

    assert.equal(result.checked, 0)
    assert.equal(result.failures.length, 0)
  })

  it('throws a helpful error when the vendored schema is missing', () => {
    const lyricsDir = makeLyricsDir({ 'Asa Branca.yaml': VALID_SONG })

    assert.throws(
      () => checkLyrics({ lyricsDir, schemaPath: join(lyricsDir, 'nope.json') }),
      /forrolyrics publish/
    )
  })

  it('throws a helpful error when the lyrics directory is missing', () => {
    const missing = join(mkdtempSync(join(tmpdir(), 'lyrics-missing-')), 'lyrics')

    assert.throws(
      () => checkLyrics({ lyricsDir: missing, schemaPath: FIXTURE_SCHEMA }),
      /forrolyrics publish/
    )
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd /home/mz/code/Websites/ForroDaCapita && node --test tests/lyrics-schema.test.mjs`

Expected: failure — `ERR_MODULE_NOT_FOUND` for `scripts/check-lyrics.mjs`.

Note: the test command is always an explicit file list. `node --test tests/` does **not** work on Node 22 — a positional directory argument is resolved as a module path and fails with `Cannot find module`.

- [ ] **Step 5: Write the gate script**

Create `/home/mz/code/Websites/ForroDaCapita/scripts/check-lyrics.mjs`:

```js
#!/usr/bin/env node
/**
 * Validates every file in public/lyrics against the vendored song schema.
 *
 * Wired into `build`, so a malformed or hand-edited lyrics file fails the
 * Vercel build instead of degrading into a console warning. The schema is
 * vendored from ForroLyrics by `forrolyrics publish` — never edit it here.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv from 'ajv'
import yaml from 'js-yaml'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, '..')
export const LYRICS_DIR = join(ROOT, 'public', 'lyrics')
export const SCHEMA_PATH = join(ROOT, 'src', 'schemas', 'song.schema.json')

export const checkLyrics = ({
  lyricsDir = LYRICS_DIR,
  schemaPath = SCHEMA_PATH,
} = {}) => {
  if (!existsSync(schemaPath)) {
    throw new Error(
      `song schema missing at ${schemaPath}. Publish the songs first: ` +
        'cd ../ForroLyrics && uv run forrolyrics publish'
    )
  }
  if (!existsSync(lyricsDir)) {
    throw new Error(
      `lyrics directory missing at ${lyricsDir}. Publish the songs first: ` +
        'cd ../ForroLyrics && uv run forrolyrics publish'
    )
  }

  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema)
  const failures = []
  let checked = 0

  for (const name of readdirSync(lyricsDir)
    .filter((file) => file.toLowerCase().endsWith('.yaml'))
    .sort()) {
    checked += 1
    const path = join(lyricsDir, name)
    let doc
    try {
      doc = yaml.load(readFileSync(path, 'utf8'))
    } catch (err) {
      failures.push(`${name}: invalid YAML — ${err.message}`)
      continue
    }
    if (!validate(doc)) {
      const detail = validate.errors
        .map((error) => {
          const at = error.instancePath || '<root>'
          const key = error.params.additionalProperty
          return key ? `${at} ${key} ${error.message}` : `${at} ${error.message}`
        })
        .join('; ')
      failures.push(`${name}: ${detail}`)
    }
  }

  return { checked, failures }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  try {
    const { checked, failures } = checkLyrics()
    if (failures.length > 0) {
      console.error(
        `[lyrics] ${failures.length} of ${checked} file(s) invalid:`
      )
      for (const failure of failures) console.error(`  - ${failure}`)
      process.exit(1)
    }
    console.log(`[lyrics] ${checked} file(s) valid against the song schema`)
  } catch (err) {
    console.error(`[lyrics] ${err.message}`)
    process.exit(1)
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd /home/mz/code/Websites/ForroDaCapita && node --test tests/lyrics-schema.test.mjs`

Expected: 6 tests pass.

- [ ] **Step 7: Let eslint lint `.mjs` files**

In `/home/mz/code/Websites/ForroDaCapita/eslint.config.mjs`, change the last config object's `files` array to the multi-line form below (prettier wraps it at 80 columns once `'**/*.mjs', ` is added). Without this entry, `globals.node` never applies to `.mjs` and every `process`/`console` reference is a `no-undef` error.

```js
  {
    files: [
      '**/*.js',
      '**/*.mjs',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.astro',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        console: 'readonly',
      },
    },
  },
```

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm exec eslint scripts/check-lyrics.mjs tests/lyrics-schema.test.mjs`

Expected: no output, exit code 0.

- [ ] **Step 8: Wire the gate into the scripts**

In `/home/mz/code/Websites/ForroDaCapita/package.json`, change the `scripts` block to:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "node scripts/check-lyrics.mjs && astro build",
    "start": "node dist/server/entry.mjs",
    "preview": "astro preview",
    "astro": "astro",
    "check:lyrics": "node scripts/check-lyrics.mjs",
    "test": "node --test tests/*.test.mjs",
    "lint": "eslint . --fix",
    "format": "prettier --write ."
  },
```

> From this step until Chunk 4 vendors the schema, `pnpm build` fails by design — that is the gate doing its job. Do not deploy between Chunks 3 and 4. `pnpm dev` is unaffected. (`pnpm preview` is not part of this: it already fails on this repo for an unrelated pre-existing reason — `@astrojs/vercel` sets no `previewEntrypoint`, so `astro preview` throws.)

- [ ] **Step 9: Run the gate to confirm it fails loudly before the first publish**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm check:lyrics`

Expected: exit code 1 with `[lyrics] song schema missing at .../src/schemas/song.schema.json`. This is correct at this point in the plan: the vendored schema arrives with the first publish in Chunk 4.

- [ ] **Step 10: Confirm formatting matches the repo**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm exec prettier --check scripts/check-lyrics.mjs tests/lyrics-schema.test.mjs tests/fixtures/minimal-song.schema.json package.json eslint.config.mjs`

Expected: `All matched files use Prettier code style!` If not, run `pnpm exec prettier --write` on the reported files and re-run the check.

- [ ] **Step 11: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita
git add package.json pnpm-lock.yaml eslint.config.mjs scripts/check-lyrics.mjs tests/
git commit -m "feat(lyrics): validate public/lyrics against the vendored schema at build time"
```

### Task 9: Make the Astro integration fail loudly

Today `src/integrations/lyrics.js` catches a read error, warns, and writes an empty lyrics map — which is exactly how a broken symlink produced an empty lyrics page. It should stop the build instead.

**Files:**
- Modify: `/home/mz/code/Websites/ForroDaCapita/src/integrations/lyrics.js`
- Create: `/home/mz/code/Websites/ForroDaCapita/tests/lyrics-integration.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `/home/mz/code/Websites/ForroDaCapita/tests/lyrics-integration.test.mjs`:

```js
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { readLyrics } from '../src/integrations/lyrics.js'

const makeLyricsDir = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'lyrics-integration-'))
  mkdirSync(join(dir, 'lyrics'), { recursive: true })
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, 'lyrics', name), text, 'utf8')
  }
  return join(dir, 'lyrics')
}

describe('readLyrics', () => {
  it('maps YAML filenames to their contents', () => {
    const lyricsDir = makeLyricsDir({
      'Asa Branca.yaml': 'title: Asa Branca\n',
      'notes.txt': 'ignored',
    })

    assert.deepEqual(readLyrics(lyricsDir), {
      'Asa Branca.yaml': 'title: Asa Branca\n',
    })
  })

  it('throws with a publish hint when the directory is unreadable', () => {
    const missing = join(mkdtempSync(join(tmpdir(), 'lyrics-missing-')), 'lyrics')

    assert.throws(() => readLyrics(missing), /forrolyrics publish/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/mz/code/Websites/ForroDaCapita && node --test tests/lyrics-integration.test.mjs`

Expected: failure — `SyntaxError: The requested module '../src/integrations/lyrics.js' does not provide an export named 'readLyrics'`.

- [ ] **Step 3: Extract `readLyrics` and make it fail loudly**

Replace `/home/mz/code/Websites/ForroDaCapita/src/integrations/lyrics.js` with:

```js
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const readLyrics = (lyricsDir) => {
  let files
  try {
    files = readdirSync(lyricsDir)
  } catch (err) {
    throw new Error(
      `[forro-lyrics] cannot read ${lyricsDir}: ${err.message}. ` +
        'Publish the songs first: cd ../ForroLyrics && uv run forrolyrics publish'
    )
  }
  return Object.fromEntries(
    files
      .filter((file) => file.toLowerCase().endsWith('.yaml'))
      .map((file) => [file, readFileSync(join(lyricsDir, file), 'utf8')])
  )
}

export function lyrics() {
  return {
    name: 'forro-lyrics',
    hooks: {
      'astro:config:setup'() {
        const root = process.cwd()
        const outFile = join(root, 'src', 'generated-lyrics.js')
        const sources = readLyrics(join(root, 'public', 'lyrics'))

        writeFileSync(
          outFile,
          `export const lyricsSources = ${JSON.stringify(sources)}\n`
        )
      },
    },
  }
}
```

- [ ] **Step 4: Run both test files**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm test`

Expected: 8 tests pass (6 gate + 2 integration).

- [ ] **Step 5: Confirm formatting**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm exec prettier --check src/integrations/lyrics.js tests/lyrics-integration.test.mjs`

Expected: `All matched files use Prettier code style!`

- [ ] **Step 6: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita
git add src/integrations/lyrics.js tests/lyrics-integration.test.mjs
git commit -m "fix(lyrics): fail the build when public/lyrics cannot be read"
```

### Task 10: Document the one-way flow and wire up the editor

**Files:**
- Modify: `/home/mz/code/Websites/ForroDaCapita/src/pages/README-lyrics.md`
- Modify: `/home/mz/code/Websites/ForroDaCapita/.vscode/settings.json`
- Modify: `/home/mz/code/Websites/ForroDaCapita/.vscode/extensions.json` (already exists — keep the Astro recommendation)

- [ ] **Step 1: Correct the marker rules**

In `/home/mz/code/Websites/ForroDaCapita/src/pages/README-lyrics.md`, replace the bullet list under `### Superscripts and markers` (everything from the `- Every \`[n]\` marker` bullet through the `- A \`footnotes\` entry without any matching marker` bullet) with:

```markdown
- Markers may appear in any language block. The rendering handles the difference:
  - **PT column:** `[n]` → a coloured superscript (`<sup class="footnote-ref">`) with a hover tooltip showing `term — explanation`.
  - **All other columns:** `[n]` is silently stripped from the output — never shown to readers.
- Every `[n]` must resolve to a `footnotes` entry. `forrolyrics publish` refuses to publish a song with a dangling marker.
- A `footnotes` entry without any matching marker still appears in the footnotes section below.
- Marker parity across languages is not required.
```

- [ ] **Step 2: Rewrite the "Adding a song" section**

Replace the `## Adding a song` section (its numbered list, up to but not including `## Technical notes`) with:

```markdown
## Adding a song

Songs are **not** authored here. `public/lyrics/` is generated output: the source
of truth is `../ForroLyrics/songs/finished/`, and every file in this directory
carries a "Generated by 'forrolyrics publish'" header.

1. Put the finished song in `../ForroLyrics/songs/finished/` with `publish: true`.
2. Run `cd ../ForroLyrics && uv run forrolyrics publish --dry-run` and read the report.
3. Run `uv run forrolyrics publish`. It writes `public/lyrics/<same filename>.yaml`.
4. Run `pnpm check:lyrics` — the same validation the Vercel build runs.
5. Restart `pnpm dev`, then visit `http://localhost:4321/lyrics` and check:
   - PT superscripts show on hover with a tooltip.
   - Other columns show marker-free text.
   - The footnotes section appears below the lyrics.
6. Commit the site repo to deploy.

The flow is one-way. Later edits to the archive reach the site on the next
publish. If you edit a file in `public/lyrics/` by hand, `publish` aborts with a
diff instead of overwriting it — fold the change into the archive first.
```

- [ ] **Step 3: Extend the technical notes**

In `/home/mz/code/Websites/ForroDaCapita/src/pages/README-lyrics.md`, add two bullets at the end of the `## Technical notes` section:

```markdown
- `src/schemas/song.schema.json` is vendored from ForroLyrics by `forrolyrics publish` — never edit it here. It is a copy of `../ForroLyrics/schemas/song.schema.json`.
- `pnpm build` runs `node scripts/check-lyrics.mjs` first, so an invalid lyrics file fails the build instead of rendering blank. `pnpm test` covers the gate itself.
```

- [ ] **Step 4: Point the YAML extension at the vendored schema**

In `/home/mz/code/Websites/ForroDaCapita/.vscode/settings.json`, `files.associations` is currently the last key. Add a comma after its closing brace, then append the schema mapping, so the file ends with:

```jsonc
  "files.associations": {
    "*.css": "tailwindcss"
  },

  "yaml.schemas": {
    "./src/schemas/song.schema.json": ["public/lyrics/*.yaml"]
  }
}
```

- [ ] **Step 5: Recommend the YAML extension**

In `/home/mz/code/Websites/ForroDaCapita/.vscode/extensions.json`, add `redhat.vscode-yaml` to the existing `recommendations` array, leaving `unwantedRecommendations` and the Astro recommendation in place. The file becomes:

```json
{
  "recommendations": ["astro-build.astro-vscode", "redhat.vscode-yaml"],
  "unwantedRecommendations": []
}
```

- [ ] **Step 6: Verify the JSON files parse**

Run: `cd /home/mz/code/Websites/ForroDaCapita && python3 -m json.tool .vscode/extensions.json > /dev/null && node -e "JSON.parse(require('fs').readFileSync('.vscode/settings.json','utf8').replace(/^\s*\/\/.*$/gm,''))" && echo OK`

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita
git add src/pages/README-lyrics.md .vscode/settings.json .vscode/extensions.json
git commit -m "docs: describe the one-way publish flow and the build-time gate"
```

## Chunk 4: The real migration

This chunk is the only one that touches real content. It runs against the live archive and the live site. **Every task here has a STOP gate**: show the operator the command output and get an explicit go-ahead before continuing. Nothing in this chunk may be batched.

Two facts that shape the steps below:

- The site filenames already match the archive filenames exactly (`Luiz Gonzaga - Asa Branca.yaml`, `Venâncio et al. - Último Pau de Arara.yaml`), so no rename and no slug change are involved. Asa Branca keeps its current URL, `/lyrics/luiz-gonzaga-asa-branca`.
- Neither live site file has a generated header yet — the pipeline has never run. Their first bytes are `title:`, so never strip lines from them.

### Task 11: Settle the archive working tree

**Files:**
- Inspect only: `/home/mz/code/ForroLyrics` git status

- [ ] **Step 1: Show the current state**

Run:

```bash
cd /home/mz/code/ForroLyrics
git status --porcelain
echo "--- archive only ---"
git status --porcelain songs/finished/
```

Expected: modified files under `ressources/` and `typst/`, deleted files under `songs/new/` (Fagner and Jackson), a deleted `Fagner - Último Pau de Arara.yaml`, and untracked Venâncio and `São João Na Roça` files. Treat the output as the source of truth, not this description.

- [ ] **Step 2: STOP — decide with the operator**

The archive is mid-refactor and the first publish reads whatever is in `songs/finished/` at that moment. Ask the operator, and do not proceed, until each of these has an answer:

- Should the untracked `Venâncio et al. - Último Pau de Arara.yaml` be committed to the archive? **It must be**, otherwise `git add` in Task 15 cannot track it and there is no recovery path if the fold-back is wrong.
- Should the other untracked files (the comma-joined Venâncio variant, `São João Na Roça`) and the deletions be committed, and in which commit?
- Should the modified glossary and Typst files be committed separately?

Commit whatever the operator decides **before** continuing, so that Task 12 and Task 15 diffs are clean. Note that `Venâncio et al. - Último Pau de Arara.yaml` is the one archive file with no git history, so copy it somewhere safe as well:

```bash
cp "/home/mz/code/ForroLyrics/songs/finished/Venâncio et al. - Último Pau de Arara.yaml" /tmp/venancio-archive-backup.yaml
```

- [ ] **Step 3: Confirm the archive still validates after settling**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_validate.py -q`

Expected: `test_every_archived_song_validates` passes. If a newly added archive file breaks it, fix the file before continuing.

### Task 12: Fold the site-only edits back into the archive

The two live site files are *ahead* of the archive: they carry an `intro`, a corrected footnote, and `pdf_url` values the archive lacks. The live copies are the reviewed truth, so they win and become the archive content.

**Files:**
- Modify: `/home/mz/code/ForroLyrics/songs/finished/Luiz Gonzaga - Asa Branca.yaml`
- Modify: `/home/mz/code/ForroLyrics/songs/finished/Venâncio et al. - Último Pau de Arara.yaml`

- [ ] **Step 1: Show both diffs**

Run:

```bash
cd /home/mz/code/ForroLyrics
for name in "Luiz Gonzaga - Asa Branca" "Venâncio et al. - Último Pau de Arara"; do
  echo "=== $name ==="
  diff -u "songs/finished/$name.yaml" \
          "/home/mz/code/Websites/ForroDaCapita/public/lyrics/$name.yaml" || true
done
```

Expected: Asa Branca differs by a missing `intro`, a missing `pdf_url`, and the footnote wording `brazier smt. hellfire` → `brazier, sometimes hellfire`. Venâncio differs only by `pdf_url` (blank in the archive, a Google Drive link on the site).

- [ ] **Step 2: STOP — reconcile anything unexpected**

If either diff contains anything beyond those known items, stop and resolve it with the operator before writing anything. Do not bulk-copy files over each other.

- [ ] **Step 3: Adopt the site content into the archive**

Copy each live site file over its archive counterpart, whole. There is no generated header to strip, and neither file ends with a newline consistently, so use `cp` and never line surgery.

```bash
cd /home/mz/code/ForroLyrics
site=/home/mz/code/Websites/ForroDaCapita/public/lyrics
cp "songs/finished/Luiz Gonzaga - Asa Branca.yaml" /tmp/asa-archive-backup.yaml
for name in "Luiz Gonzaga - Asa Branca" "Venâncio et al. - Último Pau de Arara"; do
  cp "$site/$name.yaml" "songs/finished/$name.yaml"
done
```

- [ ] **Step 4: Add `publish: true` after the `artist:` line**

The flag must be inserted, never appended: `Venâncio et al. - Último Pau de Arara.yaml` has no trailing newline, so an appended flag would be glued onto the last `explanation_en` and silently never publish.

```bash
cd /home/mz/code/ForroLyrics
for name in "Luiz Gonzaga - Asa Branca" "Venâncio et al. - Último Pau de Arara"; do
  python3 - "$name" <<'PY'
import sys
from pathlib import Path

name = sys.argv[1]
path = Path("songs/finished") / f"{name}.yaml"
lines = path.read_text(encoding="utf-8").splitlines()
for index, line in enumerate(lines):
    if line.startswith("artist:"):
        lines.insert(index + 1, "publish: true")
        break
else:
    raise SystemExit(f"no artist: line in {path}")
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY
done
```

- [ ] **Step 5: Verify the flags landed in the right place**

Run:

```bash
cd /home/mz/code/ForroLyrics
grep -n "^publish: true" songs/finished/*.yaml
head -4 "songs/finished/Luiz Gonzaga - Asa Branca.yaml"
tail -3 "songs/finished/Venâncio et al. - Último Pau de Arara.yaml"
```

Expected: exactly two matches, one per intended file, each on the line after `artist:`. The tail of the Venâncio file must be an `explanation_en` value with no `publish` text glued onto it.

- [ ] **Step 6: Validate the folded archive**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests/test_validate.py -q`

Expected: all pass, including `test_every_archived_song_validates`.

- [ ] **Step 7: STOP — show the operator the folded archive**

Run `git -C /home/mz/code/ForroLyrics diff -- songs/finished/` and confirm every hunk is one of: added `publish: true`, added `intro`, added `pdf_url`, or the corrected footnote wording. Get a go-ahead before Task 13.

### Task 13: First publish

Because no manifest exists yet, the two existing site copies classify as `untracked` — the publisher cannot prove where they came from. The archive now holds their exact content, so deleting them and letting publish recreate them is both safe and the cleanest path to a trustworthy manifest. Do not reach for `--adopt` here: it records the site file as-is and would leave the manifest describing files that lack the generated header.

**Files:**
- Delete then recreate: `/home/mz/code/Websites/ForroDaCapita/public/lyrics/Luiz Gonzaga - Asa Branca.yaml`
- Delete then recreate: `/home/mz/code/Websites/ForroDaCapita/public/lyrics/Venâncio et al. - Último Pau de Arara.yaml`
- Write: `/home/mz/code/ForroLyrics/songs/.published.json` (new)
- Write: `/home/mz/code/Websites/ForroDaCapita/src/schemas/song.schema.json` (new)

- [ ] **Step 1: Confirm the deletions are recoverable**

Run:

```bash
cd /home/mz/code/Websites/ForroDaCapita
git status --porcelain public/lyrics/
git log --oneline -1 -- "public/lyrics/Luiz Gonzaga - Asa Branca.yaml"
git log --oneline -1 -- "public/lyrics/Venâncio et al. - Último Pau de Arara.yaml"
```

Expected: a clean `public/lyrics/` (no output) and a commit line for each file. Both files are tracked, so `git checkout -- public/lyrics/` restores them at any time.

- [ ] **Step 2: STOP — confirm with the operator**

State plainly: the next two steps delete the two live lyrics files from the site repo and immediately recreate them from the archive, with two added header lines. Content is preserved in the archive and in git. Get a go-ahead.

- [ ] **Step 3: Remove the two site copies**

```bash
cd /home/mz/code/Websites/ForroDaCapita
git rm -q "public/lyrics/Luiz Gonzaga - Asa Branca.yaml" \
           "public/lyrics/Venâncio et al. - Último Pau de Arara.yaml"
```

- [ ] **Step 4: Dry run**

Run: `cd /home/mz/code/ForroLyrics && uv run forrolyrics publish --dry-run`

Expected report:

```
[dry-run] restored: 2 — Luiz Gonzaga - Asa Branca.yaml, Venâncio et al. - Último Pau de Arara.yaml
[dry-run] schema: vendored into the site repo
[dry-run] Nothing was written.
```

Any other line — especially a `written:` or an error — means the state is not what this task assumes. Stop and investigate.

- [ ] **Step 5: Publish for real**

Run: `cd /home/mz/code/ForroLyrics && uv run forrolyrics publish`

Expected: `restored: 2`, `schema: vendored into the site repo`, and `Done. Commit and push the site repo to deploy.`

- [ ] **Step 6: Inspect exactly what changed in the site**

Run:

```bash
cd /home/mz/code/Websites/ForroDaCapita
git status --porcelain
git diff -- public/lyrics/
```

Expected: `src/schemas/song.schema.json` added, and both lyrics files modified by the two-line generated header only — Asa Branca `2 ++`, Venâncio up to `4 +++-` because the restored copy gains a trailing newline. No other content change: the `intro`, the footnote wording and `pdf_url` must be identical to what was there before.

- [ ] **Step 7: Confirm the archive diff is the intended fold-back**

Run:

```bash
cd /home/mz/code/ForroLyrics
git status --porcelain songs/
git diff -- songs/finished/
```

Expected: only the two intended files changed, plus the untracked `songs/.published.json`.

### Task 14: Verify end to end

- [ ] **Step 1: The site gate passes on the real files**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm check:lyrics`

Expected: `[lyrics] 2 file(s) valid against the song schema`, exit code 0.

- [ ] **Step 2: The gate fails on an injected bad file, and cleans up after itself**

```bash
cd /home/mz/code/Websites/ForroDaCapita
tmp=public/lyrics/__tmp_invalid.yaml
trap 'rm -f "$tmp"' EXIT
printf 'title: X\nartist: Y\nlanguages: []\nsurprise: 1\n' > "$tmp"
pnpm check:lyrics; echo "exit=$?"
```

Expected: the report names `__tmp_invalid.yaml` and mentions both `surprise` and `languages`, `exit=1`. The `trap` removes the file even if the shell exits early, so it can never reach Task 15.

- [ ] **Step 3: Drift check is clean**

Run: `cd /home/mz/code/ForroLyrics && uv run forrolyrics publish --check`

Expected: `Drift: 0`, exit code 0.

- [ ] **Step 4: Prove an archive edit propagates**

```bash
cd /home/mz/code/ForroLyrics
song="songs/finished/Luiz Gonzaga - Asa Branca.yaml"
site=/home/mz/code/Websites/ForroDaCapita/public/lyrics/"Luiz Gonzaga - Asa Branca.yaml"
cp "$song" /tmp/asa-before-propagation.yaml
trap 'cp /tmp/asa-before-propagation.yaml "$song"; cd /home/mz/code/ForroLyrics && uv run forrolyrics publish' EXIT
printf '\ndescription: TEMP propagation check\n' >> "$song"
uv run forrolyrics publish
grep -c 'TEMP propagation check' "$site"
```

Expected: `written: 1`, then `1`. The `trap` restores the archive and republishes on any exit path, so the temporary text cannot survive into Task 15.

- [ ] **Step 5: Confirm the temporary text is gone everywhere**

```bash
cd /home/mz/code/ForroLyrics
grep -rn "TEMP propagation check" songs/finished/ \
  /home/mz/code/Websites/ForroDaCapita/public/lyrics/ || echo "clean"
uv run forrolyrics publish --check
```

Expected: `clean` and `Drift: 0`.

- [ ] **Step 6: Run both test suites**

Run: `cd /home/mz/code/ForroLyrics && uv run pytest tests -q` then `cd /home/mz/code/Websites/ForroDaCapita && pnpm test`

Expected: all pass.

- [ ] **Step 7: The production build succeeds**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm build`

Expected: the gate line prints first, then Astro builds. This is the first time `build` can succeed in this plan.

- [ ] **Step 8: Restart the dev server and eyeball the songs**

Run: `cd /home/mz/code/Websites/ForroDaCapita && pnpm dev`

Then open `http://localhost:4321/lyrics` and check:

- Both songs are listed and open.
- Asa Branca is at `/lyrics/luiz-gonzaga-asa-branca` (unchanged URL).
- PT superscripts, marker-free other columns, and the footnotes section all render.

### Task 15: Commit both repos

- [ ] **Step 1: Commit the archive side**

Use explicit paths — `git add songs/finished/` would sweep in the unrelated Fagner deletion that Task 11 settled separately.

```bash
cd /home/mz/code/ForroLyrics
git add songs/.published.json \
        "songs/finished/Luiz Gonzaga - Asa Branca.yaml" \
        "songs/finished/Venâncio et al. - Último Pau de Arara.yaml"
git commit -m "feat(publish): fold site edits back and opt in two songs"
```

- [ ] **Step 2: Commit the site side**

```bash
cd /home/mz/code/Websites/ForroDaCapita
git add public/lyrics/ src/schemas/song.schema.json
git commit -m "feat(lyrics): adopt published songs under the shared schema"
```

- [ ] **Step 3: STOP — report before pushing**

Do not push. Report both commit hashes and let the operator decide when to deploy. Pushing the site repo triggers a Vercel build, which now runs the gate.
