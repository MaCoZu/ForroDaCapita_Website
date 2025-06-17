// @ts-check
import netlify from '@astrojs/netlify'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'debug-supabase-import',
        resolveId(source) {
          if (source.includes('supabase')) {
            console.log('Resolving:', source)
          }
        },
      },
    ],
  },

  integrations: [react()],
})
