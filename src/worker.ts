interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_ORIGIN?: string;
}

function getApiOrigin(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const origin = new URL(value);
    const isLocalHttp = origin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname);
    if (
      (origin.protocol !== "https:" && !isLocalHttp) ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) {
      return null;
    }
    return origin;
  } catch {
    return null;
  }
}

function apiNotConfigured(): Response {
  return new Response(JSON.stringify({ error: "API_ORIGIN is not configured for this Worker." }), {
    status: 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    if (incomingUrl.pathname === "/api" || incomingUrl.pathname.startsWith("/api/")) {
      const apiOrigin = getApiOrigin(env.API_ORIGIN);
      if (!apiOrigin) return apiNotConfigured();

      const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiOrigin);
      return fetch(new Request(upstreamUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};