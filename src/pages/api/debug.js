export async function GET() {
  return new Response(
    JSON.stringify({
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasDatoCmsKey: !!process.env.DATOCMS_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
