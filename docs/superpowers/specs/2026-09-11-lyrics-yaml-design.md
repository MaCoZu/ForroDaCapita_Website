# YAML-Based Lyrics — Design

Date: 2026-09-11
Status: Approved for implementation

## Overview

Replace the DatoCMS-backed lyrics collection with lyrics sourced from YAML files
stored in `public/lyrics/`. Each file holds a song's lyrics in the requested
languages (typically two: Portuguese and English), a list of footnotes for the
Portuguese text, and optional metadata (description, PDF download link). This
removes the DatoCMS `Song` dependency entirely; content editors add songs by
dropping a YAML file into `public/lyrics/`.

A landing page (`/lyrics`) lists all songs; each listing links to an individual
song page (`/lyrics/{slug}`).

## Data Source — YAML files in `public/lyrics/`

Files are named `<Artist> - <Title>.yaml`. The URL slug is derived from the
filename: lowercase, non-alphanumeric characters become `-`, repeated `-`
collapse. Example: `Luiz Gonzaga - Asa Branca.yaml` →
`luiz-gonzaga-asa-branca`.

The sample file `public/lyrics/Luiz Gonzaga - Asa Branca.yaml` is the initial
content; it uses a PT + EN language pair with 10 footnotes. It has no
`description` and no `pdf_url`.

### YAML schema

```yaml
title: Asa Branca
artist: Luiz Gonzaga
description: Optional one-line description shown on the landing list
pdf_url: https://example.com/asa-branca.pdf
languages:
  - code: pt
    name: Português
    lines: |
      Quando olhei a terra ardendo
      Quá fogueira de São João[1]
footnotes:
  - id: 1
    term: fogueira de São João
    explanation_en: The bonfire lit during the Sao Joao festival...
```

- `title` (string, required) — display title
- `artist` (string, required) — credited artist
- `description` (string, optional) — one line shown on the landing list
- `pdf_url` (string, optional) — external PDF; shows the download button when present
- `languages` (array, required) — one or more language blocks; a column is
  rendered per block. `lines` is a multi-line string; blank lines create verse
  spacing
- `footnotes` (array, optional) — `id` (string/number), `term`, `explanation_en`.
  A `[n]` marker in the `pt` language lines links to footnote `n`

## Parsing library

- Add `js-yaml` dependency (plus `@types/js-yaml` if typechecking requires it).
- New helper module `src/lib/lyrics.js`, modeled on `src/lib/datocms.js` style:
  - `listLyrics()`: `fs.readdirSync` on `public/lyrics/`, filter `*.yaml`, parse
    each with `yaml.load`, attach a derived `slug`. Unparseable or structurally
    invalid files are skipped with a `console.warn` — never crash the page.
    Returns `Array<{ slug, title, artist, description, pdfUrl, languages,
    footnotes }>` sorted by title.
  - `getLyricsBySlug(slug)`: returns the matching record or `undefined`.
  - File paths resolve via `new URL('../../public/lyrics/', import.meta.url)`
    so behavior matches local dev and Vercel serverless.
- No other changes to the repo's build tooling.

## Routes

### Landing page — `src/pages/lyrics.astro`

- Query approach replaced with `listLyrics()`.
- Heading `page-title` "Lyrics", existing centered layout (`md:w-7/12`).
- Each list item:
  - Title + artist inline as the link text: `Title - Artist` (`artist` renders
    in the `.song-writer` span; keep the current compact single-line treatment).
  - Optional `description` as a separate paragraph below the link.
  - Divider between items (existing `.song-divider`).
- Layout and styling of the list stay as-is; only the data source changes.

### Detail page — `src/pages/lyrics/[slug].astro`

- Look up `getLyricsBySlug(slug)`; if not found, `return Astro.redirect('/lyrics', 302)`
  (current behavior kept).
- Header:
  - `title` as `page-title` h1.
  - `artist` below (existing `.song-writer` style).
  - If `pdf_url` present, a "Download PDF" button — an `<a>` with
    `target="_blank"` and `rel="noopener"`, styled as a small outline button
    consistent with the site, placed beside the title on the right.
- Columns:
  - One column per `languages` entry, rendering PT then EN in the order
    authored. Desktop keeps the aligned `<table>`; mobile keeps the stacked
    layout.
  - Rows aligned by line index; missing lines pad with empty strings.
  - The `pt` language column governs `[Label]` section-header rows (a row is a
    header when the `pt` line matches `/^\[.+\]$/`; falls back to the first
    column if no `pt` column exists). Section headers span all columns.
  - Blank lines create verse spacing (existing `.lyrics-verse-gap` behavior).
- Footnote superscripts:
  - Line text is HTML-escaped first; then on the `pt` column only the markers
    `[n]` are replaced with `<sup class="footnote-ref" data-footnote-n="n"
    data-term="..." data-explanation="...">n</sup>`.
  - All other language columns strip `[n]` markers entirely (no numbering).
- Tooltip:
  - `tippy.js` (already a dependency). An inline `<script>` in the component
    initialises `tippy()` on every `.footnote-ref` on `DOMContentLoaded` /
    after mount.
  - Tooltip content: bold `term`, then the `explanation_en`. Data read from the
    superscript's `data-*` attributes.
- Footnotes section (rendered below the lyrics, in the existing
  `text-base-styles` article centered at `md:w-7/12`):
  - `h2` "Footnotes".
  - Ordered list; each item shows `[n] Term — explanation` with the explanation
    rendered via `marked.parse` (markdown-capable).
- The old `songNotes` markdown notes block is removed; the YAML format has no
  notes field.

## Removal of DatoCMS

- Both lyrics pages stop importing `executeQuery` from
  `src/lib/datocms.js` and drop the `Song` interface.
- No DatoCMS `Song` records are read for the lyrics pages anymore.
- `src/pages/README-lyrics.md` is rewritten to document the YAML workflow:
  field table, adding a song, slug derivation, PDF button, footnotes/tooltips.
  DatoCMS-specific sections are removed.

## Error handling

- No lyric files / empty directory: landing page renders an empty list.
- Malformed YAML: skipped with `console.warn` (landing); if a detail page
  targets a skipped/missing file, it 302-redirects to `/lyrics`.
- Missing optional fields (`description`, `pdf_url`) degrade gracefully by not
  rendering the corresponding UI.

## Testing / verification

No unit-test framework in the repo. Verification:

1. `npm run build` — must pass.
2. Dev server: landing shows "Asa Branca - Luiz Gonzaga"; detail page shows two
   columns, superscripts on PT only, tooltip text on hover, footnotes list
   below, no download button (no `pdf_url` yet).
3. `curl` checks of the rendered HTML for superscript markup and marker
   stripping in the EN column.