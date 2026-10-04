# Lyrics Publish Pipeline (ForroLyrics → ForroDaCapita)

**Date:** 2026-10-04
**Status:** approved in brainstorming; awaiting implementation plan
**Repos:** `~/code/ForroLyrics` (source of truth) · `~/code/Websites/ForroDaCapita` (deployed consumer)

## Goal

Make `ForroLyrics/songs/finished/` the single source of truth for published lyrics.
A validated, one-way, opt-in `publish` command projects opted-in songs into
`ForroDaCapita/public/lyrics/`, both projects validate against one canonical JSON
Schema, and guards make silent content loss impossible.

## Current state (verified against the code)

- **A committed symlink would silently break production.** The site deploys via
  `@astrojs/vercel` (`astro.config.mjs:2`) and is linked to a Vercel project
  (`.vercel/project.json`), so the build runs on Vercel's machines. A symlink at
  `public/lyrics` → `/home/mz/code/ForroLyrics/songs/finished` commits as a link
  blob that resolves to nothing at build time; `src/integrations/lyrics.js:20`
  swallows the read error, `src/generated-lyrics.js` becomes `{}`, and the lyrics
  pages render empty. No symlink is committed, ever.
- **The schemas differ today.** Site copies carry `pdf_url` and `intro`;
  `src/pages/README-lyrics.md:18-26,53` also documents `description` and
  `languages[].width`. The pipeline's `_build_yaml`
  (`forrolyrics/pipeline.py:530-558`) emits only `title`, `artist`,
  `languages[].{code,name,lines}`, optional `intro`, `footnotes`. `reviewed()`
  archives the payload as-is (`pipeline.py:1212`), so extra keys survive into
  `songs/finished/`. `intro` is a live pipeline output path
  (`SongInput.intro`, `pipeline.py:320` → `_build_yaml(intro=...)`), not only a
  hand-edited field.
- **The site holds content the archive lacks** — exactly what a naive one-way copy
  would destroy. A full recursive diff of every published pair yields four
  site-only items, all covered by the migration:
  - `Luiz Gonzaga - Asa Branca.yaml`: an `intro` block, and footnote 3 corrected
    (`brazier smt. hellfire` → `brazier, sometimes hellfire`). The archive has
    neither.
  - `Venâncio et al. - Último Pau de Arara.yaml`: `pdf_url` with a Google Drive
    link. The archive has **no `pdf_url` key at all** (absent, not empty) in any
    of its four files.
  - `Luiz Gonzaga - Asa Branca.yaml` also has a site-only `pdf_url:` key (YAML
    `null`).
  - The published *Último Pau* copy already carries an `intro` identical to the
    archive's, so nothing is missing there.
- **File sets differ:** 4 files in `songs/finished/`, 2 published. Unpublished:
  `Jackson do Pandeiro - Iê Iê Iê No Cariri.yaml` and
  `Venâncio, Corumba, José Guimarães (Composers) - Último Pau de Arara.yaml`.
  Both *Último Pau* files declare the **same `artist`**. Their slugs differ
  (`venancio-et-al-ultimo-pau-de-arara` vs
  `venancio-corumba-jose-guimaraes-composers-ultimo-pau-de-arara`) so both would
  render without a slug collision, but they present the same title and artist —
  publishing both is a content decision, not a technical one.
- **Invalid songs fail silently.** `src/lib/lyrics.js:37-42` warns and skips, so
  schema drift surfaces as a *missing song*, not a build error.
- **RAG coupling:** `forrolyrics/resolver.py:36,68-77` loads
  `songs/finished/*.yaml` as translation reference context. Site edits must never
  flow back into the archive, and the new `publish` key is likewise visible to the
  translation prompt once it exists — harmless, but not invisible.
- **Verified invariants across all 4 archive files:** equal line counts across
  languages (20/20, 32/32, 31/31, 31/31 by `str.splitlines()`), unique footnote
  ids, unique language codes. Footnote-marker parity across languages is violated
  by 3 of the 4 files despite `README-lyrics.md:88`.
- **Environment notes.** `jsonschema` 4.26.0 is present in `.venv` but is
  **transitive only** (resolved through langchain; absent from `pyproject.toml`).
  `ajv` is likewise only in the pnpm store and is not resolvable from the project
  root. VS Code's `json.schemas` applies to `.json`/`.jsonc` only; YAML validation
  needs the Red Hat YAML extension's `yaml.schemas`. `src/generated-lyrics.js` is
  gitignored (`.gitignore:61`) and absent on a clean checkout, so site tests must
  not import `src/lib/lyrics.js`. There is no `.npmrc`, no `packageManager` field,
  and no `test` script.

## Decisions

| # | Decision |
|---|---------|
| D1 | `ForroLyrics/songs/finished/` owns **all** fields, including `pdf_url`, `description`, `languages[].width`. |
| D2 | Delivery is a `publish` command plus a drift `--check`. No committed symlink, no file watcher. |
| D3 | Publication is opt-in per song via `publish: true` in the archive YAML. |
| D4 | The canonical schema lives in ForroLyrics and is vendored into the site by `publish`, so Vercel builds are self-contained. |
| D5 | The schema is JSON Schema **draft-07**, so Python (`Draft7Validator`) and Node (`import Ajv from 'ajv'`) both consume it with no extra entry points. |
| D6 | The published file is a **verbatim copy** of the archive file minus the `publish:` line, not a re-dump of the parsed document. A re-dump was simulated against the live files and mutates published content: single-line `|-` blocks collapse into double-quoted flow scalars, `literalize()` strips trailing whitespace inside lyric lines and footnote text, and trailing blank lines vanish. (Key *order* is preserved by `sort_keys=False`, so that part was not a real risk.) Verbatim copy keeps the diff to real content changes. |

## Components

Each unit is independently testable and communicates through the interfaces below.

### 1. `ForroLyrics/schemas/song.schema.json` — canonical schema

Draft-07 JSON Schema, authored here (D4, D5).

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string, minLength 1 | yes | |
| `artist` | string, minLength 1 | yes | |
| `languages` | array, minItems 1 | yes | see language object |
| `footnotes` | array | no | see footnote object |
| `description` | string | no | landing-list text |
| `pdf_url` | string or null | no | `null` is legal: the site's empty `pdf_url:` parses as null and `lyrics.js:49` ignores it |
| `intro` | string | no | Markdown, rendered above the footnotes |
| `publish` | boolean | no | pipeline-only; stripped on publish (D3) |

Language object: `code` (string, pattern `^[a-z]{2,3}$`), `name` (string,
minLength 1), `lines` (string, minLength 1), `width` (number, 0.5–3, optional —
the site clamps defensively at `lyrics.js:20-21`, publish rejects out-of-range
values).

Footnote object: `id` (integer, minimum 1), `term` (string, minLength 1),
`explanation_en` (string, minLength 1), `explanation_de` (string, optional —
permitted by the schema, nothing generates it yet).

`additionalProperties: false` at every level, so a new pipeline field cannot reach
production undeclared. This governs **archive and published shapes only**;
`songs/new/` input files keep their existing loader — `SongInput`
(`pipeline.py:312-323`) accepts `title`, `artist`, `genre`, `key`, `context`,
`intro`, `footnotes`, `lyrics`, `letras_url` — and are not validated by this
schema.

### 2. `ForroLyrics/forrolyrics/validate.py` — validation

```
validate_song(doc: dict, *, filename: str) -> list[Issue]   # Issue: path + message
```

Runs `jsonschema.Draft7Validator` against the canonical schema, then the
cross-field rules JSON Schema cannot express:

- **R1** equal `lines` line counts across all languages → error.
- **R2** every `[n]` marker in every language resolves to a footnote `id` → error
  (the site drops dangling references silently today).
- **R3** footnote `id`s unique and integers ≥ 1 → error (also expressible in the
  schema; asserted in both places).
- **R4** language `code`s unique across `languages` → error. Draft-07 cannot
  express per-property uniqueness (`uniqueItems` compares whole objects), so this
  rule exists only here.
- **R5** marker parity across languages is **not** required.
  `README-lyrics.md:88` is corrected instead — the renderer strips markers from
  every non-`pt` column, and 3 of 4 archive files already violate the documented
  rule.

`jsonschema>=4.26.0` is added to `pyproject.toml`; today it only resolves through
langchain.

### 3. `ForroLyrics/forrolyrics/publish.py` — publish and drift check

```
publish(*, site_root: Path, dry_run: bool = False, check: bool = False,
        prune: bool = False, remove_orphans: bool = False,
        adopt: bool = False) -> PublishResult
```

`site_root` comes from `--site`, else `../Websites/ForroDaCapita` relative to the
ForroLyrics root; rejected unless it contains `package.json` and `astro.config.mjs`.

`PublishResult` carries `written`, `unchanged`, `restored`, `pruned`,
`removed_orphans`, `stale`, `hand_edited`, `drift`, `warned`, and
`vendored_schema`. `hand_edited` and `drift` are populated only by `--check`, which
distinguishes "you must republish" (`drift`) from "a human changed the site and
must fold the edit back" (`hand_edited`).

**Flag rules**

- `--dry-run` performs **no writes of any kind** — no site files, no prune, no
  orphan removal, no manifest write, no `--adopt` re-baseline. It reports the full
  plan and the diffs it would apply.
- `--check` implies `--dry-run` and is mutually exclusive with `--prune`,
  `--remove-orphans`, `--adopt`.
- `--adopt` is mutually exclusive with `--prune` and `--remove-orphans` (usage
  error, exit 2), so a re-baselined file can never be deleted in the same run.

**Phase A — read-only analysis (no writes)**

0. **Preflight.** Resolve and verify `site_root`.
1. **Load the manifest** `songs/.published.json` (absent → `{}`, first-run notice).
2. **Discover opted-in songs:** `publish is true` in the archive YAML.
3. **Classify every manifest entry** (mutually exclusive, first match wins):
   - archive file gone **and** site file gone → `stale-absent`: the manifest key is
     dead. `--check` reports it; `--prune` or `--adopt` drops the key. There is no
     file to hash, so this case must be classified before the hash comparisons or
     the prune precondition below is undefined.
   - archive file gone, site file present → `stale`: a prune candidate, since the
     archive can no longer republish it. The site file is retained untouched.
   - archive file present, site file gone → `restored`: republish from the archive.
   - site file hash ≠ manifest hash → **hand-edited**: abort with a unified diff and
     fold-back instructions, unless `--adopt` was passed (§ *Fold-back
     procedure*).
   - otherwise → `unchanged` if the site bytes already equal the projection, else
     `written`.
4. **Validate** every opted-in song (schema + R1–R4). Any error aborts.
5. **Build the plan:** site-file writes, schema vendoring, prune removals, orphan
   removals, and the exact new manifest content.

**Phase B — execute the plan**

6. Write site files atomically (temp file + `os.replace`), each as the archive
   bytes minus the `publish:` line, with the header comment prepended (D6). The
   transform drops only lines matching `^publish\s*:` at column 0 — top-level keys
   are unambiguous at indent 0, and the schema forbids `publish` anywhere nested —
   and leaves every other byte, including trailing whitespace and a missing final
   newline, untouched. Unchanged files are listed by name with no diff body.
7. Vendor the schema to `ForroDaCapita/src/schemas/song.schema.json` (skipped when
   byte-identical).
8. **Prune** (`--prune`): delete a site file and drop its manifest key together,
   in the same plan, when the entry is `stale` (archive gone or no longer opted
   in) or `stale-absent` (just the key to drop), **and** — for a `stale` entry with
   a file on disk — its site hash still equals the manifest hash. That hash
   precondition is redundant defence: in any run reaching this phase, phase A step 3
   already aborted on a mismatching entry, and `--adopt` cannot run alongside
   `--prune`.
   **Remove orphans** (`--remove-orphans`): site files with neither a manifest
   entry nor an opted-in archive counterpart are *reported* by default, because no
   baseline exists to prove they are unedited. `--remove-orphans` is the explicit,
   opt-in clearing action that keeps the `--check` gate from being permanently red
   on a hand-added file.
9. **Write the manifest last**, as a merge — never a rebuild, which would silently
   drop entries and disarm the guard. Only entries whose `sha256` actually changed
   get a new `published_at`, so a no-op publish does not dirty the file:
   ```json
   { "schema_sha256": "...",
     "songs": { "<filename>": { "source_sha256": "...", "sha256": "...",
                               "published_at": "..." } } }
   ```
   `sha256` hashes the published file (header included). `source_sha256` hashes the
   archive bytes **after** the `publish:` line is stripped, i.e. the canonical
   source form — so a whitespace-only edit to that line is not reported as drift,
   while any real content edit is. If this final write fails, the site files are
   already updated and the next `publish` would trip the hand-edit guard on files
   `publish` itself wrote; the command therefore catches that failure, prints the
   recovery command (`forrolyrics publish --adopt`), and exits 1.

**Phase C — report**

10. **Never act on removals or un-publishing.** A `stale` entry (renamed,
    deleted, or no longer opted in) is reported with a warning — renames change the
    public `/lyrics/<slug>` URL, since `lyrics.js:4-12` derives the slug from the
    filename. The site file is kept until an explicit `--prune`.
11. **Dirty-tree warning:** if `git status --porcelain songs/finished/` is
    non-empty, warn (do not fail) that the publish is not reproducible from a
    commit.

**Fold-back procedure (the guard's escape hatch).** A hash mismatch means the site
was hand-edited. To fold that edit back into the archive without hand-editing the
manifest:

1. `forrolyrics publish --adopt` — writes **only** the manifest: it does not write
   song files and does not vendor the schema. Each hand-edited entry is re-baselined
   to `sha256` = the current on-disk site hash and `source_sha256` = the current
   archive hash in canonical form (`null` when the archive file is gone, which phase
   A step 3 reports as `stale`); a `stale-absent` entry has its key dropped. It
   prints the diff it is accepting, so the change is on the record. Site and archive
   are expected to diverge between this step and step 3 — `--check` is green in that
   window by construction, because the manifest now describes the site as it is.
2. Move the content into `songs/finished/<file>.yaml`.
3. `forrolyrics publish` — overwrites the site copy from the archive and records
   the new hashes.

`--adopt` is the only path that accepts a hand-edited site file, and it is always
explicit.

**`--check`** (read-only) reports as drift, exit 1: vendored schema ≠ canonical
sha256; an opted-in song missing from the site; an opted-in song whose archive hash
differs from the manifest's `source_sha256` (edited but not republished); a
published site file whose hash differs from the manifest; a `stale` entry; an
orphan site file. Warnings only, exit 0: a dirty `songs/finished/`.

Exit codes: `0` success / no drift, `1` validation failure, aborted guard, or
detected drift, `2` usage error (bad `site_root`, incompatible flags).

### 4. `ForroDaCapita/scripts/check-lyrics.mjs` — site-side build gate

Walks `public/lyrics/*.yaml`, parses with `js-yaml`, validates against
`src/schemas/song.schema.json` with `import Ajv from 'ajv'` (draft-07, D5), prints
every failure, exits 1. Wired into the build script itself —
`"build": "node scripts/check-lyrics.mjs && astro build"` — rather than as
`prebuild`, so the gate does not depend on pnpm's pre/post-script behaviour
(unpinned here: no `.npmrc`, no `packageManager`). Also exposed as
`"check:lyrics"`. `ajv` is added as an explicit devDependency (8.17.1 is already
in the pnpm store).

### 5. `ForroDaCapita/src/integrations/lyrics.js` — fail loudly on an unreadable source

Remove the `try`/`catch` that downgrades an unreadable `public/lyrics` to a
warning (`src/integrations/lyrics.js:16-22` owns the directory read). Generation of
`src/generated-lyrics.js` is otherwise unchanged.

`src/lib/lyrics.js` **keeps** its warn-and-skip `parseRecord` behaviour: it has no
filesystem access, it runs at render time, and the ajv build gate is the
enforcement point that fails the build before any page renders. Warn-and-skip
remains as runtime defence.

### 6. Editor validation (both repos)

`yaml.schemas` — contributed by the Red Hat YAML extension, not `json.schemas` —
maps each repo's YAML glob to its schema copy:
`ForroLyrics/.vscode/settings.json` → `songs/finished/*.yaml`;
`ForroDaCapita/.vscode/settings.json` → `public/lyrics/*.yaml`. Both repos
recommend `redhat.vscode-yaml` in `.vscode/extensions.json` (created in ForroLyrics,
which has none). Paths are written workspace-root-relative and verified against the
extension's documented resolution during implementation. No `$schema` key inside
the YAML files, so publish never rewrites paths.

## Publish flow

```
ForroLyrics                                        ForroDaCapita
songs/finished/<Artist> - <Title>.yaml  ──publish──▶  public/lyrics/<same filename>.yaml
  publish: true (opt-in)                             verbatim copy − publish: line
                                                    + generated header
  validate.py (schema + R1–R4)                       check-lyrics.mjs (ajv, in build)
        └────── schemas/song.schema.json ──publish ──▶ src/schemas/song.schema.json
```

`songs/.published.json` (manifest: per-song source and site hashes + schema hash) is
the state that makes the hand-edit guard possible.

## Safety matrix

| Risk | Guard |
|---|---|
| Site has hand-edits the archive lacks | Manifest sha256 vs site file; mismatch aborts publish with a diff. `--adopt` is the only, always-explicit, mutually exclusive way past it. |
| First-run content loss | On the first run the manifest is empty, so phase A step 3 iterates nothing — the human reviewing `--dry-run` is the only guard. That is why the migration list is derived from a full recursive diff and must be completed in full. |
| Accidental deletion or silent un-publishing | Publish never deletes. `--prune` requires a manifest entry, a matching hash, and drops the manifest key with the file; orphans are reported unless `--remove-orphans`. |
| Manifest losing track of a song | The manifest is merged, never rebuilt; pruned keys are removed explicitly; removals and lost opt-ins are reported, not actioned. |
| Schema drift reaching production | ajv gate inside the `build` script fails the Vercel build; an unreadable source directory throws. |
| Half-written file published | No watcher; one deliberate command. |
| Unreproducible publish | Warning when `songs/finished/` has uncommitted changes. |
| Publish mutating published content | Verbatim copy (D6): no re-dump, no whitespace stripping, no key reordering. |
| Later hand-edits on the site | Generated header comment, README warning, `--check` drift detection, and the abort-on-mismatch guard on the next publish. |
| Site edits poisoning future translations | Publish is one-way; the archive is never written by the site (protects `resolver.py:36`). |
| Unknown pipeline field reaching the site | `additionalProperties: false` in the canonical schema. |

## Delivery order

Four sequenced phases, each gated on the previous one. The migration is a
human-in-the-loop procedure, not a code deliverable, and it carries the only
irreversible risk in this design.

1. **Schema + validation** — `schemas/song.schema.json`, `validate.py`, and their
   tests. Nothing else can be checked until this exists.
2. **Publish + manifest** — `publish.py`, the CLI subcommand, and the verbatim
   transform, exercised entirely against tmp fixtures.
3. **Site gate** — `check-lyrics.mjs`, the `build` wiring, the integration
   hardening, and the site tests. Only after this exists is it safe to run
   `publish` against the real site, because it is what catches a bad projection
   before a deploy.
4. **Migration** — the fold-back below, run with `--dry-run` first.

## Migration (one-time, after the code lands, before the first real publish)

The archive must absorb everything the site holds before any copy runs. The list is
complete: a recursive diff of every published pair found exactly the four site-only
items enumerated above.

1. `Luiz Gonzaga - Asa Branca.yaml`: add the site's `intro` block **at the site's
   current position** (immediately after the `pdf_url:` line at the top, before
   `languages:`); apply the footnote 3 fix
   (`brazier smt. hellfire` → `brazier, sometimes hellfire`).
2. `Venâncio et al. - Último Pau de Arara.yaml`: add the site's `pdf_url`
   (Google Drive link) on line 3, where the site's copy has it — replacing the
   archive's blank line there, so no line is displaced.
3. Add `publish: true` to both, **immediately after the `artist:` line**. Never
   append it: `Venâncio et al. - Último Pau de Arara.yaml` has no trailing newline,
   so an appended flag would glue itself onto the last `explanation_en` — still
   valid YAML, still schema-valid, and the song would silently never publish.
   `_write_song_yaml` never overwrites an existing archive (`pipeline.py:1233`), so
   this flag is a manual step per song.
4. Run `publish --dry-run`; review the diff; then run `publish` for real and
   commit the site changes.
5. **Expected site-side diff** — the archive-side edits from steps 1–3 are already
   reflected in the published files by the time publish runs, so the site diff is
   only the generated header and the dropped null key:
   ```
   Luiz Gonzaga - Asa Branca.yaml
   +# Generated by 'forrolyrics publish' from songs/finished/<same name> — edit there, not here.
   -pdf_url:
   Venâncio et al. - Último Pau de Arara.yaml
   +# Generated by 'forrolyrics publish' from songs/finished/<same name> — edit there, not here.
   ```
   The archive has no `pdf_url` key, so the projection carries none and the site's
   empty `pdf_url:` line (YAML `null`) disappears — a no-op at render time, since
   `lyrics.js:49` ignores null and undefined alike. Nothing else moves — but only
   because steps 1–3 insert keys at
   the site's existing positions. The archive's own conventions differ from the
   site's: `_build_yaml` (`pipeline.py:530-558`) emits `intro` *after* `languages`,
   while both published files have it *before*, and the archive is internally
   inconsistent about block style (`Venâncio et al.` uses `|-`, the others `|`).
   Regenerating an archive file through `reviewed` therefore normalises key order
   and will show up as a reordered published file — expected, content-identical, and
   the reason D6 copies bytes instead of re-dumping.
6. `Jackson do Pandeiro - Iê Iê Iê No Cariri.yaml` and the
   `Venâncio, Corumba, José Guimarães (Composers)` variant stay unpublished (no
   flag). They declare the same `artist` as the published *Último Pau* and produce a
   distinct slug, so publishing one is a content decision with no technical
   obstacle — keep it out of scope for this migration.
7. The archive working tree is mid-refactor (`Fagner - Último Pau de Arara.yaml`
   deleted, both Venâncio files untracked). Settle that before the first real
   publish so the publish is reproducible from a commit.

## Error handling

| Condition | Behavior | Exit |
|---|---|---|
| `site_root` missing / not the website | abort with the resolved path | 2 |
| Incompatible flags (`--check` with `--prune`/`--remove-orphans`/`--adopt`; `--adopt` with `--prune`/`--remove-orphans`) | usage error | 2 |
| Site file hash ≠ manifest (no `--adopt`) | abort, unified diff, fold-back instructions | 1 |
| Opted-in song fails schema/R1–R4 | abort, all issues listed, nothing written | 1 |
| Published song missing from the site | republish from the archive (reported) | 0 |
| Manifest song renamed, deleted, or no longer opted in | `stale` warning, keep the site file, point at `--prune` | 0 |
| Manifest entry with both files gone (`stale-absent`) | `--check` reports it; `--prune`/`--adopt` drop the key | 1 in `--check` |
| Orphan site file (no manifest entry, not opted in) | reported; removed only with `--remove-orphans` | 1 in `--check` |
| `--prune` target hash ≠ manifest | cannot reach the prune phase — phase A aborts first; the check remains as a last-line guard before deletion | 1 |
| Vendored schema ≠ canonical | rewritten by publish; `--check` reports | 1 in `--check` |
| Any Phase B write fails midway (site file, schema vendor, prune delete, orphan delete) | partial application, same half-applied state as a manifest failure: print the recovery command (`publish --adopt`) and stop | 1 |
| Manifest write fails after site files were written | print the recovery command (`publish --adopt`) and stop | 1 |
| `--dry-run` | zero writes; prints the full plan and diffs | 0 unless a guard or validation fails |
| `public/lyrics` unreadable, or any file fails ajv | `astro build` fails | non-zero |

## Testing

**Python — `uv run pytest tests`**

- Validator: all 4 real archive files pass; one test per rejection rule (missing
  `title`, duplicate footnote ids, dangling `[n]`, unequal line counts, duplicate
  language `code`, unknown key, `width` out of range, non-boolean `publish`, bad
  language `code`).
- Verbatim transform (D6): the published bytes equal the archive bytes minus the
  `publish:` line plus the header; trailing whitespace, block style, key order and
  a missing final newline are all preserved; a `publish:` line nested inside a
  language object is rejected by the schema rather than stripped.
- `publish`: happy path into a tmp fake site; idempotent second run writes nothing,
  leaves `published_at` untouched and reports all files unchanged; `--dry-run`
  writes nothing at all (including no prune, orphan removal, manifest write, or
  adoption); aborts with a diff on a hand-edited site file; `--adopt` re-baselines
  without writing song content, and the following publish then overwrites cleanly;
  restores a deleted published file; classifies a renamed/deleted/unflagged song
  as `stale` without acting; honours opt-in (an unflagged song is never written);
  prunes an unedited stale entry and drops its manifest key together; refuses the
  incompatible flag combinations; reports an orphan without removing it, and
  removes it under `--remove-orphans`; vendors the schema; merges rather than
  rebuilds the manifest; warns on a dirty `songs/finished/`.
- `--check`: exits 1 for each drift class (schema drift, stale song, edited archive
  not republished, hand-edited site file, stale entry, orphan) and 0 when clean.

**JavaScript — `node --test` via a new `"test": "node --test"` script** (Node 22,
no new test dependency)

- The vendored schema compiles under `import Ajv from 'ajv'`.
- `check-lyrics.mjs` exits 0 on the real songs and 1 on an injected invalid file.
- `src/integrations/lyrics.js` throws when `public/lyrics` cannot be read. Its hook
  writes to `process.cwd()/src/generated-lyrics.js`, so the test runs in a fixture
  directory and must never touch the real generated file.
- Tests must not import `src/lib/lyrics.js`: it imports the gitignored,
  build-generated `src/generated-lyrics.js` and cannot load on a clean checkout.
- Cross-repo schema identity is asserted in exactly one place — the Python
  `--check`, which hashes both files — so there is a single source of truth for
  that claim rather than a second check that cannot see the other repo.

## Files

**ForroLyrics** — create `schemas/song.schema.json`, `forrolyrics/validate.py`,
`forrolyrics/publish.py`, `songs/.published.json` (generated, tracked),
`tests/test_validate.py`, `tests/test_publish.py`; modify `forrolyrics/cli.py`
(add the `publish` subcommand and its flags), `pyproject.toml` (declare
`jsonschema>=4.26.0`), `README.md` (publish workflow), `.vscode/settings.json`
(`yaml.schemas`) and `.vscode/extensions.json` (recommend `redhat.vscode-yaml`).

The subcommand is `publish`, while `README.md:47-61` already uses *publish* as the
verb for `forrolyrics reviewed` (archiving locally). The README distinguishes them
explicitly: `reviewed` archives into `songs/finished/`; `publish` deploys opted-in
songs to the website.

**ForroDaCapita** — create `src/schemas/song.schema.json` (vendored),
`scripts/check-lyrics.mjs`, `tests/lyrics-schema.test.mjs`; modify
`src/integrations/lyrics.js` (throw on an unreadable source directory),
`package.json` (`build` gate, `check:lyrics`, `test`, `ajv` devDependency),
`src/pages/README-lyrics.md` (generated-file warning and corrected marker-parity
rule; the empty-`lines` claim at line 56 is implemented at
`src/pages/lyrics/[slug].astro:33` and needs no edit), `.vscode/settings.json`,
`.vscode/extensions.json`.

## Non-goals

- No two-way sync, no watcher, no committed symlink, no submodule/subtree.
- No changes to lyrics rendering, typography, or pages; `src/lib/lyrics.js`
  parsing behaviour is unchanged.
- No reformatting or normalisation of archive files — publish copies bytes.
- No validation of `songs/new/` inputs and no retroactive validation of past runs.
- No German (`explanation_de`) generation; the field is merely permitted.
- No git hooks or CI workflow; the `build` script covers Vercel and local runs.
- No rename detection or URL redirects for `/lyrics/<slug>`; renames are
  reported, not managed.