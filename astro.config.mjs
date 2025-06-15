// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'

export default defineConfig({
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
