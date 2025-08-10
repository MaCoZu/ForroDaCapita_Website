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
  daisyui: {
    themes: ['retro', 'coffee'],
    logs: false,
  },
}