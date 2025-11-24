// tailwind.config.cjs
// module.exports = {
//   content: ['./src/**/*.{astro,html,js,ts}'],
//   plugins: [require('daisyui')],
//   daisyui: {
//     themes: ['retro', 'coffee'],
//     logs: false,
//   },
// }

import daisyui from 'daisyui'
import typography from '@tailwindcss/typography'

export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  plugins: [typography, daisyui],
  theme: {
    extend: {
      fontFamily: {
        menu: ['LouisGeorgeBold'],
        heading: ['LouisGeorge', 'sans-serif'],
        content: ['LouisGeorge', 'serif'],
        tech: ['Work Sans', 'sans-serif'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            fontFamily: 'var(--content-font)',
            fontSize: 'var(--text-content)',
            lineHeight: '2',
            color: 'var(--color-primary-content)',
            p: {
              fontFamily: 'var(--content-font)',
              color: 'var(--color-primary-content)',
            },
            a: {
              color: 'var(--color-primary-content)',
              textDecoration: 'underline',
              textDecorationThickness: '1px',
              '&:hover': {
                color: 'var(--color-accent)',
              },
            },
            'h1, h2, h3, h4, h5, h6': {
              fontFamily: 'var(--heading-font)',
              color: 'var(--color-primary)',
              fontWeight: '600',
              letterSpacing: '0.05em',
            },
            h1: {
              fontSize: 'var(--text-heading-1)',
            },
            h2: {
              fontSize: 'var(--text-heading-2)',
            },
            strong: {
              fontWeight: '600',
              color: 'var(--color-primary-content)',
            },
            em: {
              fontStyle: 'italic',
            },
            'ul, ol': {
              fontFamily: 'var(--content-font)',
            },
            li: {
              fontFamily: 'var(--content-font)',
              color: 'var(--color-primary-content)',
            },
          },
        },
      }),
    },
  },
  daisyui: {
    themes: false, // Disable built-in themes - using custom themes from main.css
    logs: false,
  },
}
