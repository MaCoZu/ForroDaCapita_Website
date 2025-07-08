export function get() {
  return {
    body: JSON.stringify({
      supabaseUrl: import.meta.env.SUPABASE_URL,
      supabaseKey: !!import.meta.env.SUPABASE_ANON_KEY,
    }),
  }
}
