# Footnote List Styling + Optional Song Intro

**Date:** 2026-09-17

## Goal

Two small enhancements to the YAML-based lyrics detail page (`/lyrics/[slug]`):

1. Render the footnote list items as a classic numbered list — `n.` markers where `n` matches the superscript numbers — with the term bold and the explanation on its own line, instead of the current `[n] term — explanation`.
2. Support an optional `intro:` YAML field that renders a general explanation of the song above the Footnotes section, styled like the site's existing article content.

## Field: `intro`

- **YAML:** top-level optional string; Markdown allowed.
  ```yaml
  intro: |
    This is a short markdown paragraph explaining the song.
  ```
- **Parser:** `src/lib/lyrics.js` `parseRecord()` gains `intro: typeof doc.intro === 'string' && doc.intro.trim() !== '' ? doc.intro : undefined`. Absent/empty → `undefined`, no section rendered (render guard is `{lyric.intro && (...)}`, which double-beats empties).
- **Rendering:** when present, the detail page renders its own centered article (same classes as the footnotes block: `flex mx-auto items-start justify-center mt-8` wrapper + `<article class="text-base-styles md:w-7/12 w-full">`) filled with `marked.parse(lyric.intro)` via `set:html`, placed **above** the Footnotes article.
- **Security:** same trust model as existing `marked` usage (site-authored YAML); no new escaping surface.

## Footnote list

- **Markup** (`src/pages/lyrics/[slug].astro`): each item becomes
  ```html
  <li id="fn-1"><strong>term</strong><p>explanation</p></li>
  ```
  i.e. drop the `[n]` prefix and the ` — ` separator; term bold, explanation rendered by `marked.parse` (its `<p>` provides the line break, normal weight). Empty term → empty `<strong>`; empty explanation → `marked.parse('')` yields nothing (no `<p>`).
- **Numbering:** the `<ol>` gets `class="footnotes-list"`. A scoped `<style>` rule overrides the shared `.text-base-styles ol` (`list-style-type: circle !important`) with `list-style-type: decimal !important` plus left padding so the `1.` markers align with the text. Numbers therefore come from the `<ol>` itself and match the superscript numbers 1..N.
- **Section condition:** unchanged — only renders when `lyric.footnotes.length > 0`.

## Files

- `src/lib/lyrics.js` — add `intro` to `parseRecord`.
- `src/pages/lyrics/[slug].astro` — footnote `footnotesHtml` markup, `footnotes-list` class, new intro article, scoped CSS for decimal list numbering.
- `src/pages/README-lyrics.md` — document `intro` (field table + a sentence in authoring/notes).
- `public/lyrics/Luiz Gonzaga - Asa Branca.yaml` — add a short demo `intro:` (approved by user) so the feature is visible on the shipped sample.

## Verification

- `pnpm build` passes.
- Detail page footnotes render `1.` `2.` numbering (desktop + mobile), no `[n]` literals, term bold, explanation as paragraph below.
- The demo intro renders above Footnotes in a `text-base-styles` article.
- Landing list and superscripts unchanged.

## Non-goals

- No changes to superscripts, tooltips, `description`, `pdf_url`, or the landing page.
- No bilingual intro (single `intro` string only).