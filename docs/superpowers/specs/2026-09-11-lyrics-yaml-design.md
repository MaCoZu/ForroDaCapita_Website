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

Note for content authors: markers (`[1]` etc.) are present in **every** language
block in the YAML (the PT and EN blocks both carry them, matching footnote ids).
Only the `pt` column renders them as superscripts; every other column strips
them.

## Parsing library

- Add `js-yaml` dependency **and** `@types/js-yaml` (js-yaml ships no types and
  Astro typechecks imported frontmatter).
- New helper module `src/lib/lyrics.js`, modeled on `src/lib/datocms.js` style:
  - `listLyrics()`: loads all YAML files in `public/lyrics/` via Vite's
    build-time glob import — `import.meta.glob('../../public/lyrics/*.yaml',
    { query: '?raw', import: 'default', eager: true })` — then parses each raw
    string with `yaml.load` and attaches a derived `slug`.
    This resolves the file contents into the server bundle **at build time**, so
    it behaves identically in local dev and Vercel serverless (no runtime
    filesystem access, which is unreliable in serverless function bundles).
  - Unparseable or structurally invalid files are skipped with a `console.warn`
    — never crash the page. If two filenames produce the same slug, the later
    file is skipped with a `console.warn`.
  - Returns `Array<{ slug, title, artist, description, pdfUrl, languages,
    footnotes }>` sorted by title.
  - `getLyricsBySlug(slug)`: returns the matching record or `undefined`.
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
  - Title (`title`) and download button share a header row: a flex wrapper with
    `justify-between` — `page-title` h1 on the left, the button on the right.
  - `artist` below (existing `.song-writer` style).
  - If `pdf_url` present, a "Download PDF" button — an `<a>` with
    `target="_blank"` and `rel="noopener"`, styled as a small outline button
    consistent with the site.
- Columns:
  - One column per `languages` entry, rendering PT then EN in the order
    authored. Desktop keeps the aligned `<table>`; mobile keeps the stacked
    layout.
  - Rows aligned by line index; missing lines pad with empty strings.
  - Language blocks whose `lines` are blank or whitespace-only are skipped
    (existing empty-column behavior).
  - The `pt` language column governs `[Label]` section-header rows (a row is a
    header when the `pt` line matches `/^\[.+\]$/`; falls back to the first
    column if no `pt` column exists). Section headers span all columns and
    render the governing column's line.
  - Blank lines create verse spacing (existing `.lyrics-verse-gap` behavior).
- Footnote superscripts:
  - Line text is HTML-escaped first; then on the `pt` column only the markers
    `\[(\d+)\]` are replaced with
    `<sup class="footnote-ref" data-footnote-n="n" data-tippy-content="Term — explanation">n</sup>`.
  - All other language columns strip `[n]` markers entirely (no numbering).
  - A marker whose number has no matching footnote is dropped (no superscript);
    footnotes without a matching marker are still listed below.
- Tooltip:
  - Reuse the site's existing centralized tippy infrastructure (`Layout.astro`
    already initialises `tippy()` on every element with `data-tippy-content`,
    using `theme: 'custom-tooltip'`). No new script or tippy theme is needed.
  - Tooltip content — `<strong>term</strong>`, then the `explanation_en` — is
    baked into the superscript's `data-tippy-content` attribute at render time.
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

1. `npm run build` — must pass; confirm the lyrics YAML content is present in the
   built server bundle output (proves the build-time glob inlining works for
   serverless).
2. Dev server: landing shows "Asa Branca - Luiz Gonzaga"; detail page shows two
   columns, superscripts on PT only, `custom-tooltip` tooltip on hover, footnotes
   list below, and no download button (sample has no `pdf_url`).
3. `curl` checks of the rendered HTML for superscript markup and marker
   stripping in the EN column.