# Gallery Page Design

## DatoCMS Data Model

Single-item model: `gallery`. Uses a dedicated gallery block type for image+text pairing.

| Field | API Name | Type | Purpose |
|---|---|---|---|
| Gallery Header | `galleryHeader` | String | Page title (`<h1>`) |
| Gallery Text | `galleryText` | StructuredText | Intro paragraph (plain text only, no inline blocks) |
| Gallery Image Blocks | `galleryImageBlocks` | Modular Content (union) | Image blocks with title + description |

### Block type: `GalleryimageblockRecord`

Dedicated gallery block (note: lowercase 'i' in type name — DatoCMS naming quirk). Contains:

| Field | API Name | Type | Use in gallery |
|---|---|---|---|
| Title | `galleryImageTitle` | String | Overlay label, lightbox title |
| Description | `galleryImageDescription` | String | Lightbox description text |
| Image | `galleryImage` | File Upload | The gallery image |

The `galleryImage` file field also carries metadata: `url`, `alt`, `title`, `filename`, `width`, `height`.

### TypeScript interface

```ts
interface GalleryImageBlock {
  id: string
  galleryImageTitle: string
  galleryImageDescription?: string
  galleryImage: {
    url: string
    alt?: string
    title?: string
    filename: string
    height: number
    width: number
  }
}

interface GalleryData {
  galleryHeader: string
  galleryText: { value: any }
  galleryImageBlocks: GalleryImageBlock[]
}
```

### GraphQL query

The modular content union requires inline fragments (`__typename` + `... on GalleryimageblockRecord`):

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

Note: `galleryText { value }` queries only the plain text content. If embedded blocks are added to this field later, the query must be extended with `blocks { __typename ... }`.

## Page Layout

Responsive 3-column grid, matching site margins (`w-[90%] md:w-[80%] mx-auto` via Layout).

- **Mobile** (< 640px): 1 column
- **Tablet** (640–1023px): 2 columns
- **Desktop** (≥ 1024px): 3 columns
- Gap: `1.25rem`
- Border radius: `rounded-sm` (matches existing image style)

Page structure:
```
<Layout>
  <h1> galleryHeader </h1>
  <div> StructuredText: galleryText </div>
  <div class="gallery-grid">
    <div class="gallery-tile"
         data-url={block.galleryImage.url}
         data-alt={block.galleryImage.alt}
         data-title={block.galleryImageTitle}
         data-description={block.galleryImageDescription}>  × N
      <Image />
      <div class="gallery-overlay"> title on hover </div>
    </div>
  </div>
  <div id="galleryLightbox"> hidden modal </div>
</Layout>
```

Each `.gallery-tile` carries `data-*` attributes with the image URL, alt text, title, and description for the lightbox JS to read.

## Tile Hover Effect (CSS only)

On each tile, a semi-transparent overlay slides up from the bottom showing the image title.

- Overlay: `position: absolute; bottom: 0; background: rgba(0,0,0,0.35); color: #fcf9ee`
- Animation: `transform: translateY(100%)` → `translateY(0)` on `.gallery-tile:hover`
- Transition: `0.3s ease-in-out`
- Text: `font-family: var(--content-font); font-weight: 600; font-size: 0.95rem`

## Lightbox Modal (Option B: Fade-in Centered)

Follows existing modal patterns (FindUs.astro, SplideSlider.astro).

### Behavior

- **Click/tap a tile** → lightbox opens
- **Close**: click close button, click backdrop, or press Escape
- **Body scroll**: locked via `document.body.style.overflow = 'hidden'` (matches SplideSlider pattern)

### Markup

Single shared lightbox modal, hidden by default:

```html
<div id="galleryLightbox"
     class="hidden fixed inset-0 z-[9999] bg-base-100/60 backdrop-blur-md items-center justify-center">
  <button id="closeLightbox" class="absolute top-1/20 right-1/12 z-[100]">
    <!-- SVG X icon (same as FindUs/SplideSlider) -->
  </button>
  <div id="lightboxContent"
       class="relative max-h-[85vh] max-w-[80vw] flex flex-col items-center">
    <img id="lightboxImage" class="max-h-[85vh] max-w-[80vw] object-contain rounded-sm" />
    <p id="lightboxTitle" class="text-base-styles mt-3"
       style="font-family: var(--content-font)"></p>
    <p id="lightboxDescription" class="text-base-styles mt-1 text-sm opacity-80"
       style="font-family: var(--content-font)"></p>
  </div>
</div>
```

### JavaScript behavior

1. Each `.gallery-tile` gets a click listener
2. On click: read `data-url`, `data-alt`, `data-title`, `data-description` from the tile
3. Populate `#lightboxImage` src/alt, `#lightboxTitle` textContent, and `#lightboxDescription` textContent
4. Remove `hidden` from `#galleryLightbox`, set `document.body.style.overflow = 'hidden'`
5. Close: add `hidden` to `#galleryLightbox`, restore `document.body.style.overflow = ''`
6. Use `addEnhancedModalClose` from `modalUtils.js` for backdrop click + Escape key handling

### Visual spec

- Backdrop: `bg-base-100/60 backdrop-blur-md` (matches FindUs/SplideSlider)
- Image: `max-h-[85vh] max-w-[80vw] object-contain rounded-sm`
- Title: below image, `text-base-styles`, centered, `font-family: var(--content-font)` via inline style
- Description: below title, `text-base-styles text-sm opacity-80`, centered, same font
- Close button: `absolute top-1/20 right-1/12 z-[100]`, same SVG X icon as other modals
- z-index: `z-[9999]` (matches existing modals)

## Label fallback logic

Overlay and lightbox title: `block.galleryImageTitle` → `block.galleryImage.alt` → `block.galleryImage.filename` (cleaned)

The cleaned filename removes the file extension and replaces hyphens/underscores with spaces.

## Files to modify

| File | Change |
|---|---|
| `src/pages/gallery.astro` | Rewrite query for `galleryImageBlocks` + `GalleryimageblockRecord`, update TypeScript interfaces, add `data-*` attrs to tiles, add lightbox markup + JS with title + description |
| `src/pages/README-gallery.md` | Update field reference, query docs, correct type name (`GalleryimageblockRecord`) |
