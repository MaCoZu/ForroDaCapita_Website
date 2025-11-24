# CSS Organization Guide

## Overview

The `main.css` file has been reorganized for **simplicity, maintainability, and clarity**. The most important settings you'll need to edit are now at the top, with technical details hidden below.

## File Structure

```
main.css
├── 🎯 Quick Reference Guide (top comments)
├── 🎨 Theme Customization (EDIT THESE)
│   ├── Font Families (--menu-font, --heading-font, etc.)
│   ├── Typography Sizes (mobile & desktop)
│   ├── Light Theme Colors (retro)
│   └── Dark Theme Colors (coffee)
├── 📖 Typography Utility Classes
│   ├── Body text styles
│   ├── Heading styles
│   ├── Page title styles
│   └── Markdown content styles
├── 🗓️ FullCalendar Variables (rarely edited)
├── 💡 Tippy.js Tooltip Theme (rarely edited)
└── 🔢 Zero-Padded Lists (rarely edited)
```

## What Changed

### ✅ Improvements

1. **Top-to-Bottom Priority**: Most important settings first, technical details last
2. **Clear Sections**: Each section has emoji headers for quick scanning
3. **Removed Redundancy**: Dark mode styles consolidated (no longer repeated)
4. **Grouped Related Styles**: Typography classes together, utilities together
5. **Quick Reference**: Comment block at top tells you exactly where to edit
6. **Consolidated Classes**: `.text-base-styles` and `.markdown-content` share base styles

### 🗑️ Removed Redundancy

**Before**: Dark mode styles were repeated separately for every class
```css
.text-base-styles { ... }
:root[data-theme='coffee'] .text-base-styles { ... }

.markdown-content { ... }
:root[data-theme='coffee'] .markdown-content { ... }

.heading-base-styles { ... }
:root[data-theme='coffee'] .heading-base-styles { ... }
```

**After**: Colors use CSS variables that automatically change with theme
```css
.text-base-styles,
.markdown-content {
  color: var(--color-primary-content) !important;
  /* Color automatically changes based on active theme */
}
```

## How to Make Changes

### Change Fonts

**Location**: Line ~20

```css
:root {
  --menu-font: 'LouisGeorgeBold';           ← Change here
  --heading-font: 'LouisGeorge', sans-serif; ← Change here
  --content-font: 'LouisGeorge', serif;      ← Change here
  --tech-font: 'Work Sans', sans-serif;      ← Change here
}
```

### Change Text Sizes

**Mobile sizes** (Line ~25):
```css
:root {
  --text-content: 1rem;              ← Base size (affects everything)
  --text-heading-1: calc(...);       ← H1 size
  --text-heading-2: calc(...);       ← H2 size
}
```

**Desktop sizes** (Line ~33):
```css
@media (min-width: 768px) {
  :root {
    --text-content: 1.3rem;          ← Larger base for desktop
  }
}
```

### Change Colors

**Light theme** (Line ~44):
```css
@plugin "daisyui/theme" {
  name: 'retro';
  --color-primary: #351c1c;          ← Main brand color
  --color-primary-content: #432323;  ← Text color
  --color-accent: #ed474a;           ← Accent/highlight color
  /* etc. */
}
```

**Dark theme** (Line ~59):
```css
@plugin "daisyui/theme" {
  name: 'coffee';
  --color-primary: #fcf9ee;          ← Light text on dark bg
  /* etc. */
}
```

## Typography Classes Reference

### Main Classes (Use These!)

| Class | Purpose | Example |
|-------|---------|---------|
| `.heading-base-styles` | H1 headings | `<h1 class="heading-base-styles">Title</h1>` |
| `.heading-2-styles` | H2+ headings | `<h2 class="heading-2-styles">Subtitle</h2>` |
| `.page-title` | Large page titles | `<h1 class="page-title">Welcome</h1>` |
| `.markdown-content` | CMS/markdown content | `<div class="markdown-content" set:html={content} />` |
| `.text-base-styles` | Standard body text | `<div class="text-base-styles"><p>Text</p></div>` |
| `.text-base-flex` | Text with icons | `<div class="text-base-flex"><p>Text</p><Icon /></div>` |

### Font Utilities

| Class | Font |
|-------|------|
| `.font-menu` | LouisGeorgeBold (menu/nav) |
| `.font-heading` | LouisGeorge (headings) |
| `.font-content` | LouisGeorge (body text) |
| `.font-tech` | Work Sans (technical text) |

### Size Utilities

| Class | Size | Responsive |
|-------|------|------------|
| `.text-heading-1` | 1.7rem → 1.69rem | Mobile → Desktop |
| `.text-heading-2` | 1.5rem → 1.43rem | Mobile → Desktop |
| `.text-content` | 1rem → 1.3rem | Mobile → Desktop |
| `.text-small` | 0.95rem → 0.975rem | Mobile → Desktop |

## Benefits of New Organization

1. **🎯 Find What You Need Fast**: Quick reference tells you exact line numbers
2. **📝 Edit Once, Change Everywhere**: CSS variables update all instances
3. **🎨 Theme-Aware**: Colors automatically adapt to light/dark mode
4. **🧹 Less Code**: Removed ~100 lines of redundant dark mode overrides
5. **📖 Better Documentation**: Emoji sections and clear comments
6. **🔧 Maintainable**: Related code grouped together logically

## Migration Notes

No changes needed to your components! All existing class names work the same way:

- ✅ `heading-base-styles` - Still works
- ✅ `markdown-content` - Still works
- ✅ `text-base-flex` - Still works
- ✅ Font utilities - Still work
- ✅ Size utilities - Still work

## File Size

- **Before**: ~500 lines with repetitive dark mode overrides
- **After**: ~345 lines, better organized
- **Reduction**: ~31% smaller while maintaining all functionality

## Need Help?

- **Quick edits**: See the comment block at the top of `main.css`
- **Typography usage**: See `TYPOGRAPHY_QUICKREF.md`
- **Full documentation**: See `TYPOGRAPHY.md`
- **Test page**: Visit `/typography-test` to preview all styles