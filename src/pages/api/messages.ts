export const prerender = false
import type { APIRoute } from 'astro'
import { supabase } from '../../lib/supabaseServer'

// Simple in-memory rate limit (replace with Redis for production)
const rateLimit = new Map<string, number>()

export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
  })
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limiting (5 requests per minute per IP)
  const ip = clientAddress || 'unknown'
  // const now = Date.now()
  const window = 60 * 1000 // 1 minute
  const maxRequests = 5

  if ((rateLimit.get(ip) || 0) >= maxRequests) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Try again later.' }),
      { status: 429 }
    )
  }

  rateLimit.set(ip, (rateLimit.get(ip) || 0) + 1)
  setTimeout(() => rateLimit.delete(ip), window)

  try {
    const contentType = request.headers.get('content-type') || ''
    console.log('Incoming Content-Type:', contentType)

    const rawBody = await request.text()
    console.log('Raw body:', rawBody)

    const { content } = JSON.parse(rawBody)

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Empty message.' }), {
        status: 400,
      })
    }

    const { error } = await supabase.from('messages').insert([{ content }])

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (err) {
    console.error('POST /api/messages failed:')
    console.error(err)
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
    })
  }
}
