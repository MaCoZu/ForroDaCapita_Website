# Gallery Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the gallery page to use the new `galleryImageBlocks` modular content field and add a lightbox modal with title + description.

**Architecture:** Single-file rewrite of `src/pages/gallery.astro` — update the DatoCMS query, TypeScript interfaces, tile markup with `data-*` attributes, and add a lightbox modal with JS. Update README for documentation.

**Tech Stack:** Astro, Tailwind CSS, DatoCMS (@datocms/astro/StructuredText, @datocms/cda-client), modalUtils.js

---

## Chunk 1: Gallery Page Rewrite

### Task 1: Update TypeScript interfaces and GraphQL query

**Files:**
- Modify: `src/pages/gallery.astro:1-45`

- [ ] **Step 1: Replace the interfaces and query**

Replace the entire frontmatter section (lines 1-45) with:

```astro
---
import { StructuredText } from '@datocms/astro/StructuredText'
import { Image } from 'astro:assets'
import Layout from '../layout/Layout.astro'
import { executeQuery } from '../lib/datocms.js'
import { addEnhancedModalClose, createHiddenClassChecker } from '../scripts/modalUtils.js'

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

const result = await executeQuery(`
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
`)

const gallery = (result as { gallery?: GalleryData }).gallery
---
```

- [ ] **Step 2: Verify the import**

The `addEnhancedModalClose` and `createHiddenClassChecker` imports from `modalUtils.js` are used for the lightbox. Verify the import paths are correct relative to `src/pages/`.

### Task 2: Update tile markup with data-* attributes

**Files:**
- Modify: `src/pages/gallery.astro` (template section)

- [ ] **Step 1: Replace the tile grid**

Replace the existing `<div class="gallery-grid">` block (lines 55-75) with:

```astro
  <div class="gallery-grid">
    {
      gallery?.galleryImageBlocks.map((block) => {
        const label = block.galleryImageTitle || block.galleryImage.alt || block.galleryImage.filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        return (
          <div
            class="gallery-tile group"
            data-url={block.galleryImage.url}
            data-alt={block.galleryImage.alt || label}
            data-title={block.galleryImageTitle}
            data-description={block.galleryImageDescription || ''}
          >
            <Image
              src={block.galleryImage.url}
              height={block.galleryImage.height}
              width={block.galleryImage.width}
              alt={block.galleryImage.alt || label}
              class="gallery-image"
            />
            <div class="gallery-overlay">
              <span class="gallery-label">{label}</span>
            </div>
          </div>
        )
      })
    }
  </div>
```

### Task 3: Add lightbox modal markup

**Files:**
- Modify: `src/pages/gallery.astro` (after the grid, before `</Layout>`)

- [ ] **Step 1: Add the lightbox modal HTML**

Insert after the closing `</div>` of the gallery-grid and before `</Layout>`:

```astro
  <div
    id="galleryLightbox"
    class="hidden fixed inset-0 z-[9999] bg-base-100/60 backdrop-blur-md items-center justify-center"
  >
    <button
      id="closeLightbox"
      class="absolute top-1/20 right-1/12 z-[100] rounded-full p-2 transition-all duration-300 group"
    >
      <svg
        width="40"
        height="40"
        class="w-5 h-5 sm:w-7 sm:h-7 text-primary-content hover:text-accent/90"
        fill="currentColor"
        stroke="currentColor"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M437.5 386.6 306.9 256l130.6-130.6a36 36 0 1 0-50.9-50.9L256 205.1 125.4 74.5a36 36 0 1 0-50.9 50.9L205.1 256 74.5 386.6a36 36 0 1 0 50.9 50.9L256 306.9l130.6 130.6a36 36 0 1 0 50.9-50.9"
        ></path>
      </svg>
    </button>
    <div
      id="lightboxContent"
      class="relative max-h-[85vh] max-w-[80vw] flex flex-col items-center"
    >
      <img
        id="lightboxImage"
        class="max-h-[85vh] max-w-[80vw] object-contain rounded-sm"
      />
      <p
        id="lightboxTitle"
        class="text-base-styles mt-3"
        style="font-family: var(--content-font)"
      ></p>
      <p
        id="lightboxDescription"
        class="text-base-styles mt-1 text-sm opacity-80"
        style="font-family: var(--content-font)"
      ></p>
    </div>
  </div>
```

### Task 4: Add lightbox JavaScript

**Files:**
- Modify: `src/pages/gallery.astro` (add `<script>` block after the template)

- [ ] **Step 1: Add the script block**

Insert after the closing `</Layout>` tag and before the `<style>` block:

```astro
<script>
  import { addEnhancedModalClose, createHiddenClassChecker } from '../scripts/modalUtils.js'

  const lightbox = document.getElementById('galleryLightbox')
  const lightboxContent = document.getElementById('lightboxContent')
  const lightboxImage = document.getElementById('lightboxImage') as HTMLImageElement
  const lightboxTitle = document.getElementById('lightboxTitle')
  const lightboxDescription = document.getElementById('lightboxDescription')
  const closeBtn = document.getElementById('closeLightbox')
  const tiles = document.querySelectorAll('.gallery-tile')

  const isOpen = createHiddenClassChecker(lightbox)

  function openLightbox(url: string, alt: string, title: string, description: string) {
    if (!lightbox || !lightboxImage || !lightboxTitle || !lightboxDescription) return
    lightboxImage.src = url
    lightboxImage.alt = alt
    lightboxTitle.textContent = title
    lightboxDescription.textContent = description
    lightboxDescription.style.display = description ? '' : 'none'
    lightbox.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    if (!lightbox) return
    lightbox.classList.add('hidden')
    document.body.style.overflow = ''
  }

  tiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const url = tile.getAttribute('data-url') || ''
      const alt = tile.getAttribute('data-alt') || ''
      const title = tile.getAttribute('data-title') || ''
      const description = tile.getAttribute('data-description') || ''
      openLightbox(url, alt, title, description)
    })
  })

  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox)
  }

  addEnhancedModalClose(lightbox, lightboxContent, closeLightbox, isOpen)
</script>
```

### Task 5: Keep existing styles

**Files:**
- Modify: `src/pages/gallery.astro` (style section)

- [ ] **Step 1: Verify styles are unchanged**

The existing `<style>` block with `.gallery-grid`, `.gallery-tile`, `.gallery-image`, `.gallery-overlay` CSS should remain as-is. No changes needed to the styles.

### Task 6: Update README

**Files:**
- Modify: `src/pages/README-gallery.md`

- [ ] **Step 1: Rewrite the README**

Replace the entire file with:

```markdown
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
| Description | `galleryImageDescription` | String |
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
```

### Task 7: Verify

- [ ] **Step 1: Run the dev server**

```bash
pnpm dev
```

Navigate to `/gallery` and verify:
- Page loads with header and intro text
- Images display in 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Hover overlay slides up with image title
- Click/tap opens lightbox with centered image, title, and description
- Close button, backdrop click, and Escape key all close the lightbox
- Body scroll is locked when lightbox is open

- [ ] **Step 2: Check browser console for errors**

No DatoCMS query errors, no JS errors, no missing imports.
