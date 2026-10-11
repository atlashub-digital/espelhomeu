import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const webRequire = createRequire(path.join(root, "apps/web/package.json"));
const env = {
  ...process.env,
  HOST: "127.0.0.1",
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000",
};
const web = spawn(
  process.execPath,
  [
    webRequire.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
  ],
  { cwd: path.join(root, "apps/web"), env, stdio: "pipe" },
);
const api = spawn(process.execPath, ["dist/server.js"], {
  cwd: path.join(root, "apps/api"),
  env,
  stdio: "pipe",
});
let serverLog = "";
for (const child of [web, api])
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (b) => {
      serverLog += b.toString();
    });
const origin = "http://127.0.0.1:3000";
const evidence = path.resolve(
  root,
  process.env.VISUAL_OUTPUT || "docs/evidence/track-a",
);
let browser;
async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server failed to start: ${url}\n${serverLog}`);
}
try {
  await Promise.all([waitFor(origin), waitFor("http://127.0.0.1:4000/health")]);
  const health = await (await fetch("http://127.0.0.1:4000/health")).json();
  assert.equal(health.status, "ok");
  assert.equal(health.db, "not_configured");
  await mkdir(evidence, { recursive: true });
  const smoke = spawn(process.execPath, ["automation/smoke-web.mjs"], {
    cwd: root,
    env: { ...env, SMOKE_WEB_URL: origin },
    stdio: "inherit",
  });
  assert.equal(await new Promise((r) => smoke.on("exit", r)), 0);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
    args: process.env.BROWSER_EXECUTABLE_PATH
      ? [
          "--no-sandbox",
          "--single-process",
          "--no-zygote",
          "--in-process-gpu",
          "--use-gl=angle",
          "--use-angle=swiftshader",
        ]
      : [],
  });
  const errors = [],
    checks = [];
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const routes = [
    "/inicio",
    "/biblioteca",
    "/descobrir",
    "/ler/um-reflexo-mais-gentil",
    "/programas",
    "/perfil",
    "/meu-espelho",
    "/comunidade",
    "/premium",
  ];
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of routes) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `Horizontal overflow: ${name} ${route}`,
      );
      await page.screenshot({
        path: path.join(
          evidence,
          `${name}-${route === "/ler/um-reflexo-mais-gentil" ? "reader" : route.slice(1)}.png`,
        ),
        fullPage: true,
      });
      checks.push(`${name} ${route}: render + no overflow + screenshot`);
    }
    await page.goto(origin + "/ler/um-reflexo-mais-gentil");
    await page.getByRole("button", { name: "Concluir e continuar" }).click();
    await page
      .getByRole("heading", { name: "Experimentar com liberdade" })
      .waitFor();
    assert.equal(await page.locator("progress").getAttribute("value"), "33");
    await page.getByRole("button", { name: "Concluir e continuar" }).click();
    await page.getByRole("button", { name: "Concluir leitura" }).click();
    assert.equal(await page.locator("progress").getAttribute("value"), "100");
    assert.ok(
      (await page.getByRole("status").last().innerText()).includes(
        "Leitura concluída",
      ),
    );
    await page.getByRole("button", { name: /Observar sem julgar/ }).click();
    await page.getByRole("button", { name: "Continuar leitura" }).click();
    await page.getByRole("heading", { name: "Observar sem julgar" }).waitFor();
    checks.push(
      `${name} Reader: chapter navigation + progress + completion + resume`,
    );
    await page.goto(origin + "/biblioteca");
    await page.getByLabel("Buscar uma leitura").fill("gentil");
    await page.getByRole("button", { name: "Explorar", exact: true }).click();
    await page.waitForURL("**/biblioteca?q=gentil&tipo=");
    assert.equal(await page.locator(".publication-card").count(), 1);
    checks.push(`${name} catalog search: data-driven filtering`);
    await page.goto(origin + "/status");
    assert.ok(
      (await page.locator("main").innerText()).includes("not_configured"),
    );
    await page.goto(origin + "/");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@example.invalid");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Quero entrar na lista" }).click();
    await page.locator("form [role=alert]").waitFor();
    assert.ok(
      (await page.locator("form [role=alert]").innerText()).includes(
        "Não foi possível guardar",
      ),
    );
    checks.push(
      `${name} waitlist: unchanged form + API 503 without DB + honest UI error`,
    );
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(evidence, "verification.json"),
    JSON.stringify(
      {
        node: process.version,
        browser: await browser.version(),
        gate: "BLOCKED_UPSTREAM",
        health,
        checks,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS browser verification (${checks.length} checks), evidence: ${evidence}`,
  );
} finally {
  if (browser) await browser.close();
  web.kill("SIGTERM");
  api.kill("SIGTERM");
}
