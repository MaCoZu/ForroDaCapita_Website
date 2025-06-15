export function get() {
  return {
    body: JSON.stringify({
      supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL,
      supabaseKey: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    }),
  }
}
