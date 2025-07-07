// tailwind.config.cjs
module.exports = {
  content: ['./src/**/*.{astro,html,js,ts}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['retro', 'coffee'],
    logs: false,
  },
}
