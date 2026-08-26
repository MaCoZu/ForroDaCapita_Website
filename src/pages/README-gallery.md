# Gallery Page Maintenance

## DatoCMS Model: `gallery` (single-item)

| DatoCMS field | API field name | Type | Notes |
|---|---|---|---|
| Gallery Header | `galleryHeader` | String | Page title |
| Gallery Text | `galleryText` | StructuredText | Intro paragraph |
| Gallery Image Blocks | `galleryImageBlocks` | Modular Content | Image blocks (union type) |

## Block type: `GalleryimageblockRecord`

Note: lowercase 'i' in type name — DatoCMS naming quirk.

| Field | API field name | Type |
|---|---|---|
| Title | `galleryImageTitle` | String |
| Description | `galleryImageDescription` | String | Supports markdown (links, line breaks) |
| Image | `galleryImage` | File Upload |

## How to find DatoCMS field names

DatoCMS field labels in the admin UI differ from API field names. To find the real names:

1. **Admin UI:** Models > [Model] > Configuration > click a field — the API field name is shown below the label
2. **GraphQL introspection:** Query `__type(name: "ModelRecord") { fields { name } }` at `https://graphql.datocms.com/`
3. **Union types:** Query `__type(name: "UnionTypeName") { possibleTypes { name fields { name } } }` to find block type names

**Important:** DatoCMS auto-camelCases labels. "Gallery Image Title" → `galleryImageTitle`. Block type names can have inconsistent casing (e.g., `GalleryimageblockRecord` with lowercase 'i').

## Query structure

```graphql
query GalleryQuery {
  gallery {
    galleryHeader
    galleryText { value }
    galleryImageBlocks {
      __typename
      ... on GalleryimageblockRecord {
        id
        galleryImageTitle
        galleryImageDescription
        galleryImage { url alt title filename width height }
      }
    }
  }
}
```

## Adding images

1. In DatoCMS admin, open the `gallery` record
2. Add a block to the **Gallery Image Blocks** field
3. Fill in **Title** (shown on hover and in lightbox)
4. Fill in **Description** (shown in lightbox below title — supports markdown: `[text](url)` for links, blank lines for paragraphs)
5. Upload an **Image**

## Page structure

- 3-column responsive grid (1 → 2 → 3 columns)
- Hover overlay slides up from bottom with image title
- Click/tap opens lightbox modal with image + title + description
- Close: close button, backdrop click, or Escape key
- Uses `modalUtils.js` for backdrop + Escape handling

## Customization

- Grid columns: edit `.gallery-grid` media queries in the `<style>` block
- Hover effect timing: change `transition: transform 0.3s ease-in-out`
- Overlay appearance: adjust `.gallery-overlay` padding, background, font
- Lightbox sizing: adjust `max-h-[85vh] max-w-[80vw]` on `#lightboxImage`
