// @ts-check
import netlify from '@astrojs/netlify'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  env: {
    schema: {
      DATOCMS_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
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
