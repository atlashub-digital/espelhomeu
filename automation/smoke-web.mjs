const fetch = (url) => globalThis.fetch(url, { headers: process.env.SMOKE_AUTH_COOKIE ? { Cookie: process.env.SMOKE_AUTH_COOKIE } : {} });
const origin = process.env.SMOKE_WEB_URL || "http://localhost:3000";
const routes = [
  "/",
  "/colecao",
  "/7-dias-para-me-escolher",
  "/eu-sou-bela-do-meu-jeito",
  "/21-dias-meu-melhor-reflexo",
  "/recomecar-depois-dos-40",
  "/diario-de-amor-proprio",
  "/jornada",
  "/membership",
  "/lista-de-espera",
  "/privacidade",
  "/status",
  "/prototipo",
  "/inicio",
  "/descobrir",
  "/biblioteca",
  "/ler/21-dias-meu-melhor-reflexo",
  "/ler/recomecar-depois-dos-40",
  "/ler/diario-de-amor-proprio-30-encontros-comigo",

  "/ler/7-dias-para-me-escolher",
  "/ler/eu-sou-bela-do-meu-jeito",
  "/ler/uma-pausa-que-tambem-e-sua",
  "/programas/7-dias-para-me-escolher",
  ...Array.from({ length: 7 }, (_, i) => "/programas/7-dias-para-me-escolher/p01-dia-" + (i + 1)),
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

for (const route of ["/programas/not-a-program", "/programas/7-dias-para-me-escolher/missing"]) {
  const response = await fetch(new URL(route, origin));
  if (response.status !== 404) throw new Error(route + ": expected 404, got " + response.status);
  console.log("PASS " + route + " -> 404");
}
