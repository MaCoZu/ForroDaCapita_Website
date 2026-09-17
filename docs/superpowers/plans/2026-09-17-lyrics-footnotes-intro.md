# Lyrics: Footnote List Numbering + Optional Song Intro — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render footnote list items as a numbered list (`1.` **term** + explanation paragraph) and add an optional `intro:` YAML field displayed as article content above the Footnotes section.

**Architecture:** Two changes on the detail page `src/pages/lyrics/[slug].astro` (footnote item markup + a `.footnotes-list` scoped style for decimal numbering; a new optional intro article), one parser addition in `src/lib/lyrics.js`, and documentation/sample updates. The `<ol>` keeps its existing `set:html` injection; numbers come from the list element itself, so no per-number text is emitted.

**Tech Stack:** Astro 5, marked 15, js-yaml, Tailwind/daisyUI (unaffected). No JS test runner in this repo — verification is eslint + `astro build` + live HTTP/DOM assertions per the repo's established convention.

⚠️ Shell gotchas (zsh): always quote `src/pages/lyrics/[slug].astro` in commands; `grep -c` exits 1 on zero matches, breaking `&&` chains (use `;` or `|| true`).

Spec: `docs/superpowers/specs/2026-09-17-lyrics-footnotes-intro-design.md`

---

## Chunk 1: Parser field + docs

### Task 1: Add `intro` to parseRecord and document it

**Files:**
- Modify: `src/lib/lyrics.js:34` (the `description`/`pdfUrl` block)
- Modify: `src/pages/README-lyrics.md` (Fields table ~:25, new "Song intro" section before "## Footnotes", "Adding a song" step, "Example" bullets)

- [ ] **Step 1: Add the parser field**

In `src/lib/lyrics.js`, after the `pdfUrl` line (:35):

```js
    pdfUrl: typeof doc.pdf_url === 'string' ? doc.pdf_url : undefined,
    intro: typeof doc.intro === 'string' && doc.intro.trim() !== '' ? doc.intro : undefined,
```

- [ ] **Step 2: Verify the parser change statically**

Run: `pnpm exec eslint src/lib/lyrics.js`
Expected: no errors/warnings (exit 0).

- [ ] **Step 3: Update README — Fields table**

In `src/pages/README-lyrics.md`, add a row after the `footnotes` row (:25):

```markdown
| `intro` | string | no | Optional Markdown text rendered above the Footnotes section on the detail page; a general explanation of the song |
```

- [ ] **Step 4: Update README — new "Song intro" section**

Insert immediately before the `## Footnotes` heading (:55), after the "Languages with empty or whitespace-only `lines`…" paragraph (:53):

````markdown
## Song intro

`intro` is optional Markdown rendered in the article style **above** the Footnotes section on the detail page — use it for a general explanation of the song. It is not shown on the landing list.

```yaml
intro: |
  **Asa Branca** is a defining song of the *baião* genre…
```
````

- [ ] **Step 5: Update README — "Adding a song" + "Example"**

In the step-3 line of "Adding a song" (:102), extend the parenthesis:

```markdown
3. Add matching entries to `footnotes` with `id`, `term`, and `explanation_en`. Optionally add an `intro` block for a general explanation shown above the footnotes.
```

In "Example" (:92-94), add one bullet after the footnotes bullet:

```markdown
- An `intro` block giving a general explanation of the song
```

- [ ] **Step 6: Verify README table alignment**

Read `src/pages/README-lyrics.md` back; confirm the markdown table rows all have the same separator width (pipes aligned); the exact Markdown fence in the "Song intro" section uses ` ```yaml ` opening and closing fences.

- [ ] **Step 7: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita && git add src/lib/lyrics.js src/pages/README-lyrics.md && git commit -m "feat: add optional intro field to lyrics schema + docs"
```

---

## Chunk 2: Footnote list markup & numbering

### Task 2: Numbered footnote list items

**Files:**
- Modify: `src/pages/lyrics/[slug].astro:51-56` (`footnotesHtml`), `:123` (`<ol … />`), `<style>` block (append a rule)

- [ ] **Step 1: Change the footnote item markup**

Replace the `footnotesHtml` map body (:53-55):

```js
    const n = esc(String(f.id))
    return `<li id="fn-${n}"><strong>${esc(f.term ?? '')}</strong>${marked.parse(f.explanation_en ?? '')}</li>`
```

(Removes the `[${n}] ` prefix and the ` — `; the `<p>` that `marked.parse` emits provides the line break under the bold term.)

- [ ] **Step 2: Add the numbering class to the `<ol>`**

Replace `:123`:

```astro
          <ol class="footnotes-list" set:html={footnotesHtml} />
```

- [ ] **Step 3: Add the scoped CSS override**

Append inside the page `<style>` block (after `.lyrics-verse-gap td` rule, end of the block ~:212):

```css
  .footnotes-list {
    list-style-type: decimal !important;
    padding-left: 1.5rem !important;
  }
```

(The footnote `<ol class="footnotes-list">` sits inside `<article class="text-base-styles …">`, so the shared `.text-base-styles ol` rule at main.css:345-353 (circle bullet + `padding-left: 0rem`, both `!important`) DOES apply to it; the scoped selector compiles to `.footnotes-list[data-astro-cid-…]`, specificity 0-2-0 with `!important`, which beats 0-1-1.)

- [ ] **Step 4: Verify statically**

Run: `pnpm exec eslint "src/pages/lyrics/[slug].astro"`
Expected: no errors/warnings (exit 0).

- [ ] **Step 5: Verify built output no longer contains bracketed numbers**

Run: `pnpm build`
Expected: exit 0, build succeeds.

```bash
cd /home/mz/code/Websites/ForroDaCapita && rm -rf dist && pnpm build
```

- [ ] **Step 6: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita && git add "src/pages/lyrics/[slug].astro" && git commit -m "feat: numbered footnote list with bold term on detail page"
```

---

## Chunk 3: Intro rendering + sample

### Task 3: Render optional intro above Footnotes

**Files:**
- Modify: `src/pages/lyrics/[slug].astro` (insert a block between `:117` `</>...)}` and the footnotes block `:119`)

- [ ] **Step 1: Add the intro article**

Insert immediately before the `{lyric.footnotes.length > 0 && (` block (:119):

```astro
    {lyric.intro && (
      <div class="flex mx-auto items-start justify-center mt-8">
        <article class="text-base-styles md:w-7/12 w-full" set:html={marked.parse(lyric.intro)} />
      </div>
    )}
```

- [ ] **Step 2: Verify statically**

Run: `pnpm exec eslint "src/pages/lyrics/[slug].astro"`
Expected: no errors/warnings (exit 0).

- [ ] **Step 3: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita && git add "src/pages/lyrics/[slug].astro" && git commit -m "feat: render optional song intro above footnotes"
```

### Task 4: Demo `intro` in the Asa Branca sample

**Files:**
- Modify: `public/lyrics/Luiz Gonzaga - Asa Branca.yaml` (after `artist:` line :2)

- [ ] **Step 1: Add the demo intro block**

Insert after `artist: Luiz Gonzaga` (:2):

```yaml
intro: |
  **Asa Branca** ("White-Winged Dove", 1947) is a defining song of *baião* — the genre Luiz
  Gonzaga carried from the sertão to all of Brazil. Written with Humberto Teixeira, it tells of a
  farmer forced to leave his home and his love, Rosinha, by the great drought, promising to return
  when the rain falls again. The footnotes below explain some of the regional words and imagery.
```

- [ ] **Step 2: Verify YAML parses**

Run:

```bash
cd /home/mz/code/Websites/ForroDaCapita && node -e "const yaml=require('js-yaml');const fs=require('fs');const d=yaml.load(fs.readFileSync('public/lyrics/Luiz Gonzaga - Asa Branca.yaml','utf8'));console.log(typeof d.intro, d.intro.split('\n')[0])"
```

Expected output starts: `string **Asa Branca` (parses; top-level `intro` is a string).

- [ ] **Step 3: Restart the dev server so the integration regenerates lyrics**

The sample YAML is read into `src/generated-lyrics.js` at dev/build start, so restart required:

```bash
cd /home/mz/code/Websites/ForroDaCapita && pkill -f "astro dev" ; sleep 1; nohup pnpm dev > /tmp/forro-dev.log 2>&1 & sleep 4; curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/lyrics/luiz-gonzaga-asa-branca
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
cd /home/mz/code/Websites/ForroDaCapita && git add "public/lyrics/Luiz Gonzaga - Asa Branca.yaml" && git commit -m "feat: add demo intro to Asa Branca sample"
```

---

## Chunk 4: Full verification

### Task 5: End-to-end verification

**Files:** none (read-only assertions)

- [ ] **Step 1: HTTP-level assertions on the rendered detail page**

```bash
cd /home/mz/code/Websites/ForroDaCapita && curl -s http://localhost:4321/lyrics/luiz-gonzaga-asa-branca > /tmp/lyrics-detail.html ; \
echo "ol.class=$(grep -o '<ol class=\"footnotes-list\"' /tmp/lyrics-detail.html | wc -l)"; \
echo "fn1=$(grep -o '<li id=\"fn-1\"><strong>fogueira de São João</strong><p>' /tmp/lyrics-detail.html | wc -l)"; \
echo "bracket_lits=$(grep -o '\[1\]' /tmp/lyrics-detail.html | wc -l)"; \
echo "intro_paras=$(grep -o 'White-Winged Dove' /tmp/lyrics-detail.html | wc -l)"; \
grep -n 'Footnotes' /tmp/lyrics-detail.html | head -3
```

Expected: `ol.class=1`, `fn1=1`, `bracket_lits=0` (superscripts render as `<sup …>1</sup>`, never `[1]`), `intro_paras=1` (or more if the intro hyphenates — use `wc -l`), and the `Footnotes` `<h2>` appears on a higher/same line as the intro `<article>` from the preceding block (intro article is above).

- [ ] **Step 2: DOM/computed-style assertions (Playwright)**

The MCP browser tool needs system Chrome (`/opt/google/chrome`, not installed). Use the installed playwright in `/tmp/opencode` with the headless shell. Create `/tmp/opencode/fn-check.mjs`:

```js
import { chromium } from 'playwright'
const exe = '/home/mz/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'
const url = 'http://localhost:4321/lyrics/luiz-gonzaga-asa-branca'
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage()
await p.goto(url)
const r = await p.evaluate(() => {
  const ol = document.querySelector('ol.footnotes-list')
  const intro = [...document.querySelectorAll('article')].find(a => a.textContent.includes('White-Winged Dove'))
  const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent.trim() === 'Footnotes')
  const li1 = ol.querySelector('li#fn-1')
  return {
    olExists: !!ol,
    listStyleType: getComputedStyle(ol).listStyleType,
    marker1: getComputedStyle(li1, '::marker').content,
    termBold: getComputedStyle(li1.querySelector('strong')).fontWeight,
    hasP: !!li1.querySelector('p'),
    pTextStart: li1.querySelector('p').textContent.slice(0, 25),
    introAbove: intro && h2 && intro.compareDocumentPosition(h2) === 4,
  }
})
console.log(JSON.stringify(r, null, 2))
await b.close()
```

Run: `cd /tmp/opencode && node fn-check.mjs`
Expected: `olExists:true`, `listStyleType:"decimal"`, `marker1:"\"1. \""`, `termBold:"600"`, `hasP:true`, `pTextStart` starts with `The bonfire`, `introAbove:true`.

- [ ] **Step 3: Confirm navigation flow unchanged**

Screenshot the landing list and detail page (playwright is only installed in `/tmp/opencode` — run there with the explicit headless-shell path, NOT `npx playwright` from the repo). Append to `/tmp/opencode/fn-check.mjs` before `await b.close()`:

```js
await p.setViewportSize({ width: 1280, height: 900 })
await p.screenshot({ path: '/tmp/fn-detail.png', fullPage: false })
await p.goto('http://localhost:4321/lyrics')
await p.screenshot({ path: '/tmp/fn-landing.png', fullPage: false })
```

and re-run: `cd /tmp/opencode && node fn-check.mjs`

Expected: both PNGs written; visually the detail page shows a numbered footnote list (e.g. `1.` marker), bold term, explanation paragraphs below, and the intro article above `Footnotes`; the landing list is unchanged.

- [ ] **Step 4: Landing page + footnote tooltips regression**

```bash
cd /home/mz/code/Websites/ForroDaCapita && curl -s http://localhost:4321/lyrics > /tmp/lyrics-landing.html ; \
echo "sups=$(grep -o 'sup class=\"footnote-ref\"' /tmp/lyrics-detail.html | wc -l)"; \
echo "landing_asa=$(grep -c 'Asa Branca' /tmp/lyrics-landing.html)"
```

Expected: `sups=20` (10 per language block), `landing_asa` ≥ 1 — superscripts and landing list unchanged.

- [ ] **Step 5: Final build on main**

```bash
cd /home/mz/code/Websites/ForroDaCapita && pnpm build
```

Expected: exit 0.

- [ ] **Step 6: Review the diff**

```bash
cd /home/mz/code/Websites/ForroDaCapita && git log --oneline -7 && git status --short
```

Expected: 4 feature commits on top of `304d8f3`, working tree clean.

---

## Notes

- The `.footnotes-list` numbering relies on the shared rule's `!important` + specificity math verified in the spec (`docs/superpowers/specs/2026-09-17-lyrics-footnotes-intro-design.md`). Do not remove `!important` from the new rule.
- The hover tooltip on superscripts (line 29, `term — explanation`) is intentionally unchanged — the "no —" requirement applies to the footnotes list only.
- Everything runs on branch `main` (working tree at `/home/mz/code/Websites/ForroDaCapita`); the development worktree was deleted after the last merge.