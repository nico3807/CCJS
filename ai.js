/* Appel au modèle et rendu du markdown, partagés par les trois modules
   (Code Coach JS, PHP et Phaser). La clé d'API n'est jamais dans la page :
   les requêtes passent par un Cloudflare Worker qui la détient. */

// URL du Cloudflare Worker (voir cloudflare-worker/)
const API_URL = "https://round-lake-72da.nicolas-maurin1.workers.dev/";

async function callClaude(systemPrompt, userPrompt) {
  const payload = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    temperature: 1,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Impossible de contacter le serveur. Vérifie ta connexion internet.",
    );
  }

  if (!response.ok) {
    if (response.status === 0 || !response.status) {
      throw new Error("Serveur inaccessible. Vérifie ta connexion réseau.");
    }
    if (response.status >= 500) {
      throw new Error(
        "Le serveur proxy est indisponible. Réessaie dans quelques instants.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Trop de requêtes envoyées. Attends quelques secondes avant de réessayer.",
      );
    }
    throw new Error(
      `Erreur serveur (code ${response.status}). Réessaie ou contacte ton professeur.`,
    );
  }

  const result = await response.json();
  return result.content?.[0]?.text;
}

function formatMarkdown(text) {
  if (!text) return "";
  let html = text;
  html = html.replace(/^###\s*(.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^##\s*(.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");
  return html;
}
