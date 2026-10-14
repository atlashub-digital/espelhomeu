// Read-only browser smoke against the PR Preview. Never submits forms or calls APIs.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.PR_HEAD_SHA;
const pr = process.env.PR_NUMBER;
assert.ok(repo && sha && pr, "PR context is required");
async function github(path) {
  const response = await fetch("https://api.github.com/repos/" + repo + path, {
    headers: { Accept: "application/vnd.github+json" },
  });
  assert.ok(response.ok, "GitHub evidence lookup: " + response.status);
  return response.json();
}
let origin;
for (let attempt = 0; attempt < 30; attempt++) {
  const status = await github("/commits/" + sha + "/status");
  const vercel = status.statuses.find(s => s.context === "Vercel");
  if (vercel?.state === "failure" || vercel?.state === "error") throw new Error("Vercel Preview failed for " + sha);
  if (vercel?.state === "success") {
    const comments = await github("/issues/" + pr + "/comments");
    const bot = comments.find(c => c.user.login === "vercel[bot]" && c.body.includes(vercel.target_url));
    const match = bot?.body.match(/\[Preview\]\((https:\/\/[a-z0-9-]+\.vercel\.app)\)/);
    if (match) { origin = match[1]; break; }
  }
  await new Promise(resolve => setTimeout(resolve, 10000));
}
assert.ok(origin, "No matching READY Vercel Preview within five minutes");
const before = await github("/pulls/" + pr);
assert.equal(before.head.sha, sha, "PR moved during verification; rerun on the new head");
const output = "docs/evidence/track-a/online";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const checks = [], errors = [];
let blocked = null;
try {
  devices: for (const [device, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", e => errors.push(e.message));
    for (const [name, route] of [
      ["sales-home", "/"],
      ["sales-collection", "/colecao"],
      ["sales-p01", "/7-dias-para-me-escolher"],
      ["sales-p02", "/eu-sou-bela-do-meu-jeito"],
      ["sales-p03", "/21-dias-meu-melhor-reflexo"],
      ["sales-p04", "/recomecar-depois-dos-40"],
      ["sales-p05", "/diario-de-amor-proprio"],
      ["sales-jornada", "/jornada"],
      ["sales-membership", "/membership"],
      ["library", "/biblioteca"],
      ["21-dias-meu-melhor-reflexo", "/ler/21-dias-meu-melhor-reflexo"],
      ["recomecar-depois-dos-40", "/ler/recomecar-depois-dos-40"],
      ["diario-de-amor-proprio-30-encontros-comigo", "/ler/diario-de-amor-proprio-30-encontros-comigo"],

      ["guide-p02", "/ler/eu-sou-bela-do-meu-jeito"],
      ["guide", "/ler/7-dias-para-me-escolher"],
      ["journey", "/programas/7-dias-para-me-escolher"],
      ["day-1", "/programas/7-dias-para-me-escolher/p01-dia-1"],
    ]) {
      const response = await page.goto(origin + route);
      const location = new URL(page.url());
      const title = await page.title();
      // A protected preview is an unavailable verification environment, never a pass.
      // Do not disable protection or invent bypass credentials.
      if ((location.hostname === "vercel.com" && /login|sso/.test(location.pathname)) ||
          ([401, 403].includes(response.status()) && /Authentication Required|Vercel/i.test(title))) {
        blocked = { status: "BLOCKED_DEPLOYMENT_PROTECTION", route, httpStatus: response.status(), host: location.hostname, path: location.pathname, title };
        await page.screenshot({ path: output + "/deployment-protection.png" });
        console.log("::warning::Online browser verification BLOCKED by Vercel Deployment Protection. This is NOT a passing browser check. Editorial gate approval is recorded separately.");
        await page.close();
        break devices;
      }
      console.log("Preview page: " + location.hostname + location.pathname + " · " + title);
      assert.equal(response.status(), 200, "Preview HTTP " + route);
      await page.locator("main h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route);
      await page.screenshot({ path: output + "/" + device + "-" + name + ".png", fullPage: true });
      checks.push(device + " " + route);
    }
    for (const title of ["Reconhecer", "Respeitar", "Escolher referências", "Criar espaço", "Experimentar", "Continuar"]) {
      await page.getByRole("link", { name: "Próximo encontro" }).click();
      await page.getByRole("heading", { level: 1, name: title, exact: true }).waitFor();
    }
    await page.getByRole("link", { name: "Encontro anterior" }).click();
    await page.getByRole("heading", { level: 1, name: "Experimentar", exact: true }).waitFor();
    checks.push(device + " all seven Journey days and previous/next");
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.equal((await github("/pulls/" + pr)).head.sha, sha, "PR moved; evidence needs a new run");
  await writeFile(output + "/verification.json", JSON.stringify({ sha, origin, status: blocked ? "BLOCKED" : "PASS", blocked, checks, errors, humanReview: "pending" }, null, 2));
  if (!blocked) console.log("PASS online Preview: " + origin + " · " + checks.length + " checks · head " + sha);
} finally { await browser.close(); }
