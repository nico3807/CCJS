// worker.js — Cloudflare Worker, proxy vers l'API Messages de Claude (Anthropic)
// La clé API est lue depuis le secret Cloudflare CLAUDE_API_KEY (jamais dans le code).

const ALLOWED_ORIGIN = "https://nico3807.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(),
      });
    }

    const body = await request.text();

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const responseBody = await upstream.text();

    return new Response(responseBody, {
      status: upstream.status,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  },
};
