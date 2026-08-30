# Lyrics Page Maintenance

## DatoCMS Model: `Song` (collection "Songs")

| DatoCMS field | API field name | Type | Notes |
|---|---|---|---|
| Song Slug | `songSlug` | String | URL slug, required, used in URLs (`/lyrics/{slug}`) |
| Song Title | `songTitle` | String | Display title |
| Song Writer | `songWriter` | String | Credited writer |
| Song Description | `songDescription` | String | One-line description shown on the landing list |
| Lyrics PT | `lyricsPt` | Multi-line text | Brazilian Portuguese lyrics, one line per row |
| Lyrics English | `lyricsEnglish` | Multi-line text | English translation |
| Lyrics German | `lyricsGerman` | Multi-line text | German translation |
| Song Notes | `songNotes` | Long text | Supports markdown, shown below the columns |

## How to find DatoCMS field names

DatoCMS field labels in the admin UI differ from API field names. To find the real names:

1. **Admin UI:** Models > [Model] > Configuration > click a field — the API field name is shown below the label
2. **GraphQL introspection:** Query `__type(name: "ModelRecord") { fields { name } }` at `https://graphql.datocms.com/`
3. **Union types:** Query `__type(name: "UnionTypeName") { possibleTypes { name fields { name } } }` to find block type names

**Important:** DatoCMS auto-camelCases labels. "Song Slug" → `songSlug`.

## Query structure

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

## Lyrics formatting rules

- One lyric line per row — each row is one line of the song
- Use `[Label]` lines (e.g. `[Chorus]`, `[Verso 1]`) for section headers — they stretch across all columns
- Blank lines create verse spacing
- A column is hidden entirely if empty
- The PT column governs section headers (a row is treated as a header when the PT line matches `[Label]`)

## Page structure

- Landing page lists all songs at `/lyrics`
- Detail pages live at `/lyrics/{slug}`
- Desktop shows 3 parallel columns (PT / EN / DE)
- Mobile stacks them PT → EN → DE
- A missing slug 302-redirects to `/lyrics`

## Adding a song

1. In DatoCMS admin, add a new record to the `Song` collection
2. Fill in **Song Slug** (must be unique — becomes the URL)
3. Fill in **Song Title**, **Song Writer**, and **Song Description**
4. Fill in **Lyrics PT**, **Lyrics English**, and **Lyrics German** (one line per row)
5. Optionally fill in **Song Notes** with markdown (paragraphs, images, links)

## Customization

- Detail width: edit `md:w-8/12` on the wrapping `div` in `[slug].astro`
- Landing width: edit `md:w-7/12` on the wrapping `article` in `lyrics.astro`
- Language header / section header color: `--color-secondary` used in `.lyrics-lang` and `.lyrics-header` styles
