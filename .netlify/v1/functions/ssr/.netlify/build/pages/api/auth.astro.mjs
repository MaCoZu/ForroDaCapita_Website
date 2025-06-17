import { s as supabase } from '../../chunks/supabaseServer_Dor0IffA.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const POST = async () => {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
