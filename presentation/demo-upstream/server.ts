// Mock upstream pour la demo FGP : zero dependance reseau.
// Simule une API type "apps" protegee par une cle API bidon.
// Lancer : deno run --allow-net --allow-env presentation/demo-upstream/server.ts
// Port par defaut 9000 (override via UPSTREAM_PORT).

const PORT = Number(Deno.env.get("UPSTREAM_PORT") ?? 9000);
const API_KEY = Deno.env.get("UPSTREAM_KEY") ?? "demo-secret-1234";

const APPS = [
  { id: "app-001", name: "my-app", region: "osc-fr1", status: "running" },
  { id: "app-002", name: "billing-api", region: "osc-fr1", status: "running" },
  { id: "app-003", name: "worker-batch", region: "osc-fr1", status: "stopped" },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function authorized(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${API_KEY}`;
}

Deno.serve({ port: PORT }, async (req) => {
  const { pathname } = new URL(req.url);
  const method = req.method;

  if (!authorized(req)) {
    return json({
      error: "unauthorized",
      message: "missing or invalid API key",
    }, 401);
  }

  if (method === "GET" && pathname === "/v1/apps") {
    return json(APPS);
  }

  const appMatch = pathname.match(/^\/v1\/apps\/([^/]+)$/);
  if (method === "GET" && appMatch) {
    const app = APPS.find((a) =>
      a.name === appMatch[1] || a.id === appMatch[1]
    );
    return app ? json(app) : json({ error: "not_found" }, 404);
  }

  if (method === "POST" && pathname === "/v1/apps/my-app/deployments") {
    const body = await req.json().catch(() => ({}));
    const gitRef = body?.deployment?.git_ref ?? "unknown";
    return json({
      id: "dep-" + gitRef,
      app: "my-app",
      git_ref: gitRef,
      status: "queued",
    }, 201);
  }

  if (method === "POST" && pathname === "/v1/apps/my-app/scale") {
    return json({ app: "my-app", status: "scaling" });
  }

  if (method === "DELETE" && appMatch) {
    return json({ id: appMatch[1], deleted: true });
  }

  return json({ error: "not_found", path: pathname, method }, 404);
});

console.log(`mock upstream up on http://localhost:${PORT} (key: ${API_KEY})`);
