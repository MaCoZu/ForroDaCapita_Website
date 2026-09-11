# YAML-Based Lyrics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the DatoCMS-backed lyrics feature with lyrics sourced from YAML files in `public/lyrics/`, adding PT-only footnote superscripts with hover tooltips, a footnotes section below the lyrics, and an optional PDF download button.

**Architecture:** An Astro integration hook reads `public/lyrics/*.yaml` at dev/build start and writes a generated module (`src/generated-lyrics.js`) containing the raw file contents. A helper module `src/lib/lyrics.js` parses those contents with `js-yaml`, derives slugs from filenames, and exposes `listLyrics()` / `getLyricsBySlug()`. The landing and detail pages use the helper instead of DatoCMS.

**Tech Stack:** Astro 5 SSR (Vercel adapter), Vite 6, `js-yaml`, `marked`, tippy.js (existing), pnpm

---

## Background / gotchas (read first)

- **Do NOT use `import.meta.glob` on `public/`** — verified broken on Vite 6.3.6 (returns an empty object; Vite excludes `public/` from glob results). The integration approach below is the substitute.
- Package manager is **pnpm** (`pnpm-lock.yaml` present; `js-yaml@4.1.0` already in the store). Use `pnpm` for install/build/dev commands.
- A dev server currently runs on **port 4321** from `main` WITHOUT the new integration. After wiring the integration you MUST restart it (the hook only fires at dev-server start, not via HMR).
- The current `src/pages/lyrics.astro` and `src/pages/lyrics/[slug].astro` contain the user's uncommitted style tweaks (`.song-heading` weight 700, `.song-writer` CSS commented out on the landing page; `border-top: 0px` on `.lyrics-section` in the detail page). Preserve these styles when rewriting.
- Sample data: `public/lyrics/Luiz Gonzaga - Asa Branca.yaml` — PT + EN languages, markers `[1]`–`[10]` in both blocks, 10 footnotes, no `description`, no `pdf_url`. Derived slug: `luiz-gonzaga-asa-branca`.

---

## Chunk 1: Dependencies and build-time integration

### Task 1: Add dependencies

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install packages**

Run: `pnpm add js-yaml && pnpm add -D @types/js-yaml`
Expected: pnpm reports install completion; `package.json` gains `js-yaml` under `dependencies` and `@types/js-yaml` under `devDependencies`; `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add js-yaml for YAML lyrics parsing"
```

### Task 2: Create the Astro integration

**Files:**
- Create: `src/integrations/lyrics.js`

- [ ] **Step 1: Write the integration**

```js
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function lyrics() {
  return {
    name: 'forro-lyrics',
    hooks: {
      'astro:config:setup'() {
        const root = process.cwd()
        const lyricsDir = join(root, 'public', 'lyrics')
        const outFile = join(root, 'src', 'generated-lyrics.js')

        let sources = {}
        try {
          sources = Object.fromEntries(
            readdirSync(lyricsDir)
              .filter((f) => f.toLowerCase().endsWith('.yaml'))
              .map((f) => [f, readFileSync(join(lyricsDir, f), 'utf8')])
          )
        } catch (err) {
          console.warn(`[forro-lyrics] could not read ${lyricsDir}:`, err.message)
        }

        writeFileSync(outFile, `export const lyricsSources = ${JSON.stringify(sources)}\n`)
      },
    },
  }
}
```

- [ ] **Step 2: Register the integration in `astro.config.mjs`**

Modify the top import block and the `integrations` array:

```js
import { lyrics } from './src/integrations/lyrics.js'
```

```js
  integrations: [react(), lyrics()],
```

- [ ] **Step 3: Gitignore the generated module**

Append to `.gitignore`:

```
src/generated-lyrics.js
```

- [ ] **Step 4: Verify generation**

Run: `node --input-type=module -e "import { lyrics } from './src/integrations/lyrics.js'; const i = lyrics(); i.hooks['astro:config:setup']();"` 2>&1
Expected: no output (no warn); then `cat src/generated-lyrics.js`
Expected: a file containing `export const lyricsSources = {"Luiz Gonzaga - Asa Branca.yaml":"title: Asa Branca...`.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/lyrics.js astro.config.mjs .gitignore
git commit -m "feat: wire lyrics YAML ingestion via Astro build integration"
```

---

## Chunk 2: Helper module

### Task 3: `src/lib/lyrics.js`

**Files:**
- Create: `src/lib/lyrics.js`

- [ ] **Step 1: Write the helper**

```js
import yaml from 'js-yaml'
import { lyricsSources } from '../generated-lyrics.js'

const slugify = (filename) =>
  filename
    .replace(/\.yaml$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')

const isValidRecord = (doc) =>
  doc &&
  typeof doc.title === 'string' &&
  typeof doc.artist === 'string' &&
  Array.isArray(doc.languages)

const parseRecord = (filename, content) => {
  let doc
  try {
    doc = yaml.load(content)
  } catch (err) {
    console.warn(`[lyrics] skipping ${filename}: invalid YAML — ${err.message}`)
    return null
  }
  if (!isValidRecord(doc)) {
    console.warn(`[lyrics] skipping ${filename}: missing title, artist, or languages`)
    return null
  }
  return {
    slug: slugify(filename),
    title: doc.title,
    artist: doc.artist,
    description: typeof doc.description === 'string' ? doc.description : undefined,
    pdfUrl: typeof doc.pdf_url === 'string' ? doc.pdf_url : undefined,
    languages: doc.languages,
    footnotes: Array.isArray(doc.footnotes) ? doc.footnotes : [],
  }
}

export const listLyrics = () => {
  const records = []
  const seen = new Set()
  for (const [filename, content] of Object.entries(lyricsSources)) {
    const record = parseRecord(filename, content)
    if (!record) continue
    if (seen.has(record.slug)) {
      console.warn(`[lyrics] skipping ${filename}: slug "${record.slug}" already used`)
      continue
    }
    seen.add(record.slug)
    records.push(record)
  }
  return records.sort((a, b) => a.title.localeCompare(b.title))
}

export const getLyricsBySlug = (slug) => listLyrics().find((r) => r.slug === slug)
```

- [ ] **Step 2: Verify parsing end-to-end**

Run: `node --input-type=module -e "import { listLyrics, getLyricsBySlug } from './src/lib/lyrics.js'; const l = listLyrics(); console.log('count', l.length); console.log('slug', l[0]?.slug); console.log('title', l[0]?.title); console.log('artist', l[0]?.artist); console.log('langs', l[0]?.languages.map((c) => c.code).join(',')); console.log('footnotes', l[0]?.footnotes.length); console.log('bySlug', getLyricsBySlug('luiz-gonzaga-asa-branca')?.title);"`
Expected output:
```
count 1
slug luiz-gonzaga-asa-branca
title Asa Branca
artist Luiz Gonzaga
langs pt,en
footnotes 10
bySlug Asa Branca
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/lyrics.js
git commit -m "feat: add listLyrics/getLyricsBySlug YAML helper"
```

---

## Chunk 3: Landing page

### Task 4: Rewrite `src/pages/lyrics.astro`

**Files:**
- Modify: `src/pages/lyrics.astro` (full rewrite of the frontmatter and template; preserve the existing `<style>` block)

- [ ] **Step 1: Rewrite the file**

Replace the frontmatter and template with:

Thus the complete new file is:

```astro
---
import Layout from '../layout/Layout.astro'
import { listLyrics } from '../lib/lyrics.js'

const songs = listLyrics()
---

<Layout title="Lyrics">
  <div class="flex mx-auto items-start justify-center">
    <article class="md:w-7/12 w-full">
      <div class="text-base-styles">
        <h1 class="page-title mb-5 md:mt-15 mt-5">Lyrics</h1>

        <ul class="lyrics-list">
          {
            songs.map((song, i) => (
              <li class="lyrics-item">
                <a href={`/lyrics/${song.slug}`} class="song-heading">
                  {song.title}
                  {song.artist && (
                    <>
                      {' '}
                      - <span class="song-writer">{song.artist}</span>
                    </>
                  )}
                </a>
                {song.description && (
                  <p class="song-description">{song.description}</p>
                )}
                {i < songs.length - 1 && <hr class="song-divider" />}
              </li>
            ))
          }
        </ul>
      </div>
    </article>
  </div>
</Layout>

<style>
  .lyrics-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .lyrics-item {
    margin-bottom: 1.25rem;
  }

  .song-heading {
    display: inline-block;
    font-family: var(--heading-font);
    font-size: var(--text-heading-1);
    font-weight: 700;
    color: var(--color-primary-content);
    text-decoration: none;
  }

  .song-heading:hover {
    color: var(--color-secondary);
  }

  /* .song-writer {
    font-family: var(--content-font);
    font-size: var(--text-small);
    font-weight: 900;
    opacity: 0.9;
  } */

  .song-description {
    margin-top: 0.2rem;
  }

  .song-divider {
    border: none;
    border-top: 1px solid var(--color-base-content);
    opacity: 0.15;
    margin: 1.25rem 0;
  }
</style>
```

The `<style>` block above is the current file's block preserved verbatim (the
`.song-heading { font-weight: 700 }` tweak and the commented-out `.song-writer`
rule are intentional and kept).

- [ ] **Step 2: Restart the dev server and verify**

The old dev server (PID 10894) predates the integration. Restart it:

```bash
kill 10894 2>/dev/null; sleep 1; pnpm dev > /tmp/forro-dev.log 2>&1 &
```

Wait for startup, then:

```bash
curl -s http://localhost:4321/lyrics | grep -o '<a href="/lyrics/luiz-gonzaga-asa-branca" class="song-heading"[^>]*>' 
curl -s http://localhost:4321/lyrics | grep -o 'Asa Branca'
curl -s http://localhost:4321/lyrics | grep -o 'Luiz Gonzaga' | head -1
```

Expected: the anchor with `href="/lyrics/luiz-gonzaga-asa-branca"`, the text `Asa Branca`, and `Luiz Gonzaga` all present. Also confirm no `songDescription`/DatoCMS data appears: `curl -s http://localhost:4321/lyrics | grep -c 'a-feira-de-caruaru'` → 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/lyrics.astro
git commit -m "feat: source lyrics landing list from YAML files"
```

---

## Chunk 4: Detail page

### Task 5: Rewrite `src/pages/lyrics/[slug].astro`

**Files:**
- Modify: `src/pages/lyrics/[slug].astro` (full rewrite)

- [ ] **Step 1: Rewrite the file**

```astro
---
import { marked } from 'marked'
import Layout from '../../layout/Layout.astro'
import { getLyricsBySlug } from '../../lib/lyrics.js'

const { slug } = Astro.params

const lyric = getLyricsBySlug(slug ?? '')

if (!lyric) {
  return Astro.redirect('/lyrics', 302)
}

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const footnoteById = new Map(lyric.footnotes.map((f) => [String(f.id), f]))

const strippedLine = (line) => line.replace(/\[\d+\]/g, '')

const footnotedLine = (line) =>
  line.replace(/\[(\d+)\]/g, (marker, n) => {
    const footnote = footnoteById.get(String(n))
    if (!footnote) return ''
    const content = esc(`${footnote.term ?? ''} — ${footnote.explanation_en ?? ''}`)
    return `<sup class="footnote-ref" data-footnote-n="${n}" data-tippy-content="${content}">${n}</sup>`
  })

const cols = lyric.languages.filter((lang) => (lang.lines ?? '').trim() !== '')
const lines = cols.map((lang) => (lang.lines ?? '').split('\n'))
const maxLen = Math.max(0, ...lines.map((l) => l.length))

const ptIdx = cols.findIndex((c) => c.code === 'pt')
const governing = ptIdx >= 0 ? ptIdx : 0

type Row = { htmls: string[]; isHeader: boolean; isBlank: boolean }
const rows: Row[] = []
for (let i = 0; i < maxLen; i++) {
  const raw = lines.map((l) => l[i] ?? '')
  rows.push({
    htmls: raw.map((text, idx) => (idx === governing ? footnotedLine(esc(text)) : esc(strippedLine(text)))),
    isHeader: /^\[.+\]$/.test(raw[governing].trim()),
    isBlank: raw[governing].trim() === '',
  })
}

const footnotesHtml = lyric.footnotes
  .map((f) => {
    const n = esc(String(f.id))
    return `<li id="fn-${n}"><strong>[${n}] ${esc(f.term ?? '')}</strong> — ${marked.parse(f.explanation_en ?? '')}</li>`
  })
  .join('\n')
---

<Layout title={lyric.title}>
  <div class="w-full">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <h1 class="page-title mb-2 md:mt-15 mt-5">{lyric.title}</h1>
      {lyric.pdfUrl && (
        <a class="download-button md:mt-15 mt-5" href={lyric.pdfUrl} target="_blank" rel="noopener">
          Download PDF
        </a>
      )}
    </div>
    {lyric.artist && <p class="song-writer mb-6">{lyric.artist}</p>}

    {rows.length > 0 && (
      <>
        <div class="lyrics-desktop hidden md:block">
          <table class="lyrics-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th class="lyrics-lang">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                row.isHeader ? (
                  <tr class="lyrics-section">
                    <td colspan={cols.length} class="lyrics-header" set:html={row.htmls[governing]} />
                  </tr>
                ) : (
                  <tr class={row.isBlank ? 'lyrics-verse-gap' : ''}>
                    {row.htmls.map((h) => (
                      <td class="lyrics-cell" set:html={h} />
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div class="lyrics-mobile md:hidden">
          {cols.map((c, idx) => (
            <div class="mb-6">
              <div class="lyrics-lang">{c.name}</div>
              <div>
                {rows.map((row, i) =>
                  row.isHeader ? (
                    <p class="lyrics-header" set:html={row.htmls[governing]} />
                  ) : (
                    <p class="lyrics-cell" set:html={row.isBlank ? '' : row.htmls[idx]} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    )}

    {lyric.footnotes.length > 0 && (
      <div class="flex mx-auto items-start justify-center mt-8">
        <article class="text-base-styles md:w-7/12 w-full">
          <h2>Footnotes</h2>
          <ol set:html={footnotesHtml} />
        </article>
      </div>
    )}
  </div>
</Layout>

<style>
  .song-writer {
    font-family: var(--content-font);
    font-size: var(--text-heading-2);
    opacity: 0.7;
  }

  .download-button {
    display: inline-block;
    font-family: var(--heading-font);
    font-size: var(--text-small);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-primary-content);
    border: 1px solid var(--color-primary-content);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    text-decoration: none;
  }

  .download-button:hover {
    background: var(--color-primary-content);
    color: var(--color-base-content);
    opacity: 0.9;
  }

  .footnote-ref {
    font-size: 0.675em;
    vertical-align: super;
    line-height: 0;
    color: var(--color-secondary);
    cursor: help;
    padding: 0 0.15em;
  }

  .lyrics-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-family: var(--content-font);
    font-size: var(--text-content);
    line-height: var(--line-height-body);
  }

  .lyrics-lang {
    font-family: var(--heading-font);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--color-secondary);
    text-align: left;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--color-base-content);
    font-size: var(--text-small);
  }

  .lyrics-table td {
    padding: 0.25rem 0rem;
    vertical-align: top;
  }

  .lyrics-cell {
    white-space: pre-wrap;
  }

  .lyrics-section {
    border-top: 0px solid var(--color-base-content);
  }

  .lyrics-header {
    font-family: var(--heading-font);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-secondary);
    padding-top: 1.5rem;
    padding-bottom: 0.4rem;
  }

  .lyrics-verse-gap td {
    padding-bottom: 2rem;
  }
</style>
```

- [ ] **Step 2: Verify rendering via curl**

```bash
curl -s http://localhost:4321/lyrics/luiz-gonzaga-asa-branca -o /tmp/asa.html
grep -c 'footnote-ref' /tmp/asa.html          # expected: 10 (PT superscripts)
grep -o 'data-tippy-content="fogueira de São João — The bonfire' /tmp/asa.html | head -1
grep -c '?raw' /tmp/asa.html                    # sanity: no raw marker residue
grep -o 'Download PDF' /tmp/asa.html | head -1  # expected: nothing (no pdf_url)
grep -o '<h2>Footnotes' /tmp/asa.html | head -1
grep -o 'Luiz Gonzaga' /tmp/asa.html | head -1   # artist line
```

Expected: 10 `footnote-ref` occurrences total; exactly ONE `<sup class="footnote-ref"` per PT marker; the EN column contains NO `footnote-ref` / `<sup` and NO literal `[n]` markers (e.g. `grep -c '\[[0-9]*\]' ` on the EN table region → 0); `Download PDF` absent; `Footnotes` h2 present; artist present.

Additional structural checks:
```bash
grep -c 'Quá fogueira de São João' /tmp/asa.html            # PT line with superscript
grep -c 'When I saw the land burning' /tmp/asa.html          # EN line present without markers
grep -c '\[[0-9]\+\]' /tmp/asa.html                          # literal markers in output
grep -o 'Exterior\|DatoCMS\|songNotes' /tmp/asa.html | head -1
```
Expected: PT line seen once, EN line (marker-free) seen once, no literal `[n]` markers remain anywhere in the page, no DatoCMS references.

- [ ] **Step 3: Verify a missing slug still redirects**

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:4321/lyrics/does-not-exist
```
Expected: `302 /lyrics`

- [ ] **Step 4: Commit**

```bash
git add 'src/pages/lyrics/[slug].astro'
git commit -m "feat: render YAML lyric columns, PT footnote superscripts, footnotes, PDF button"
```

---

## Chunk 5: Documentation

### Task 6: Rewrite `src/pages/README-lyrics.md`

**Files:**
- Modify: `src/pages/README-lyrics.md`

- [ ] **Step 1: Rewrite the file**

Replace the entire file with documentation for the YAML workflow. It must cover:

- Song files live in `public/lyrics/` as `<Artist> - <Title>.yaml`; slug is derived automatically (e.g. `Luiz Gonzaga - Asa Branca.yaml` → `luiz-gonzaga-asa-branca`).
- YAML field table: `title` (required), `artist` (required), `description` (optional), `pdf_url` (optional — renders the Download PDF button), `languages` (array of `{ code, name, lines }`; each becomes a column, blank/whitespace-only blocks are skipped), `footnotes` (array of `{ id, term, explanation_en }`).
- Authoring rules: `[n]` markers are duplicated across **every** language block; only the `pt` column renders superscripts; other columns strip them; a marker without a matching footnote id is dropped; a footnote without a marker still lists below. Blank lines create verse spacing; `[Label]` lines become section headers in the `pt` column.
- Footnotes render below the lyrics in the `text-base-styles` article; hover tooltips come from the existing tippy infrastructure (`data-tippy-content`).
- "Adding a song": create the YAML file, restart dev / run build (the integration regenerates `src/generated-lyrics.js` at start), verify.
- Remove all DatoCMS sections (the lyrics pages no longer depend on DatoCMS; the `Song` model is unused).

- [ ] **Step 2: Verify**

Run: `grep -c 'DatoCMS' src/pages/README-lyrics.md`
Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add src/pages/README-lyrics.md
git commit -m "docs: document YAML lyrics workflow, add-a-song, footnotes/PDF"
```

---

## Chunk 6: Final verification

### Task 7: Full build + integrated check

- [ ] **Step 1: Full production build**

Run: `pnpm build`
Expected: build succeeds (SSR, Vercel adapter). `src/generated-lyrics.js` is regenerated during config setup.

- [ ] **Step 2: Confirm lyrics content is bundled for serverless**

Run: `grep -l 'Asa Branca' dist/server/_astro/*.mjs | head -1`
Expected: at least one server bundle file contains `Asa Branca` (proves the generated module is inlined into the serverless output).

- [ ] **Step 3: Final curl pass on the dev server**

Re-check `/lyrics` and `/lyrics/luiz-gonzaga-asa-branca` for: landing list, superscripts (10 on PT, 0 on EN), tooltip `data-tippy-content` present, footnotes list, no PDF button, no DatoCMS residue, 302 on unknown slug.

- [ ] **Step 4: Manual visual check**

In a browser at `http://localhost:4321/lyrics/luiz-gonzaga-asa-branca`: two aligned columns (PT/EN), superscripts styled, hover shows themed tooltip, footnotes section below in article style. (Chromium is not installed for automated checks — manual browser verification required.)

- [ ] **Step 5: Commit initial content and finalize**

Commit the sample YAML so it ships with the feature (fresh clones and deployments render Asa Branca):

```bash
git add "public/lyrics/Luiz Gonzaga - Asa Branca.yaml"
git commit -m "feat: add Asa Branca sample lyric sheet (YAML)"
```

Then run: `git status --short` — should show only the committed change set plus the unrelated untracked `.superpowers/` directory. (Note: `docs/superpowers/plans/2026-08-30-lyrics-collection.md` is gitignored, so it will not appear.)

---

## Notes / non-goals

- The old DatoCMS `Song` queries and `songNotes` markdown block are intentionally removed (per spec).
- `src/generated-lyrics.js` is generated and gitignored; never edit it by hand.
- No unit-test framework exists in this repo; verification is via `pnpm build`, `node --input-type=module` checks, and `curl` against the dev server.