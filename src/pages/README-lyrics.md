# Lyrics Collection

This folder documents the YAML-based lyrics feature. Lyrics pages pull all data from YAML files in `public/lyrics/`.

## File format

Each song lives in `public/lyrics/` as `<Artist> - <Title>.yaml`:

```
public/lyrics/
  Luiz Gonzaga - Asa Branca.yaml
```

The **slug** is derived automatically from the filename (`Luiz Gonzaga - Asa Branca.yaml` → `luiz-gonzaga-asa-branca`). No manual slug management required.

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **yes** | Song title displayed as the page `<h1>` and in the landing list |
| `artist` | string | **yes** | Artist / songwriter name shown below the title |
| `description` | string | no | Optional short text displayed in the landing list below the title |
| `pdf_url` | string | no | External URL; renders a **Download PDF** button beside the title on the detail page |
| `languages` | array | **yes** | One entry per column; see [Language objects](#language-objects) |
| `footnotes` | array | no | One entry per footnote; see [Footnotes](#footnotes) |
| `intro` | string | no | Optional Markdown text rendered above the Footnotes section on the detail page; a general explanation of the song |

### Language objects

Each element in `languages`:

```yaml
- code: pt
  name: Português
  lines: |
    [Canto I]
    Quá fogueira de São João
    [Canto II]
    Quero ver o mato arder

- code: en
  name: English
  lines: |
    [Canto I]
    When I saw the land burning
    [Canto II]
    I want to see the woods burn
```

- `code` — lowercase language code (`pt`, `en`, …). The `pt` column is special: it renders footnote superscripts. All other columns strip them. If no language has `code: pt`, the first column takes over the superscript/header role.
- `name` — display label shown above the column.
- `lines` — the full lyrics text, line by line, as a YAML block scalar (`|`). Blank lines create verse spacing (extra vertical gap). Lines that consist *only* of `[...]` (e.g. `[Canto I]`) become section headers in the `pt` column.

Languages with empty or whitespace-only `lines` are skipped entirely.

## Song intro

`intro` is optional Markdown rendered in the article style **above** the Footnotes section on the detail page — use it for a general explanation of the song. It is not shown on the landing list.

```yaml
intro: |
  **Asa Branca** is a defining song of the *baião* genre…
```

## Footnotes

Each element in `footnotes`:

```yaml
- id: 1
  term: fogueira de São João
  explanation_en: |
    The bonfire lit on **June 24** for the
    *Festa Junina* (June Festival) is one of the
    most recognizable images of Northeastern Brazil.
```

- `id` — an integer; referenced in the lyrics by `[1]`, `[2]`, etc.
- `term` — the word or phrase being explained.
- `explanation_en` — English explanation. Rendered as Markdown (bold, italic, links all work) in the footnotes section below the lyrics; the hover tooltip shows the same text with the raw markdown syntax intact.

## Authoring rules

### Superscripts and markers

- Every `[n]` marker in the YAML must be duplicated across **every** language block (PT and EN both carry them). The rendering handles the difference:
  - **PT column:** `[n]` → a coloured superscript (`<sup class="footnote-ref">`) with a hover tooltip showing `term — explanation`.
  - **All other columns:** `[n]` is silently stripped from the output — never shown to readers.
- A marker referencing a non-existent `id` is simply dropped (no error, no empty superscript).
- A `footnotes` entry without any matching marker still appears in the footnotes section below.

### Section headers

A line that is *only* `[Some Label]` (containing just square brackets around anything, e.g. `[Canto I]` or `[Verso 1]`) in the `pt` block is treated as a section header — rendered as an uppercase, spaced heading spanning the full table width. All other columns display the same governing-column header text. (A standalone `[n]` line would also match — keep footnote markers inline with text.)

### Verse spacing

A blank line in the `lines` block produces an extra vertical gap between verses — no special markup needed.

## Example

The full sample file (`public/lyrics/Luiz Gonzaga - Asa Branca.yaml`) demonstrates:
- Two languages (PT, EN) with `[1]`–`[10]` markers
- 10 footnotes with term + English explanation
- An `intro` block giving a general explanation of the song

(Section headers `[Canto I]`, `[Canto II]` are illustrated in the [Language objects](#language-objects) example above.)

## Adding a song

1. Create a new YAML file in `public/lyrics/` named `<Artist> - <Title>.yaml` following the schema above.
2. Add `[n]` markers in **every** language block (they all carry the same markers — only `pt` renders them as superscripts).
3. Add matching entries to `footnotes` with `id`, `term`, and `explanation_en`. Optionally add an `intro` block for a general explanation shown above the footnotes.
4. Restart the dev server or run a production build — the integration regenerates `src/generated-lyrics.js` at startup.
5. Visit `http://localhost:4321/lyrics` and confirm the song appears. Open it and check:
   - PT superscripts show on hover with a tooltip.
   - Other columns show marker-free text.
   - The footnotes section appears below the lyrics.

## Technical notes

- `src/generated-lyrics.js` is written automatically by the Astro integration (`src/integrations/lyrics.js`) at dev/build start and is **gitignored** — never edit it by hand.
- `src/lib/lyrics.js` exposes `listLyrics()` and `getLyricsBySlug()` consumed by the pages.
- File names whose slugs collide (e.g. `A - B.yaml` and `A - B.YAML`) are dropped with a console warning — keep filenames slug-unique.
- The landing page (`src/pages/lyrics.astro`) and detail page (`src/pages/lyrics/[slug].astro`) import from `src/lib/lyrics.js`.
