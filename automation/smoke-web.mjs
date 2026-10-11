const origin = process.env.SMOKE_WEB_URL || "http://localhost:3000";
const routes = [
  "/",
  "/privacidade",
  "/status",
  "/prototipo",
  "/inicio",
  "/descobrir",
  "/biblioteca",
  "/ler/um-reflexo-mais-gentil",
  "/programas",
  "/perfil",
  "/meu-espelho",
  "/comunidade",
  "/premium",
];
for (const route of routes) {
  const response = await fetch(new URL(route, origin));
  const html = await response.text();
  if (response.status !== 200 || !html.includes("Espelho"))
    throw new Error(`${route}: ${response.status}`);
  console.log(`PASS ${route}`);
}
const missing = await fetch(new URL("/ler/not-a-publication", origin));
if (missing.status !== 404)
  throw new Error(`Unknown reader must return 404: ${missing.status}`);
console.log("PASS unknown publication -> 404");
