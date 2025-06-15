export const prerender = false
import type { APIRoute } from 'astro'
import { supabase } from '../../lib/supabaseServer'
export const POST: APIRoute = async () => {
  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
