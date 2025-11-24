# Typography System Documentation

This document explains the centralized typography system for the Forró da Capita website, ensuring consistent text styling across all components while maintaining flexibility for special layouts.

## Overview

All typography styles are managed centrally in `src/styles/main.css` and can be applied via utility classes. This approach ensures:

- **Consistency**: All text elements follow the same design standards
- **Maintainability**: Changes to typography can be made in one place
- **Flexibility**: Components can still customize styles when needed
- **Dark Mode Support**: All text styles include dark mode variants

## Core Typography Classes

### 1. `.text-base-styles`

The foundation for all body text and content areas. Matches the typography standards from `Article.astro`.

**Includes:**
- Tailwind's prose typography plugin with stone color scheme
- LouisGeorge font family (`font-content`)
- Responsive text sizing via CSS variables (`text-content`)
- Loose line height and normal letter spacing
- Dark mode support
- Pretty text wrapping for paragraphs
- Styled links with underlines

**Use when:** Displaying any body text, content paragraphs, or markdown content.

```astro
<div class="text-base-styles">
  <p>Your content here</p>
</div>
```

### 2. `.markdown-content`

Alias for `.text-base-styles`, specifically for content rendered from markdown or CMS.

**Use when:** Displaying content from `set:html` with markdown or rich text.

```astro
<div class="markdown-content" set:html={htmlContent} />
```

### 3. `.text-base-flex`

Extends `.text-base-styles` with flexbox properties for layouts with icons or images.

**Includes:** All base text styles + `flex flex-row items-center`

**Use when:** Text needs to sit alongside icons, images, or other elements in a horizontal layout.

```astro
<div class="text-base-flex">
  <p>Text content</p>
  <Icon className="ml-2" />
</div>
```

### 4. `.heading-base-styles`

Standard styling for main headings (h1 level).

**Includes:**
- Responsive heading size (`text-heading-1`)
- LouisGeorge font family (`font-heading`)
- Primary color
- Wide letter spacing

**Use when:** Creating section headings or main titles.

```astro
<h1 class="heading-base-styles">Section Title</h1>
```

### 5. `.heading-2-styles`

Styling for secondary headings (h2 level and below).

**Includes:** Same as `heading-base-styles` but with `text-heading-2` size.

**Use when:** Creating sub-headings or secondary titles.

```astro
<h2 class="heading-2-styles">Subsection Title</h2>
```

### 6. `.page-title`

Special styling for main page titles.

**Includes:**
- 3xl text size
- LouisGeorge font family
- Semibold weight
- Primary color

**Use when:** Creating the main title at the top of a page.

```astro
<h1 class="page-title md:mt-15 mt-5" set:html={pageTitle} />
```

### 7. `.prose-neutral`

Prose styling that inherits colors from parent elements instead of applying its own.

**Use when:** You need prose typography but want to control colors separately.

```astro
<div class="prose-neutral text-secondary-content">
  <p>This text will use secondary-content color</p>
</div>
```

### 8. `.text-container-constrained`

Applies max-width constraint for optimal reading length.

**Includes:** `max-w-prose` (approximately 65-75 characters per line)

**Use when:** Content should have a comfortable reading width.

```astro
<div class="text-container-constrained">
  <Article>...</Article>
</div>
```

## CSS Variables (Responsive Typography)

Typography sizes are defined as CSS variables in `main.css` and automatically adjust for mobile and desktop:

### Mobile (default)
- `--text-content`: 1rem (base size)
- `--text-heading-1`: 1.7rem
- `--text-heading-2`: 1.5rem
- `--text-small`: 0.95rem

### Desktop (768px+)
- `--text-content`: 1.3rem
- `--text-heading-1`: 1.69rem
- `--text-heading-2`: 1.43rem
- `--text-small`: 0.975rem

## Font Families

Defined in `main.css` and easily changeable via CSS variables:

```css
:root {
  --menu-font: 'LouisGeorgeBold';
  --heading-font: 'LouisGeorge', sans-serif;
  --content-font: 'LouisGeorge', serif;
  --tech-font: 'Work Sans', sans-serif;
}
```

**Utility classes:**
- `.font-menu` - Menu and navigation
- `.font-heading` - Headings
- `.font-content` - Body text and content
- `.font-tech` - Technical text (if needed)

## Component Implementation Examples

### Simple Content Component (News, FindUs)

```astro
const baseHeadingClasses = 'heading-base-styles'
const mergedHeadingClasses = twMerge(baseHeadingClasses, HeadingClasses)

const baseTextClasses = 'markdown-content'
const mergedTextClasses = twMerge(baseTextClasses, TextClasses)
```

```astro
<h1 class={mergedHeadingClasses}>News</h1>
<div class={mergedTextClasses} set:html={newstext} />
```

### Content with Icons (Lost_Found, Report)

```astro
const baseTextClasses = 'text-base-flex'
const mergedTextClasses = twMerge(baseTextClasses, TextClasses)
```

```astro
<div class={mergedTextClasses}>
  <p>Miss something? Have a look in the box.</p>
  <BoxIcon className="ml-2" />
</div>
```

### Page with Article Content (forro.astro, pa58.astro)

```astro
<h1 class="page-title md:mt-15 mt-5" set:html={title} />
<Article className="md:w-7/12">
  <StructuredText data={content} />
</Article>
```

## Customization Guidelines

### When to Override

You can still override styles when needed using `twMerge`:

```astro
const customClasses = twMerge('text-base-styles', 'text-accent !text-2xl')
```

### Preserving Special Layouts

The system is designed to preserve special considerations:

1. **Flexbox layouts** - Use `text-base-flex`
2. **Custom spacing** - Add spacing classes after base classes
3. **Custom colors** - Override with color utilities
4. **Custom widths** - Add width constraints as needed

```astro
<div class="text-base-styles max-w-xl mx-auto">
  <!-- Custom width constraint -->
</div>
```

## Making Global Changes

To change typography site-wide, edit `src/styles/main.css`:

### Change Font Sizes
```css
:root {
  --text-content: 1.1rem; /* Increase base size */
}
```

### Change Font Family
```css
:root {
  --content-font: 'YourFont', serif;
}
```

### Modify Base Text Styles
```css
.text-base-styles {
  @apply prose prose-slate; /* Change color scheme */
  @apply leading-relaxed; /* Adjust line height */
}
```

## Dark Mode

All typography classes include dark mode support via `dark:prose-invert` and color-aware utilities. No additional configuration needed.

## Best Practices

1. **Start with base classes** - Use `text-base-styles` or `markdown-content` as your foundation
2. **Use twMerge** - Always merge custom classes with base classes to avoid conflicts
3. **Preserve flexibility** - Accept className props to allow component customization
4. **Test dark mode** - Verify text readability in both themes
5. **Responsive sizing** - Let CSS variables handle responsive text sizing
6. **Semantic HTML** - Use proper heading hierarchy (h1, h2, h3)

## Migration Checklist

When updating existing components:

- [ ] Replace inline prose classes with `text-base-styles` or `markdown-content`
- [ ] Replace custom heading classes with `heading-base-styles`
- [ ] Update page titles to use `page-title`
- [ ] Add `text-base-flex` for icon/image layouts
- [ ] Test dark mode appearance
- [ ] Verify responsive behavior on mobile and desktop
- [ ] Ensure custom Props still work with twMerge

## Testing Typography

Check typography consistency by:

1. Viewing all pages in light and dark mode
2. Testing on mobile (< 768px) and desktop (>= 768px)
3. Verifying heading hierarchy and sizes
4. Checking link styles and hover states
5. Testing with long and short content
6. Ensuring icons align properly with text

## Support

For questions or issues with the typography system, refer to:
- `src/styles/main.css` - Typography class definitions
- `src/components/Article.astro` - Reference implementation
- This documentation file