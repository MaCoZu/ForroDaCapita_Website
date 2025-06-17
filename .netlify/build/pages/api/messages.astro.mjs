import { s as supabase } from '../../chunks/supabaseServer_Dor0IffA.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async () => {
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
  return new Response(JSON.stringify(data), {
    status: 200
  });
};
const POST = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    console.log("Incoming Content-Type:", contentType);
    const rawBody = await request.text();
    console.log("Raw body:", rawBody);
    const { content } = JSON.parse(rawBody);
    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: "Empty message." }), {
        status: 400
      });
    }
    const { error } = await supabase.from("messages").insert([{ content }]);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200
    });
  } catch (err) {
    console.error("POST /api/messages failed:");
    console.error(err);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
