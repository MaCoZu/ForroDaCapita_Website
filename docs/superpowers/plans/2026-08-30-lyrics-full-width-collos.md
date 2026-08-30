# Lyrics Detail Page Full-Width Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the title, writer, and the three trilingual lyric columns span the full `main` container width on the detail page, and center only the notes section at `md:w-7/12`.

**Architecture:** Single Astro detail page (`src/pages/lyrics/[slug].astro`). Remove the `md:w-8/12` width cap from the outer content container so the heading/columns fill the `Layout` `main` width (`w-[90%] md:w-[80%]`). Move the notes block out of that container into its own centered wrapper (`flex justify-center` + `article.text-base-styles.md:w-7/12`), preserving the landing page's content width rhythm. Column typography is already carried by the scoped `<style>` (CSS variables), unaffected by the width change.

**Tech Stack:** Astro 5, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-30-lyrics-collection-design.md` (Refined section: full-width columns, notes at `md:w-7/12`).

**Verification:** No unit-test framework. Verify via `npm run build` and dev-server `curl` on the running dev server (port 4321 for the main worktree; use a worktree dev server port if executing in a worktree).

---

## Chunk 1: Detail page layout

### Task 1: Full-width columns with centered notes

**Files:**
- Modify: `src/pages/lyrics/[slug].astro` (template section, lines ~73-141)

- [ ] **Step 1: Read the current template region**

Read `src/pages/lyrics/[slug].astro` lines 72-141 to confirm the current structure:
- `<div class="flex mx-auto items-start justify-center">` (outer)
  - `<div class="md:w-8/12 w-full">` (content cap)
    - `<h1 class="page-title mb-2 md:mt-15 mt-5">` title
    - writer `<p class="song-writer mb-6">`
    - desktop `<table>` (`.lyrics-desktop hidden md:block`)
    - mobile stacked block (`.lyrics-mobile md:hidden`)
    - notes `<div class="mt-8"><article class="text-base-styles">` + `<div set:html={notesHtml} />`

- [ ] **Step 2: Restructure the template**

Replace the template region (from `<div class="flex mx-auto items-start justify-center">` through the closing of the outer div, i.e. lines 74-141) with:

```astro
  <div class="w-full">
    <h1 class="page-title mb-2 md:mt-15 mt-5">{displayTitle}</h1>
    {song.songWriter && (
      <p class="song-writer mb-6">{song.songWriter}</p>
    )}

    {rows.length > 0 && (
      <>
        <div class="lyrics-desktop hidden md:block">
          <table class="lyrics-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th class="lyrics-lang">{col.lang}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) =>
                row.isHeader ? (
                  <tr class="lyrics-section">
                    <td colspan={columns.length} class="lyrics-header">
                      {row.pt}
                    </td>
                  </tr>
                ) : (
                  <tr class={row.pt.trim() === '' ? 'lyrics-verse-gap' : ''}>
                    {columns.map((col) => (
                      <td class="lyrics-cell">{col.lines[i]}</td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div class="lyrics-mobile md:hidden">
          {columns.map((col) => (
            <div class="mb-6">
              <div class="lyrics-lang">{col.lang}</div>
              <div>
                {rows.map((row, i) =>
                  row.isHeader ? (
                    <p class="lyrics-header">{row.pt}</p>
                  ) : (
                    <p class="lyrics-cell">
                      {row.pt.trim() === '' ? '' : col.lines[i]}
                    </p>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    )}

    {notesHtml && (
      <div class="flex mx-auto items-start justify-center mt-8">
        <article class="text-base-styles md:w-7/12 w-full">
          <div set:html={notesHtml} />
        </article>
      </div>
    )}
  </div>
```

Key changes vs. the current file:
- Outer `<div class="flex mx-auto items-start justify-center">` → `<div class="w-full">` (no width cap, no flex centering on the full-width content).
- Notes block moved OUT of the column layout into its own centered wrapper: `flex mx-auto items-start justify-center mt-8` + `article class="text-base-styles md:w-7/12 w-full"`.
- Everything else (heading, writer, desktop table, mobile stacked block, scoped `<style>`) is unchanged.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Verify with dev server**

The dev server runs on port 4321 in the main worktree (or a worktree-specific port if executing there). Run:
`curl -s http://localhost:4321/lyrics/a-feira-de-caruaru-luiz-gonzaga | grep -o "lyrics-table"`
Expected: match found (desktop table rendered; on the mid-size viewport both desktop `<table>` and mobile block exist in HTML).

Also confirm the notes wrapper emits the centered class (server-rendered HTML contains both desktop and mobile blocks regardless of viewport):
`curl -s http://localhost:4321/lyrics/a-feira-de-caruaru-luiz-gonzaga | grep -o 'md:w-7/12'`
Expected: at least one match (notes wrapper class present in emitted HTML). If the dev server is down, restart it and re-check.

- [ ] **Step 5: Update the maintenance README**

`src/pages/README-lyrics.md` Customization section (lines ~76-80) still documents the old `md:w-8/12` detail width. Replace those two bullets with:

```markdown
- Detail columns: full-width (outer `div` in `[slug].astro` has no width cap)
- Notes width: edit `md:w-7/12` on the notes `article` in `[slug].astro`
- Landing width: edit `md:w-7/12` on the wrapping `article` in `lyrics.astro`
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/lyrics/[slug].astro src/pages/README-lyrics.md
git commit -m "feat: full-width lyric columns with centered notes"
```

## Chunk 2: Final verification (visual)

### Task 2: Verify rendered layout

**Files:**
- Read-only: `src/pages/lyrics/[slug].astro`

- [ ] **Step 1: Confirm structure**

Re-read the committed `src/pages/lyrics/[slug].astro` template region. Confirm:
- Full-width outer `w-full` container wraps title, writer, and both lyric renders.
- Notes `article` sits in its own `flex ... justify-center` wrapper with `md:w-7/12`.
- No `md:w-8/12` remains anywhere in the file.

Run: `grep -n "md:w-8/12\|md:w-7/12\|text-base-styles" src/pages/lyrics/[slug].astro`
Expected: no `md:w-8/12` match; `md:w-7/12` and `text-base-styles` present.

- [ ] **Step 2: Visual QA (if browser available)**

Open http://localhost:4321/lyrics/a-feira-de-caruaru-luiz-gonzaga and verify in the browser:
- Title, writer, and the three PT/EN/DE columns span the full content width.
- Language headers (`Português` / `English` / `Deutsch`) and section headers still styled correctly at full width.
- Notes (with the inline image) centered below at `md:w-7/12`.
- At phone width the columns still stack PT → EN → DE and notes stay readable.

- [ ] **Step 3: Commit (if any visual fix needed)**

If Step 2 reveals a styling issue, fix it in `src/pages/lyrics/[slug].astro` (likely the scoped `<style>`), rebuild, re-verify, and:
```bash
git add src/pages/lyrics/[slug].astro
git commit -m "fix: lyrics layout visual adjustments"
```
Otherwise no commit needed for this task.