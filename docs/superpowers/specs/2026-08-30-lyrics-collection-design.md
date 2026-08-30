# Lyrics Collection — Design

Date: 2026-08-30
Status: Approved for implementation

## Overview

Add a trilingual song-lyrics collection to the Forró da Capita site. Content editors
create song entries in DatoCMS; each entry holds the same lyrics in Portuguese,
English, and German in a three-column parallel layout, plus a free-form markdown
"notes" section below. A landing page (`/lyrics`) lists all songs; each listing links
to an individual song page (`/lyrics/{slug}`).

## Data Model — DatoCMS `Song`

Verified via GraphQL introspection against the live API key.

| Field | DatoCMS label | Type | Notes |
|---|---|---|---|
| `songSlug` | Song Slug | String | Required, unique. Used in `/lyrics/{slug}` URL |
| `songTitle` | Song Title | String | Display title |
| `songWriter` | Song Writer | String | Composer / writer credit |
| `songDescription` | Song Description | String | Short text shown on the landing page |
| `lyricsPt` | Lyrics PT | String | Portuguese lyrics, one line per row |
| `lyricsEnglish` | Lyrics English | String | English lyrics, one line per row |
| `lyricsGerman` | Lyrics German | String | German lyrics, one line per row |
| `songNotes` | Song Notes | String | Markdown (text, images via `![]()`), rendered below the columns |

### Fallbacks

- If `songTitle` is empty, display the title derived from `songSlug`
  (dashes → spaces, lowercase → title case).
- If a language column is empty, that column is skipped in the layout
  (columns are rendered only for non-empty languages).

## Routes

### Landing page — `src/pages/lyrics.astro` (exists, currently empty)

- Static `page-title` heading "Lyrics", centered with `page-title` class as other pages.
- Below: a list of all songs (query `allSongs`):

```graphql
query AllSongsQuery {
  allSongs {
    songSlug
    songTitle
    songWriter
    songDescription
  }
}
```

- Each list item shows:
  - Song title, linked to `/lyrics/{songSlug}`
  - Writer
  - Short description
- Follows the site's page conventions:
  - `Layout` from `src/layout/Layout.astro` (title, header/footer, margins)
  - Content centered, `md:w-7/12`, `Article` / `text-base-styles` typography

### Detail page — `src/pages/lyrics/[slug].astro` (new)

SSR dynamic route (`output: 'server'`, Vercel adapter). No `getStaticPaths`.

Frontmatter:

1. Import `executeQuery` from `src/lib/datocms.js`.
2. `const { slug } = Astro.params`
3. Query a single song:

```graphql
query SongQuery($slug: String!) {
  song(filter: { songSlug: { eq: $slug } }) {
    songTitle
    songWriter
    lyricsPt
    lyricsEnglish
    lyricsGerman
    songNotes
  }
}
```

Call via `executeQuery(query, { variables: { slug } })`.

4. If no song found for the slug, return `Astro.redirect('/lyrics', 302)`
   (fallback to the landing list).

Layout (top to bottom):

1. **Heading**: `page-title` with song title; writer displayed beneath it
   (smaller, muted). Spans full width, left-aligned.
2. **Trilingual columns**: three parallel columns PT · EN · DE, full page width
   (no `md:w-8/12` width cap).
   - Each column has a short language label header.
   - Each row corresponds to one lyric line; corresponding lines across the three
     languages align horizontally.
   - Implementation: split each lyrics string on `\n`. Build rows by index
     (line `i` of PT || empty, line `i` of EN || empty, line `i` of DE || empty).
   - **Blank lines** produce vertical spacing between verse groups.
   - **Section labels**: a line matching `^\[.+\]$` (e.g. `[Chorus]`) renders as a
     bold section header spanning all three columns. The Portuguese column governs
     the row type: if PT line `i` is a section label, the row is a section header
     (assumes editors keep section markers aligned across all three columns).
   - Desktop: 3-column grid. Mobile: columns **stack** vertically in order
     PT → EN → DE (per approved option A).
   - Typography (fonts, sizes, line height) is carried by the scoped `<style>` on
     the columns, not by `text-base-styles`, so it is preserved at full width.
3. **Song notes** below the columns: `songNotes` rendered through `marked.parse()`
   and injected with `set:html`, wrapped in `text-base-styles` typography in its
   own centered container at `md:w-7/12` (same width as the landing list, matching
   the site's content rhythm). Notes are NOT inside the full-width columns
   container.

## Menus

Add a "Lyrics" link in both navigation menus:

- `src/components/Menu.astro` — in the "More" dropdown (alongside FORRÓ, PA58,
  Gallery, Calendar). Uses the existing `text-menu-small` link styling.
- `src/components/MobileHeader.astro` — in the hamburger sidebar list, using the
  existing `text-menu-large` link styling.

## Styling Consistency

- Uses `text-base-styles` typography for the landing list and the notes section
  (centered at `md:w-7/12`), matching the site's content rhythm.
- Title, writer, and the trilingual columns span the full `main` container width
  (`w-[90%] md:w-[80%]` from `Layout`), with the columns' typography defined in the
  detail page scoped `<style>` (`--content-font`, `--text-content`,
  `--line-height-body`).
- Uses existing DatoCMS query helper `executeQuery` — no new caching layer.
- Column styling lives in the detail page `<style>` block with responsive
  media queries (stack on mobile), following the `gallery-grid` pattern.
- Lightbox / block components are NOT used for the notes field; notes are markdown
  only, rendered via `marked` (matching `report.astro`).

## Files Touched

- `src/pages/lyrics.astro` — rewrite (landing list)
- `src/pages/lyrics/[slug].astro` — new (detail page)
- `src/components/Menu.astro` — add Lyrics link
- `src/components/MobileHeader.astro` — add Lyrics link

## Out of Scope

- No DatoCMS schema migrations (fields already created and filled by the user).
- No caching layer for DatoCMS queries (keeps existing pattern).
- No audio/video playback of songs.
- No pagination, search, or sorting beyond DatoCMS default order.

## Verification

- `/lyrics` lists the "A Feira de Caruaru" entry with title, writer, description.
- Clicking the title navigates to `/lyrics/a-feira-de-caruaru-luiz-gonzaga`.
- Detail page shows three aligned columns with [Chorus]-style section headers and
  verse spacing, spanning the full content width on browser viewports.
- Notes section is centered at `md:w-7/12` below the full-width columns.
- On a phone-width viewport the columns stack PT → EN → DE.
- `songNotes` renders markdown text and the inline image.
- Lyrics link present in desktop More dropdown and mobile hamburger menu.