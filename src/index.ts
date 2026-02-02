const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

function corsHeaders(origin: string | null) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Simple health check
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("ok", {
        status: 200,
        headers: { ...corsHeaders(origin), "cache-control": "no-store" },
      });
    }

    // RPC proxy: POST /rpc
    if (url.pathname !== "/rpc") {
      return new Response("not found", { status: 404, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405, headers: corsHeaders(origin) });
    }

    const body = await request.text();

    const upstream = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders(origin),
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
};
