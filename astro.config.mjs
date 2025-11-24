import react from '@astrojs/react'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  env: {
    schema: {
      DATOCMS_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SUMUP_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // Add other environment variables you're usings
      SUPABASE_URL: envField.string({
        context: 'client',
        access: 'public',
      }),
      SUPABASE_ANON_KEY: envField.string({
        context: 'client',
        access: 'public',
      }),
    },
  },
  output: 'server',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
})
