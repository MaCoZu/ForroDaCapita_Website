export const prerender = false
import type { APIRoute } from 'astro'
import { SUMUP_API_KEY } from 'astro:env/server'

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { amount, currency = 'EUR', description = 'Donation to Forró da Capita', return_url } = body

    // Validate amount
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Amount must be greater than 0.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create checkout using SumUp API
    const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_reference: `donation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        amount: parseFloat(amount),
        currency: currency,
        description: description,
        return_url: return_url || 'https://forrodacapita.vercel.app',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('SumUp API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout', details: errorData }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({ 
        checkout_id: data.id,
        checkout_reference: data.checkout_reference,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error creating SumUp checkout:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

