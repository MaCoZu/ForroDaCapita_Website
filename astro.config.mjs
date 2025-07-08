import react from '@astrojs/react'
import vercel from '@astrojs/vercel/serverless'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  env: {
    schema: {
      DATOCMS_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      // Add other environment variables you're using
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
  adapter: vercel({
    webAnalytics: { enabled: true }, // Optional: enable Vercel analytics
  }),
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  integrations: [react()],
})
