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

export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  plugins: [daisyui],
  theme: {
    extend: {
      fontFamily: {
        menu: ['LouisGeorgeBold'],
        heading: ['LouisGeorge', 'sans-serif'],
        content: ['LouisGeorge', 'serif'],
        tech: ['Work Sans', 'sans-serif'],
      },
    },
  },
  daisyui: {
    themes: ['retro', 'coffee'],
    logs: false,
  },
}
