# Typography Quick Reference

Quick cheat sheet for using the centralized typography system.

## Most Common Classes

| Class | Use Case | Example |
|-------|----------|---------|
| `markdown-content` | Markdown/HTML content | `<div class="markdown-content" set:html={html} />` |
| `text-base-styles` | Body text | `<div class="text-base-styles"><p>Text</p></div>` |
| `text-base-flex` | Text with icons | `<div class="text-base-flex"><p>Text</p><Icon /></div>` |
| `heading-base-styles` | H1 headings | `<h1 class="heading-base-styles">Title</h1>` |
| `heading-2-styles` | H2+ headings | `<h2 class="heading-2-styles">Subtitle</h2>` |
| `page-title` | Page main titles | `<h1 class="page-title" set:html={title} />` |

## Component Pattern

```astro
---
import { twMerge } from 'tailwind-merge'

interface Props {
  HeadingClasses?: string
  TextClasses?: string
}

const { HeadingClasses, TextClasses }: Props = Astro.props

const baseHeadingClasses = 'heading-base-styles'
const mergedHeadingClasses = twMerge(baseHeadingClasses, HeadingClasses)

const baseTextClasses = 'markdown-content'
const mergedTextClasses = twMerge(baseTextClasses, TextClasses)
---

<h1 class={mergedHeadingClasses}>Title</h1>
<div class={mergedTextClasses} set:html={content} />
```

## Icon/Image Layouts

```astro
<!-- Text alongside icon (horizontal) -->
<div class="text-base-flex">
  <p>Your text here</p>
  <Icon className="ml-2" />
</div>

<!-- Text with icon below (vertical) -->
<div class="text-base-styles">
  <p>Your text here</p>
  <Icon className="mt-2" />
</div>
```

## Custom Overrides

```astro
<!-- Add custom classes while preserving base styles -->
<div class={twMerge('markdown-content', 'max-w-xl mx-auto')}>
  {/* Custom width + centering */}
</div>

<h1 class={twMerge('heading-base-styles', 'text-accent')}>
  {/* Custom color */}
</h1>
```

## Responsive Sizing

Automatically handled by CSS variables:
- Mobile: Smaller sizes
- Desktop (768px+): Larger sizes

No need to add responsive classes manually!

## Dark Mode

Automatically handled by `dark:prose-invert` and color utilities.

No additional classes needed!

## Font Families

| Class | Font | Use |
|-------|------|-----|
| `font-menu` | LouisGeorgeBold | Navigation |
| `font-heading` | LouisGeorge | Headings |
| `font-content` | LouisGeorge | Body text |
| `font-tech` | Work Sans | Technical |

## Text Sizes (CSS Variables)

| Variable | Mobile | Desktop | Class |
|----------|--------|---------|-------|
| `--text-content` | 1rem | 1.3rem | `text-content` |
| `--text-heading-1` | 1.7rem | 1.69rem | `text-heading-1` |
| `--text-heading-2` | 1.5rem | 1.43rem | `text-heading-2` |
| `--text-small` | 0.95rem | 0.975rem | `text-small` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Text too small/large | Edit CSS variables in `main.css` |
| Wrong font | Check font-family classes or CSS variables |
| No dark mode | Ensure using base typography classes |
| Icon misaligned | Use `text-base-flex` instead of `text-base-styles` |
| Need custom color | Add color class after base class with `twMerge` |

## Where to Edit

**Global changes:** `src/styles/main.css` (search for "CENTRALIZED TYPOGRAPHY SYSTEM")

**Component changes:** Override via Props and `twMerge`

## Full Documentation

See `TYPOGRAPHY.md` for complete documentation.